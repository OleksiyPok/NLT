#!/usr/bin/env bash
# Builds the GitHub Pages site:
#   <site>/      plain web version (identical to the repository)
#   <site>/app/  same files + manifest + service worker (installable PWA)
# Universal: the app id comes from the repository name, the title from index.html.
set -euo pipefail

# Run from the root of the checked-out main branch: bash .pwa/build.sh _site
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$HERE/pwa.env" ] && . "$HERE/pwa.env"

OUT="${1:-_site}"
REPO="${GITHUB_REPOSITORY:-$(basename "$PWD")}"
APP_ID="${REPO##*/}"
APP_ID_UP="$(echo "$APP_ID" | tr '[:lower:]' '[:upper:]')"
APP_NAME="$(sed -n 's:.*<title>\(.*\)</title>.*:\1:p' index.html | head -1)"
APP_NAME="${APP_NAME:-$APP_ID_UP}"
THEME_COLOR="${THEME_COLOR:-#f8fafc}"
VERSION="${GITHUB_SHA:-$(git rev-parse HEAD)}"
VERSION="${VERSION::8}"

# Files that are not part of the app itself
EXCLUDE='^(\.github/|\.vscode/|docs/readme/|README\.md$|LICENSE$)'

copy_tree() {
  git ls-files -z | grep -zvE "$EXCLUDE" | tar --null -T - -cf - | tar -xf - -C "$1"
}

rm -rf "$OUT"
mkdir -p "$OUT/app"
copy_tree "$OUT"
copy_tree "$OUT/app"

APP="$OUT/app"
ICON_SRC="assets/icons/icon_${APP_ID_UP}_512x512.png"
[ -f "$ICON_SRC" ] || { echo "Icon not found: $ICON_SRC" >&2; exit 1; }
mkdir -p "$APP/assets/pwa"
cp "$ICON_SRC" "$APP/assets/pwa/icon-512.png"
if command -v convert >/dev/null 2>&1; then
  convert "$ICON_SRC" -resize 192x192 "$APP/assets/pwa/icon-192.png"
elif command -v magick >/dev/null 2>&1; then
  magick "$ICON_SRC" -resize 192x192 "$APP/assets/pwa/icon-192.png"
else
  cp "$ICON_SRC" "$APP/assets/pwa/icon-192.png"
fi

# Manifest (paths are relative to the manifest -> scope becomes /<repo>/app/)
cat > "$APP/manifest.webmanifest" <<JSON
{
  "name": "$APP_NAME",
  "short_name": "$APP_ID_UP",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "$THEME_COLOR",
  "theme_color": "$THEME_COLOR",
  "icons": [
    { "src": "assets/pwa/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/pwa/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "assets/pwa/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
JSON

# Service worker: pre-caches every file of the app, network first, cache as fallback
FILES="$(cd "$APP" && find . -type f ! -name sw.js | sed 's:^\./::' | sort \
  | sed 's/.*/  "&",/' )"
cat > "$APP/sw.js" <<JS
const CACHE = "${APP_ID_UP}-${VERSION}";
const FILES = [
  "./",
${FILES}
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
JS

# Hook the manifest and the service worker into the /app/ copy of index.html only
INJECT='<link rel="manifest" href="manifest.webmanifest" /><meta name="theme-color" content="'"$THEME_COLOR"'" /><link rel="apple-touch-icon" href="assets/pwa/icon-192.png" /><script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");</script>'
HTML="$(cat "$APP/index.html")"
printf '%s\n' "${HTML/<\/head>/${INJECT}</head>}" > "$APP/index.html"
grep -q 'manifest.webmanifest' "$APP/index.html" || { echo "Injection into index.html failed" >&2; exit 1; }

echo "Built $APP_NAME ($APP_ID) -> $OUT  [version $VERSION]"