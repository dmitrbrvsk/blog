# Product Admin — документация MVP

Архитектура внутренней админки для изменения параметров кредитования бизнеса.

**Фокус MVP:** CRUD кредитного продукта + аудит «кто / что / когда» с `action_id`.  
**Auth:** банковский Keycloak + AD-учётки.  
**Роли:** `viewer` / `editor` / `fs-admin` (админ ФС).

## Содержание

| Документ | Описание |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Контекст, Auth, RBAC, API, NFR, roadmap |
| [TECH_STACK.md](./TECH_STACK.md) | Стек и обоснование |
| [DATA_MODEL.md](./DATA_MODEL.md) | PostgreSQL-схема, транзакции CREATE/UPDATE/DELETE |
| [adr/](./adr/) | Архитектурные решения |

## Быстрый конспект для ревью

1. Один сервис **Product Admin** + PostgreSQL + SPA.
2. AuthN через **банковский Keycloak**, пользователи из **AD**.
3. CRUD продукта: create / update / **soft-delete**; мутация + audit в одной транзакции.
4. Роли: `viewer` (чтение), `editor` (создание/изменение), **`fs-admin`** (удаление + админ ФС).
5. В аудите: `actor_id` (Keycloak `sub`), `actor_login` (AD), `action_id`, `operation`, field-level `changes`.
6. Конфликты — `version` → HTTP 409.
