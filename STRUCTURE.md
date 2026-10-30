# Структура проекта (стандарт для DT и NLT)

```
index.html
README.md
STRUCTURE.md
config/
  config.json              ЕДИНСТВЕННОЕ место настроек по умолчанию
docs/
  readme/                  README.<lang>.md и img/ (картинки для README)
  help/                    help.<lang>.html и img/
assets/
  icons/                   icon_<APP>_<size>.png
src/
  i18n/                    <lang>.json
  css/
    main.css               список подключения файлов (порядок важен)
    style.css, themes.css, help.css
  js/
    theme-registry.js      обычный скрипт: список тем (global NLTThemeRegistry)
    main.js                весь код (шаг 4: разбивается на core/ и features/)
```

## Правила

- Имена файлов: kebab-case.
- Настройки по умолчанию: только `config/config.json`. В коде значений по умолчанию нет. Блок `mobile` переопределяет значения на телефонах и планшетах.
- Настройки пользователя всегда сохраняются в localStorage, ключ `NLT-settings` (как `DT-settings` у DT).
- Версия приложения: `APP_VERSION` в начале `src/js/main.js` (шаг 4: `core/config.js`); меняется при каждом изменении.
- Иконки: `assets/icons/icon_<APP>_<ширина>x<высота>.png`.
- Нет inline-обработчиков (`onclick`) в HTML.
- Порядок CSS задаёт `src/css/main.css`: позже стоящий файл переопределяет раньше стоящий.
- Приложение нужно открывать по HTTP (модули и `fetch` не работают с `file://`).

## Шаги работы

1. DT: структура папок, пути, ключ localStorage, иконки. (готово)
2. DT: код на модули, тексты в JSON по языкам, CSS на файлы. (готово)
3. NLT: структура папок, пути, настройки по умолчанию. (готово, версия 3.4.1)
4. NLT: код на модули по тому же стандарту.
5. NLT: дизайн по образцу DT.
