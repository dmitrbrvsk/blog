# Админка параметров кредитования для бизнеса — архитектура MVP

## 1. Цель

Внутренняя админка для управления параметрами процессов кредитования МСБ/бизнеса.

**MVP:** редактирование параметров **кредитного продукта** (описание, срок, ставка, сумма) с полным аудитом изменений: **кто / что / когда / action_id**.

Документ фиксирует целевую архитектуру, стек и контракты. UI-прототип на этом этапе не требуется.

Связанные материалы:

- [TECH_STACK.md](./TECH_STACK.md) — выбор технологий и обоснование
- [DATA_MODEL.md](./DATA_MODEL.md) — схема БД и индексы
- [adr/](./adr/) — архитектурные решения (ADR)

---

## 2. Scope MVP

| В scope | Вне scope (следующие итерации) |
|---|---|
| Список кредитных продуктов | Параметры скоринга, лимитов, комиссий процессов |
| Редактирование: описание, срок, ставка, min/max сумма | Создание/удаление продуктов, версионирование каталога |
| Журнал изменений по продукту и глобально | Maker-checker / approval workflow |
| Идентификация оператора через корпоративный SSO | Тонкая модель ролей (по полям / по продуктам) |
| Optimistic lock (`version`) | Массовые изменения, импорт/экспорт |
| Append-only audit с `action_id` | Outbox → Kafka / DWH (заложить точку расширения) |

---

## 3. Принципы

1. **Audit-first** — изменение продукта и запись аудита в **одной БД-транзакции**. Нет аудита → нет коммита.
2. **Жёсткая идентичность актора** — в аудите всегда `actor_id` (стабильный `sub` из IdP) + `actor_login`. Отображаемое имя — опционально.
3. **Field-level diff** — храним `before` / `after` только по изменённым полям.
4. **Correlation через `action_id`** — UUID одного пользовательского save; его же отдаём клиенту и кладём в трейсы/логи.
5. **Generic audit** — `entity_type` + `entity_id`, чтобы позже покрыть процессы/скоринг без смены модели.
6. **Source of truth параметров** — Product Admin (или выделенный модуль product-catalog), а не «размазанные» конфиги по сервисам.

---

## 4. Контекстная диаграмма (C4 L1)

```
┌──────────────┐   OIDC/SSO    ┌─────────────────┐
│ Оператор     │──────────────▶│ Admin UI (SPA)  │
│ (кредитный   │               └────────┬────────┘
│  продукт /   │                        │ HTTPS + Bearer JWT
│  риск / IT)  │                        ▼
└──────────────┘               ┌─────────────────┐
                               │ API Gateway     │
                               │ (authn/authz,   │
                               │  rate limit)    │
                               └────────┬────────┘
                                        │
                               ┌────────▼────────┐
                               │ Product Admin   │◀── IdP (JWKS)
                               │ Service         │
                               └────────┬────────┘
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                 credit_products  audit_events    (post-MVP)
                 PostgreSQL       PostgreSQL      outbox/Kafka
```

Потребители параметров продукта (кредитный конвейер, калькулятор, витрина) **читают** актуальный snapshot из Product Admin / реплики / кеша. Запись — только через Admin API.

---

## 5. Компоненты

| Компонент | Ответственность |
|---|---|
| **Admin UI** | Список, форма редактирования, просмотр аудита. Без бизнес-логики аудита — только отображение. |
| **API Gateway / BFF** | Терминация TLS, прокидывание JWT, базовый rate limit, routing. |
| **Product Admin Service** | Валидация, optimistic lock, diff, транзакционная запись продукта + аудита, RBAC. |
| **PostgreSQL** | OLTP для продуктов + append-only audit. |
| **IdP (Keycloak / корпоративный SSO)** | Аутентификация, роли `credit-admin.viewer` / `credit-admin.editor`. |

Границы деплоя MVP: **один сервис + одна БД + SPA**. Не дробить на «audit-service» отдельно — лишняя сложность и риск рассинхрона транзакций.

---

## 6. Доменная модель (кратко)

### CreditProduct

Редактируемые в MVP поля: `description`, `term_months`, `rate_annual_pct`, `amount_min`, `amount_max`.

Служебные: `id`, `code`, `name`, `currency`, `status`, `version`, `updated_at`, `updated_by`.

Инварианты: `amount_min > 0`, `amount_max >= amount_min`, `term_months > 0`, `rate_annual_pct >= 0`, непустое `description`.

### AuditEvent

Immutable событие: `action_id`, `occurred_at`, актор (`actor_id` / login / display name), `entity_type` / `entity_id`, `operation`, `changes[]`, опционально `reason`, `request_id`, `ip`, `user_agent`, `source`.

Подробная схема — в [DATA_MODEL.md](./DATA_MODEL.md).

---

## 7. Ключевой use-case: изменение продукта

```
UI                     Gateway              Product Admin           PostgreSQL
 │                        │                      │                      │
 │  PATCH /products/{id}  │                      │                      │
 │  + JWT + version       │                      │                      │
 │───────────────────────▶│─────────────────────▶│                      │
 │                        │                      │ BEGIN                │
 │                        │                      │ SELECT … FOR UPDATE  │
 │                        │                      │─────────────────────▶│
 │                        │                      │ version mismatch?    │
 │                        │                      │   → 409, ROLLBACK    │
 │                        │                      │ build field diff     │
 │                        │                      │ empty? → no-op 204   │
 │                        │                      │ UPDATE product       │
 │                        │                      │ INSERT audit_event   │
 │                        │                      │   (action_id=UUID)   │
 │                        │                      │ COMMIT               │
 │                        │                      │◀─────────────────────│
 │◀───────────────────────│◀─────────────────────│ 200 + product        │
 │                        │                      │     + action_id      │
```

Гарантии:

- Атомарность product↔audit.
- Идемпотентность на уровне «пустой diff = нет события».
- Конфликт параллельных правок → явный `409`, UI предлагает перечитать.

---

## 8. API (MVP)

### AuthZ

| Роль | Права |
|---|---|
| `credit-admin.viewer` | GET products, GET audit |
| `credit-admin.editor` | всё viewer + PATCH product |

Claims: `sub` → `actor_id`, `preferred_username`/`email` → `actor_login`, `name` → display name.

### Endpoints

```
GET   /api/v1/credit-products
GET   /api/v1/credit-products/{id}
PATCH /api/v1/credit-products/{id}
GET   /api/v1/credit-products/{id}/audit?limit=&cursor=
GET   /api/v1/audit-events?entity_type=&entity_id=&actor_id=&from=&to=&limit=&cursor=
```

### PATCH

Request:

```json
{
  "version": 3,
  "description": "Овердрафт для МСБ до 12 мес.",
  "term_months": 12,
  "rate_annual_pct": 17.9,
  "amount_min": 100000,
  "amount_max": 7000000,
  "reason": "Пересмотр ставки по решению ПК от 2026-07-28"
}
```

Response `200`:

```json
{
  "product": {
    "id": "…",
    "version": 4,
    "updated_at": "2026-07-28T15:04:05Z",
    "updated_by": "a1b2c3…"
  },
  "action_id": "8f3c2a1e-4b5d-6e7f-8091-223344556677"
}
```

Ошибки: `400` валидация, `401/403` auth, `404` нет продукта, `409` version conflict.

OpenAPI-контракт можно вынести отдельным артефактом на этапе реализации.

---

## 9. Аудит: требования к видимости

Каждая запись в UI/API обязана отдавать:

| Поле | Зачем |
|---|---|
| `occurred_at` | когда |
| `actor_id` + `actor_login` | кто (стабильно + человекочитаемо) |
| `action_id` | корреляция с логами/тикетами поддержки |
| `changes[]` | что именно изменилось (before → after) |
| `reason` | бизнес-обоснование (если указано) |

`action_id` должен быть копируемым в один клик в UI.

---

## 10. Безопасность

- Доступ только из корпоративного периметра (VPN / Zero Trust).
- JWT validation по JWKS IdP; короткий TTL access-token.
- Мутации только через API; у прикладной DB-роли нет `UPDATE/DELETE` на `audit_events`.
- Rate limit на PATCH; audit trail для security review.
- Не логировать полный body description в application logs — только `action_id`, `actor_id`, `entity_id`, список имён полей.

---

## 11. Наблюдаемость

- Метрики: `product_patch_total{result=ok|conflict|validation}`, latency PATCH.
- Логи structured JSON с `action_id`, `actor_id`, `request_id`.
- OpenTelemetry: span attribute `action.id`.
- Post-MVP: алерт при изменении `rate_annual_pct` / `amount_max` выше порога.

---

## 12. Нефункциональные требования (MVP)

| NFR | Целевое значение |
|---|---|
| Объём продуктов | единицы–сотни (не требует шардирования) |
| Audit events | рост линейный; индексы по entity/actor/time |
| Latency PATCH p95 | < 300 ms внутри ДЦ |
| RPO/RTO | как у критичных внутренних админок банка (по политике платформы) |
| Availability | достаточно active-passive / managed PG |

---

## 13. Roadmap после MVP

1. Параметры процессов (скоринг, cutoff, комиссии) — те же audit-абстракции.
2. Maker-checker для чувствительных полей.
3. Effective-dating / отложенная публикация версии продукта.
4. Transactional outbox → Kafka → DWH / SIEM.
5. Снапшот diff «версия N vs M».

---

## 14. Зафиксированные решения MVP

| Вопрос | Решение | ADR |
|---|---|---|
| Где аудит? | Та же PostgreSQL, append-only | [0001](./adr/0001-audit-in-same-db.md) |
| Отдельный audit-сервис? | Нет в MVP | [0001](./adr/0001-audit-in-same-db.md) |
| Идентичность | `actor_id` из IdP обязателен | [0002](./adr/0002-actor-identity.md) |
| Конфликты | Optimistic lock `version` | [0003](./adr/0003-optimistic-locking.md) |
| Создание продуктов | Вне MVP | — |
| Комментарий к изменению | Опциональный `reason` | — |
| Стек | См. TECH_STACK.md | [0004](./adr/0004-tech-stack.md) |
