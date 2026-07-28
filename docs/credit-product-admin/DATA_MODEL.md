# Модель данных — Product Admin MVP

СУБД: **PostgreSQL 15+**.

## 1. Таблица `credit_products`

```sql
CREATE TABLE credit_products (
    id                UUID PRIMARY KEY,
    code              TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    description       TEXT NOT NULL,
    term_months       INT  NOT NULL CHECK (term_months > 0),
    rate_annual_pct   NUMERIC(8, 4) NOT NULL CHECK (rate_annual_pct >= 0),
    amount_min        NUMERIC(18, 2) NOT NULL CHECK (amount_min > 0),
    amount_max        NUMERIC(18, 2) NOT NULL,
    currency          CHAR(3) NOT NULL DEFAULT 'RUB',
    status            TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    version           INT  NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        TEXT NOT NULL,  -- actor_id
    CONSTRAINT chk_amount_range CHECK (amount_max >= amount_min)
);

CREATE INDEX idx_credit_products_status ON credit_products (status);
```

MVP: UI/API редактируют только продукты в `ACTIVE` (или явно разрешённые статусы).

## 2. Таблица `audit_events` (append-only)

```sql
CREATE TABLE audit_events (
    id                  UUID PRIMARY KEY,
    action_id           UUID NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id            TEXT NOT NULL,
    actor_login         TEXT NOT NULL,
    actor_display_name  TEXT NULL,
    source              TEXT NOT NULL,           -- admin-ui | api | migration
    ip                  TEXT NULL,
    user_agent          TEXT NULL,
    entity_type         TEXT NOT NULL,           -- credit_product
    entity_id           TEXT NOT NULL,
    operation           TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
    changes             JSONB NOT NULL,
    reason              TEXT NULL,
    request_id          TEXT NULL
);

-- один save продукта = один action_id; в MVP обычно одна строка на action
CREATE INDEX idx_audit_action_id ON audit_events (action_id);
CREATE INDEX idx_audit_entity ON audit_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_actor ON audit_events (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_occurred_at ON audit_events (occurred_at DESC);

-- запрет изменения/удаления на уровне прав:
-- GRANT SELECT, INSERT ON audit_events TO product_admin_app;
-- REVOKE UPDATE, DELETE ON audit_events FROM product_admin_app;
```

### Формат `changes`

```json
[
  { "field": "rate_annual_pct", "before": 18.5, "after": 17.9 },
  { "field": "amount_max", "before": 5000000.00, "after": 7000000.00 },
  { "field": "description", "before": "…", "after": "…" }
]
```

Типы значений в JSON: числа как number, строки как string. Деньги — number с фиксированной точностью на уровне приложения (или string decimal — зафиксировать в OpenAPI один раз).

## 3. Транзакционный сценарий UPDATE

```sql
BEGIN;

SELECT id, version, description, term_months, rate_annual_pct,
       amount_min, amount_max, …
  FROM credit_products
 WHERE id = :id
 FOR UPDATE;

-- если version <> :client_version → ROLLBACK; 409

UPDATE credit_products
   SET description     = :description,
       term_months     = :term_months,
       rate_annual_pct = :rate_annual_pct,
       amount_min      = :amount_min,
       amount_max      = :amount_max,
       version         = version + 1,
       updated_at      = now(),
       updated_by      = :actor_id
 WHERE id = :id
   AND version = :client_version;

INSERT INTO audit_events (
    id, action_id, actor_id, actor_login, actor_display_name,
    source, entity_type, entity_id, operation, changes, reason, request_id
) VALUES (
    :event_id, :action_id, :actor_id, :actor_login, :actor_display_name,
    'admin-ui', 'credit_product', :id, 'UPDATE', :changes::jsonb, :reason, :request_id
);

COMMIT;
```

## 4. Чтение аудита

По продукту:

```sql
SELECT *
  FROM audit_events
 WHERE entity_type = 'credit_product'
   AND entity_id = :id
 ORDER BY occurred_at DESC, id DESC
 LIMIT :limit;
```

Глобальный журнал — фильтры по `actor_id`, `occurred_at` range, опционально `entity_id`. Пагинация: keyset (`occurred_at`, `id`), не OFFSET.

## 5. Расширение на другие сущности

Новые типы параметров процессов:

- `entity_type = 'scoring_policy' | 'fee_schedule' | 'process_cutoff' | …`
- те же колонки аудита;
- отдельные таблицы сущностей + те же use-case паттерны.

Менять модель аудита не требуется.

## 6. Retention (после MVP)

- Горячий слой: N месяцев в primary PG.
- Архив: партиции по `occurred_at` + выгрузка в холодное хранилище / DWH.
- Для MVP достаточно одной таблицы без партиций.
