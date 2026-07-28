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
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        TEXT NOT NULL,  -- actor_id
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        TEXT NOT NULL,  -- actor_id
    deleted_at        TIMESTAMPTZ NULL,
    deleted_by        TEXT NULL,      -- actor_id; заполняется при soft-delete
    CONSTRAINT chk_amount_range CHECK (amount_max >= amount_min)
);

CREATE INDEX idx_credit_products_status ON credit_products (status);
CREATE UNIQUE INDEX uq_credit_products_code_active
    ON credit_products (code)
    WHERE deleted_at IS NULL;  -- альтернатива: оставить UNIQUE(code) глобально
```

Рекомендация MVP: **глобально уникальный `code`** (даже после archive), чтобы не путать потребителей ФС/конвейера. Тогда достаточно `UNIQUE (code)` без partial index.

Списки по умолчанию: `WHERE deleted_at IS NULL` (или `status <> 'ARCHIVED'` — выбрать один канонический признак удаления и не дублировать семантику).

Канон MVP: удаление = `status = 'ARCHIVED'` **и** `deleted_at = now()`.

## 2. Таблица `audit_events` (append-only)

```sql
CREATE TABLE audit_events (
    id                  UUID PRIMARY KEY,
    action_id           UUID NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id            TEXT NOT NULL,
    actor_login         TEXT NOT NULL,          -- AD login / UPN на момент события
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

CREATE INDEX idx_audit_action_id ON audit_events (action_id);
CREATE INDEX idx_audit_entity ON audit_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_actor ON audit_events (actor_id, occurred_at DESC);
CREATE INDEX idx_audit_occurred_at ON audit_events (occurred_at DESC);

-- GRANT SELECT, INSERT ON audit_events TO product_admin_app;
-- REVOKE UPDATE, DELETE ON audit_events FROM product_admin_app;
```

### Формат `changes`

UPDATE:

```json
[
  { "field": "rate_annual_pct", "before": 18.5, "after": 17.9 },
  { "field": "amount_max", "before": 5000000.00, "after": 7000000.00 }
]
```

CREATE (`before` = null):

```json
[
  { "field": "code", "before": null, "after": "SMB_OVERDRAFT_12M" },
  { "field": "rate_annual_pct", "before": null, "after": 17.9 }
]
```

DELETE (`after` = null, полный snapshot ключевых полей в `before`):

```json
[
  { "field": "status", "before": "ACTIVE", "after": "ARCHIVED" },
  { "field": "code", "before": "SMB_OVERDRAFT_12M", "after": null }
]
```

## 3. Транзакции

### CREATE

```sql
BEGIN;
INSERT INTO credit_products (…, created_by, updated_by, status, version)
VALUES (…, :actor_id, :actor_id, 'ACTIVE', 1);
INSERT INTO audit_events (…, operation, changes)
VALUES (…, 'CREATE', :changes::jsonb);
COMMIT;
```

### UPDATE

```sql
BEGIN;
SELECT … FROM credit_products WHERE id = :id FOR UPDATE;
-- version mismatch → ROLLBACK; 409
UPDATE credit_products
   SET …, version = version + 1, updated_at = now(), updated_by = :actor_id
 WHERE id = :id AND version = :client_version;
INSERT INTO audit_events (…, operation, changes)
VALUES (…, 'UPDATE', :changes::jsonb);
COMMIT;
```

### DELETE (soft, только fs-admin)

```sql
BEGIN;
SELECT … FROM credit_products WHERE id = :id FOR UPDATE;
-- already archived → ROLLBACK; 404/410
-- version mismatch → 409
UPDATE credit_products
   SET status = 'ARCHIVED',
       deleted_at = now(),
       deleted_by = :actor_id,
       version = version + 1,
       updated_at = now(),
       updated_by = :actor_id
 WHERE id = :id AND version = :client_version AND deleted_at IS NULL;
INSERT INTO audit_events (…, operation, changes)
VALUES (…, 'DELETE', :changes::jsonb);
COMMIT;
```

## 4. Чтение аудита

```sql
SELECT *
  FROM audit_events
 WHERE entity_type = 'credit_product'
   AND entity_id = :id
 ORDER BY occurred_at DESC, id DESC
 LIMIT :limit;
```

Глобальный журнал — фильтры по `actor_id`, `operation`, `occurred_at`. Пагинация keyset, не OFFSET.

## 5. Расширение на другие сущности

`entity_type = 'scoring_policy' | 'fee_schedule' | 'process_cutoff' | …` — та же таблица аудита.

## 6. Retention (после MVP)

Партиции по `occurred_at` + выгрузка в DWH. Для MVP — одна таблица.
