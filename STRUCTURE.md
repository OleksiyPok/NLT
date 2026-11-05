# Структура проекта

```
index.html
README.md
STRUCTURE.md
config/
  config.json              ЕДИНСТВЕННОЕ место настроек по умолчанию
docs/
  readme/                  README.<lang>.md (13 языков) и img/ (картинки для README)
  help/                    help.<lang>.html и img/
assets/
  icons/                   icon_<APP>_<size>.png
src/
  i18n/                    <lang>.json ({ "ui": {...}, "languages": {...} })
  css/
    main.css               список подключения файлов (порядок важен)
    base.css               переменные, базовые элементы
    main-screen.css        заголовок, верхняя строка, блоки и группы настроек главной страницы
    numbers.css            поле с числами, оверлеи упражнения
    settings-window.css    окно настроек: плоские панели, сброс
    scroll-steps.css       ступеньки прокрутки окна настроек, стрелки, бейдж
    developer.css, modals.css, responsive.css, help.css, icons.css
    themes.css             палитры (только данные)
  js/
    theme-boot.js          обычный скрипт: тема до первой отрисовки
    main.js                точка входа: создаёт модули и связывает их
    core/                  основа: config, event-bus, event-types, i18n, state, theme-registry, utils
    features/              возможности: app, ui (+ ui-elements, theme, help, modals (окна), ui-mirrors (копии блоков на главной и в окне настроек), ui-labels, ui-selects, ui-numbers), developer (секретный жест на «Сброс настроек»), scroll-steps (ступеньки, стрелки, бейдж), speaker, voices, wake-lock, playback
```

## Правила

- Имена файлов: kebab-case.
- Настройки по умолчанию: только `config/config.json`. В коде значений по умолчанию нет. Блок `mobile` переопределяет значения на телефонах и планшетах.
- Настройки пользователя всегда сохраняются в localStorage, ключ `NLT-settings`.
- Клавиши: F1 открывает справку; Esc закрывает открытое окно, без окна останавливает упражнение; пробел запускает, ставит на паузу и продолжает упражнение.
- Версия приложения: `APP_VERSION` в `src/js/core/config.js`; меняется при каждом изменении.
- Иконки: `assets/icons/icon_<APP>_<ширина>x<высота>.png`.
- Нет inline-обработчиков (`onclick`) в HTML.
- Все кнопки в HTML имеют `type="button"`.
- Порядок CSS задаёт `src/css/main.css`: позже стоящий файл переопределяет раньше стоящий.
- Приложение нужно открывать по HTTP (модули и `fetch` не работают с `file://`).
- Форматирование: Prettier (`.prettierrc`, `.editorconfig`, `.vscode/settings.json`).
