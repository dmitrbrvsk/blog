# WireMock Admin — HTML-прототипы

Выбранный курс: **вариант A (IDE)** — layout как [plouc/wiremock-ui](https://github.com/plouc/wiremock-ui), расширенный под сложный проект.

## Как открыть

```bash
cd prototypes/wiremock-admin
python3 -m http.server 4173
```

- [`index.html`](./index.html) — сравнение
- [`variant-a.html`](./variant-a.html) — **выбранный** IDE-прототип
- [`variant-b.html`](./variant-b.html) — референс Team Admin

## Что есть в A

| Область | Возможности в прототипе |
|---|---|
| Explorer | servers, mappings, scenarios, profile packs |
| Editor | visual / JSON, priority, tags, scenario state, delay |
| CRUD | create, save, duplicate, delete, filter |
| Journal | нижняя панель, unmatched, **stub from request** |
| Scenarios | переключение stateful states (pay / kyc / catalog) |
| Profiles | packs overlay, activate, import/export, share link |
| UX | tabs, modals add-server/import, toasts |

## Почему не чистый B

B остаётся референсом «операционной админки». Нужные идеи (journal, scenarios, packs) встроены в IDE-модель A, без смены парадигмы.
