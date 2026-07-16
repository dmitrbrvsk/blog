# WireMock Admin — HTML-прототипы

Два кликабельных макета для сравнения подходов к админке моков.

## Как открыть

Откройте в браузере:

- [`index.html`](./index.html) — сравнение вариантов
- [`variant-a.html`](./variant-a.html) — IDE / как [plouc/wiremock-ui](https://github.com/plouc/wiremock-ui)
- [`variant-b.html`](./variant-b.html) — Team Admin (профили, сценарии, journal, пресеты)

Локально:

```bash
cd prototypes/wiremock-admin
python3 -m http.server 4173
```

Затем http://localhost:4173

## Что сравниваем

| | A · IDE | B · Team Admin |
|---|---|---|
| Модель | сервер → stubs → visual/JSON | env/profile → stubs/scenarios/presets |
| Фокус | быстрый CRUD mappings | операционные сценарии команды |
| Journal | нет | есть, stub from request |
| Сценарии | нет в UI | stateful scenarios + presets |
