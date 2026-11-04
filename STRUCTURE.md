# Структура проекта (стандарт для DT, NLT и CLT)

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
  i18n/                    <lang>.json ({ "ui": {...}, "languages": {...} }, как в DT)
  css/
    main.css               список подключения файлов (порядок важен)
    base.css               переменные, базовые элементы (как у CLT; у DT то же плюс поля ввода)
    main-screen.css        заголовок, верхняя строка, блоки и группы настроек главной страницы
    numbers.css            поле с числами, оверлеи упражнения (у CLT: clock.css)
    settings-window.css    окно настроек: плоские панели (как у DT), сброс
    scroll-steps.css       ступеньки прокрутки окна настроек, стрелки, бейдж
    developer.css, modals.css, responsive.css, help.css, icons.css (как у CLT; у DT свои дополнения)
    themes.css             общий для всех трёх проектов
  js/
    theme-boot.js          обычный скрипт: тема до первой отрисовки
    main.js                точка входа: создаёт модули и связывает их
    core/                  основа: config, event-bus, event-types, i18n, state, theme-registry, utils
    features/              возможности: app, ui (+ ui-elements, theme, help, modals (окна), ui-mirrors (копии блоков на главной и в окне настроек), ui-labels, ui-selects, ui-numbers), developer (секретный жест на «Сброс настроек»), scroll-steps (ступеньки, стрелки, бейдж), speaker, voices, wake-lock, playback
```

## Правила

- Имена файлов: kebab-case.
- Настройки по умолчанию: только `config/config.json`. В коде значений по умолчанию нет. Блок `mobile` переопределяет значения на телефонах и планшетах.
- Настройки пользователя всегда сохраняются в localStorage, ключ `NLT-settings` (как `DT-settings` у DT и `CLT-settings` у CLT).
- Версия приложения: `APP_VERSION` в `src/js/core/config.js`; меняется при каждом изменении.
- Иконки: `assets/icons/icon_<APP>_<ширина>x<высота>.png`.
- Нет inline-обработчиков (`onclick`) в HTML.
- Все кнопки в HTML имеют `type="button"`.
- Порядок CSS задаёт `src/css/main.css`: позже стоящий файл переопределяет раньше стоящий.
- Приложение нужно открывать по HTTP (модули и `fetch` не работают с `file://`).
- Форматирование: Prettier (`.prettierrc`, `.editorconfig` и `.vscode/settings.json` одинаковы во всех проектах).

## Шаги работы

1. DT: структура папок, пути, ключ localStorage, иконки. (готово)
2. DT: код на модули, тексты в JSON по языкам, CSS на файлы. (готово)
3. NLT: структура папок, пути, настройки по умолчанию. (готово, версия 3.4.1)
4. NLT: код на модули по тому же стандарту: 4.1 core/, 4.2 speaker, voices, wake-lock, playback, 4.3 ui, app, тема. (готово)
5. NLT: дизайн по образцу DT: 5.1 общие темы, иконки (готово), 5.2 главный экран (готово), 5.3 справка в стиле DT с выбором языка (готово), 5.4 окно настроек: плоские панели, ступеньки прокрутки (готово).
