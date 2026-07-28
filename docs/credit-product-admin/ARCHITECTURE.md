# Админка параметров кредитования для бизнеса — архитектура MVP

## 1. Цель

Внутренняя админка для управления параметрами процессов кредитования МСБ/бизнеса.

**MVP:** управление **кредитным продуктом** (создание, изменение, удаление; поля: описание, срок, ставка, сумма) с полным аудитом: **кто / что / когда / action_id**.

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
| **CRUD продукта:** создать / изменить / удалить | Версионирование каталога с effective-from |
| Поля: описание, срок, ставка, min/max сумма, code, name | Maker-checker / approval workflow |
| Журнал изменений по продукту и глобально | Тонкая модель прав (по полям / по продуктам) |
| AuthN: **банковский Keycloak + AD-учётки** | Массовые изменения, импорт/экспорт |
| Роли: viewer / editor / **fs-admin** (админ ФС) | Outbox → Kafka / DWH (заложить точку расширения) |
| Optimistic lock (`version`) | |
| Append-only audit с `action_id` | |

---

## 3. Принципы

1. **Audit-first** — любое изменение каталога (CREATE / UPDATE / DELETE) и запись аудита в **одной БД-транзакции**. Нет аудита → нет коммита.
2. **Жёсткая идентичность актора** — в аудите всегда `actor_id` (стабильный `sub` из Keycloak) + `actor_login` (AD/UPN). Отображаемое имя — опционально.
3. **Field-level diff** — для UPDATE храним `before` / `after` по изменённым полям; для CREATE — `after` (before=null); для DELETE — `before` (after=null) или полный snapshot.
4. **Correlation через `action_id`** — UUID одного пользовательского действия; отдаём клиенту и кладём в трейсы/логи.
5. **Generic audit** — `entity_type` + `entity_id`, чтобы позже покрыть процессы/скоринг без смены модели.
6. **Source of truth параметров** — Product Admin (или модуль product-catalog), а не «размазанные» конфиги по сервисам.
7. **Удаление = soft-delete** — продукт переводится в `ARCHIVED` (или `deleted_at`), физически не стирается; в аудите `operation=DELETE`.

---

## 4. Контекстная диаграмма (C4 L1)

```
┌──────────────┐  OIDC (Keycloak)  ┌─────────────────┐
│ Оператор     │  AD-учётка        │ Admin UI (SPA)  │
│ (продукт /   │──────────────────▶│                 │
│  риск / ФС)  │                   └────────┬────────┘
└──────────────┘                            │ HTTPS + Bearer JWT
                                   ┌────────▼────────┐
                                   │ API Gateway     │
                                   │ (authn/authz,   │
                                   │  rate limit)    │
                                   └────────┬────────┘
                                            │
         ┌──────────────┐          ┌────────▼────────┐
         │ Банковский   │◀─JWKS───│ Product Admin   │
         │ Keycloak     │         │ Service         │
         │ (federation  │         └────────┬────────┘
         │  → AD)       │                  │
         └──────▲───────┘     ┌────────────┼────────────┐
                │             ▼            ▼            ▼
         ┌──────┴──────┐ credit_products  audit_events  (post-MVP)
         │ Active      │ PostgreSQL       PostgreSQL    outbox/Kafka
         │ Directory   │
         └─────────────┘
```

Потребители параметров (кредитный конвейер, калькулятор, витрина / ФС) **читают** актуальный snapshot. Запись — только через Admin API.

---

## 5. Компоненты

| Компонент | Ответственность |
|---|---|
| **Admin UI** | Список, создание/редактирование/удаление, журнал аудита. Без бизнес-логики аудита. |
| **API Gateway / BFF** | TLS, прокидывание JWT, rate limit, routing. |
| **Product Admin Service** | CRUD, валидация, optimistic lock, diff, транзакционный audit, RBAC. |
| **PostgreSQL** | OLTP продуктов + append-only audit. |
| **Банковский Keycloak** | OIDC IdP; federation с **Active Directory**; выдача JWT и ролей клиента. |
| **Active Directory** | Источник учёток сотрудников (login/UPN, группы → маппинг в роли Keycloak). |

Границы деплоя MVP: **один сервис + одна БД + SPA**. Отдельный audit-service не делаем.

---

## 6. Авторизация: Keycloak + AD

Поток:

1. Пользователь входит в Admin UI через **OIDC Authorization Code + PKCE**.
2. Keycloak аутентифицирует через federation / User Federation к **AD**.
3. Access token содержит `sub`, AD-login (`preferred_username` / UPN), ФИО, **realm/client roles**.
4. Product Admin валидирует JWT по JWKS Keycloak и проверяет роли на endpoint.

Маппинг AD → роли Keycloak (настраивается IAM/Keycloak, не в коде сервиса):

| AD-группа (пример) | Роль в токене |
|---|---|
| `GG-CreditAdmin-Viewers` | `credit-admin.viewer` |
| `GG-CreditAdmin-Editors` | `credit-admin.editor` |
| `GG-CreditAdmin-FS-Admins` | `credit-admin.fs-admin` |

Точные имена групп — по стандарту банка; сервис смотрит только на роли в JWT.

Claims → аудит:

| Claim | Поле аудита |
|---|---|
| `sub` | `actor_id` |
| `preferred_username` / UPN | `actor_login` |
| `name` | `actor_display_name` |

Подробнее: [ADR 0002](./adr/0002-actor-identity.md), [ADR 0005](./adr/0005-rbac-fs-admin.md).

---

## 7. Ролевая модель

| Роль | Назначение | Права |
|---|---|---|
| `credit-admin.viewer` | Просмотр каталога и журнала | `GET` products, `GET` audit |
| `credit-admin.editor` | Операционная работа с продуктами | всё viewer + `POST` create + `PATCH` update |
| `credit-admin.fs-admin` | **Админ ФС** — расширенные права для фронтальной системы / сопровождения ФС | всё editor + `DELETE` product + доступ к админским операциям ФС (feature flags / служебные действия по мере появления) |

Правила:

- Роли **кумулятивны** по смыслу прав (fs-admin ⊃ editor ⊃ viewer), но в токене могут быть выданы явно; проверка на API — по требуемому permission.
- Удаление продукта — **только** `credit-admin.fs-admin`.
- Создание и изменение — `editor` или `fs-admin`.
- Наследование групп AD настраивается в Keycloak (составные роли / composite roles — по политике IAM).

---

## 8. Доменная модель (кратко)

### CreditProduct

Поля продукта: `code`, `name`, `description`, `term_months`, `rate_annual_pct`, `amount_min`, `amount_max`, `currency`, `status`.

Служебные: `id`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`, опционально `deleted_at` / `deleted_by`.

Инварианты: `amount_min > 0`, `amount_max >= amount_min`, `term_months > 0`, `rate_annual_pct >= 0`, непустое `description`, уникальный `code`.

Операции:

| Операция | Поведение | Audit `operation` |
|---|---|---|
| **Create** | INSERT, `status=ACTIVE` (или `DRAFT` по политике) | `CREATE` |
| **Update** | UPDATE полей + `version++` | `UPDATE` |
| **Delete** | Soft-delete → `status=ARCHIVED`, `deleted_at=now()` | `DELETE` |

### AuditEvent

Immutable: `action_id`, `occurred_at`, актор, `entity_type` / `entity_id`, `operation`, `changes[]`, опционально `reason`, `request_id`, `ip`, `user_agent`, `source`.

Подробная схема — в [DATA_MODEL.md](./DATA_MODEL.md).

---

## 9. Use-case: мутации продукта

Общий каркас для CREATE / UPDATE / DELETE:

```
UI                     Gateway              Product Admin           PostgreSQL
 │                        │                      │                      │
 │  POST|PATCH|DELETE     │                      │                      │
 │  + JWT (+ version)     │                      │                      │
 │───────────────────────▶│─────────────────────▶│                      │
 │                        │                      │ BEGIN                │
 │                        │                      │ authz by role        │
 │                        │                      │ apply mutation       │
 │                        │                      │ INSERT audit_event   │
 │                        │                      │   (action_id=UUID)   │
 │                        │                      │ COMMIT               │
 │◀───────────────────────│◀─────────────────────│ 2xx + action_id      │
```

UPDATE дополнительно: `SELECT … FOR UPDATE` + проверка `version` → иначе `409`.

DELETE: только `fs-admin`; повторный delete уже архивного → `404` или `409` (идемпотентная политика фиксируется в OpenAPI; рекомендация — `404`/`410`).

---

## 10. API (MVP)

### Endpoints

```
GET    /api/v1/credit-products
GET    /api/v1/credit-products/{id}
POST   /api/v1/credit-products
PATCH  /api/v1/credit-products/{id}
DELETE /api/v1/credit-products/{id}
GET    /api/v1/credit-products/{id}/audit?limit=&cursor=
GET    /api/v1/audit-events?entity_type=&entity_id=&actor_id=&from=&to=&limit=&cursor=
```

### AuthZ на endpoint

| Метод | Минимальная роль |
|---|---|
| GET | `viewer` |
| POST, PATCH | `editor` |
| DELETE | `fs-admin` |

### POST (create)

```json
{
  "code": "SMB_OVERDRAFT_12M",
  "name": "Овердрафт 12 мес.",
  "description": "Овердрафт для МСБ до 12 мес.",
  "term_months": 12,
  "rate_annual_pct": 17.9,
  "amount_min": 100000,
  "amount_max": 7000000,
  "currency": "RUB",
  "reason": "Запуск продукта по решению ПК"
}
```

### PATCH (update)

```json
{
  "version": 3,
  "description": "…",
  "term_months": 12,
  "rate_annual_pct": 17.9,
  "amount_min": 100000,
  "amount_max": 7000000,
  "reason": "Пересмотр ставки"
}
```

### DELETE

```json
{
  "version": 4,
  "reason": "Продукт выведен из продажи"
}
```

Тело DELETE опционально (если gateway/клиент неудобно шлёт body — `version` и `reason` query/header нежелательны; предпочтительно JSON body или `If-Match: version`).

### Ответ мутаций

```json
{
  "product": { "id": "…", "version": 5, "status": "ARCHIVED", "…": "…" },
  "action_id": "8f3c2a1e-4b5d-6e7f-8091-223344556677"
}
```

Ошибки: `400` валидация, `401/403` auth, `404` нет продукта, `409` version conflict / duplicate `code`.

---

## 11. Аудит: требования к видимости

| Поле | Зачем |
|---|---|
| `occurred_at` | когда |
| `actor_id` + `actor_login` | кто (Keycloak `sub` + AD login) |
| `action_id` | корреляция с логами/тикетами |
| `operation` | CREATE / UPDATE / DELETE |
| `changes[]` | что изменилось |
| `reason` | бизнес-обоснование (если указано) |

`action_id` копируется в один клик в UI.

---

## 12. Безопасность

- Доступ из корпоративного периметра (VPN / Zero Trust).
- JWT только от банковского Keycloak; короткий TTL; JWKS rotation.
- Учётки только AD (human); сервисные учётки для интеграций — отдельно, с узким scope (post-MVP при необходимости).
- Мутации только через API; у DB-роли нет `UPDATE/DELETE` на `audit_events`.
- Rate limit на POST/PATCH/DELETE.
- В application logs — `action_id`, `actor_id`, `entity_id`, имена полей; не полный description.

---

## 13. Наблюдаемость

- Метрики: `product_mutation_total{op=create|update|delete,result=…}`, latency.
- Structured logs: `action_id`, `actor_id`, `request_id`.
- OTel attribute: `action.id`.
- Post-MVP: алерт на резкое изменение ставки / лимита и на DELETE.

---

## 14. Нефункциональные требования (MVP)

| NFR | Целевое значение |
|---|---|
| Объём продуктов | единицы–сотни |
| Audit events | линейный рост; индексы entity/actor/time |
| Latency мутаций p95 | < 300 ms внутри ДЦ |
| RPO/RTO | по политике платформы внутренних админок |
| Availability | active-passive / managed PG |

---

## 15. Roadmap после MVP

1. Параметры процессов (скоринг, cutoff, комиссии) — те же audit-абстракции.
2. Maker-checker для чувствительных полей и DELETE.
3. Effective-dating / отложенная публикация.
4. Outbox → Kafka → DWH / SIEM / инвалидация кеша ФС.
5. Снапшот diff «версия N vs M».

---

## 16. Зафиксированные решения MVP

| Вопрос | Решение | ADR |
|---|---|---|
| Где аудит? | Та же PostgreSQL, append-only | [0001](./adr/0001-audit-in-same-db.md) |
| AuthN | Банковский Keycloak, federation → AD | [0002](./adr/0002-actor-identity.md) |
| Идентичность | `actor_id` = Keycloak `sub` | [0002](./adr/0002-actor-identity.md) |
| Конфликты | Optimistic lock `version` | [0003](./adr/0003-optimistic-locking.md) |
| Стек | См. TECH_STACK.md | [0004](./adr/0004-tech-stack.md) |
| Роли | viewer / editor / **fs-admin** | [0005](./adr/0005-rbac-fs-admin.md) |
| Удаление | Soft-delete + audit DELETE; только fs-admin | [0005](./adr/0005-rbac-fs-admin.md) |
| CRUD продукта | Create / Update / Delete в MVP | — |
| Комментарий | Опциональный `reason` | — |
