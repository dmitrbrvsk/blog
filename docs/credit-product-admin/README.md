# Product Admin — документация MVP

Архитектура внутренней админки для изменения параметров кредитования бизнеса.

**Фокус MVP:** редактирование параметров кредитного продукта + аудит «кто / что / когда» с `action_id`.

## Содержание

| Документ | Описание |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Контекст, компоненты, API, NFR, roadmap |
| [TECH_STACK.md](./TECH_STACK.md) | Стек и обоснование |
| [DATA_MODEL.md](./DATA_MODEL.md) | PostgreSQL-схема, транзакция update, индексы |
| [adr/](./adr/) | Архитектурные решения |

## Быстрый конспект для ревью

1. Один сервис **Product Admin** + PostgreSQL + SPA за SSO.
2. `PATCH` продукта и `INSERT` в `audit_events` — **одна транзакция**.
3. В аудите обязательны `actor_id` (IdP `sub`), `actor_login`, `action_id`, field-level `changes`.
4. Конфликты параллельных правок — через `version` → HTTP 409.
5. Стек выравниваем с платформой; default — Spring Boot + React + PostgreSQL + OIDC.
