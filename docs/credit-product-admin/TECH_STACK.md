# Технологический стек — Product Admin MVP

Стек выбран под **банковский внутренний контур**: предсказуемость, аудит, SSO, операционная зрелость. Где возможно — совпадать с платформенным стандартом кредитования/МСБ (ниже — рекомендуемый default, если стандарта нет).

## 1. Рекомендуемый стек

| Слой | Технология | Зачем |
|---|---|---|
| **Admin UI** | TypeScript + React (Vite) | Стандарт для внутренних SPA; быстрый CRUD/формы |
| **UI-kit** | Корпоративная DS (если есть) / Ant Design / MUI | Таблицы, формы, журнал — из коробки; не кастомный дизайн-лендинг |
| **BFF / API** | Kotlin + Spring Boot 3 **или** Java 21 + Spring Boot 3 | Типичный банковский backend; транзакции, security, observability |
| **Альтернатива API** | Go (chi/echo) + pgx | Если команда Go-native и уже так устроен конвейер |
| **Auth** | **Банковский Keycloak** (OIDC) + federation к **AD** | AD-учётки; `sub` = `actor_id`; роли client roles из AD-групп |
| **БД** | PostgreSQL 15+ | JSONB для `changes`, надёжные транзакции, append-only audit |
| **Миграции** | Flyway / Liquibase | Обязательный versioned schema |
| **API-контракт** | OpenAPI 3 + oapi-codegen / springdoc | Контракт-first между UI и backend |
| **Валидация** | Bean Validation / ручные domain invariants | Суммы, сроки, ставка |
| **Кеш (опционально)** | Не нужен в MVP | Каталог маленький; читать из PG |
| **Брокер** | Не нужен в MVP | Точка расширения: transactional outbox |
| **Метрики/трейсы** | Micrometer + OpenTelemetry → Prometheus/Grafana/Tempo | `action_id` в span/log |
| **Логи** | JSON structured (logback/ecs) | Корреляция `action_id` / `request_id` |
| **CI** | GitHub Actions / GitLab CI | lint, test, migrate-check, image build |
| **Деплой** | Kubernetes / платформенный PaaS | Как у соседних сервисов кредитования |

### Что сознательно не берём в MVP

| Вариант | Почему не сейчас |
|---|---|
| Отдельный Audit microservice | Ломает атомарность без 2PC/outbox; overkill |
| Event sourcing всего продукта | Сложность >> пользы при CRUD-каталоге |
| MongoDB как primary | Слабее для строгих транзакций + compliance-привычки банка |
| Serverless only | Хуже для stateful транзакций и VPC/SSO в банке |
| Kafka в горячем пути записи | Усложняет consistency; достаточно post-MVP outbox |

---

## 2. Backend: предпочтение Spring Boot

Для кредитного домена чаще уже есть Java/Kotlin платформа — **выравниваемся**.

Минимальные модули сервиса:

```
product-admin-service/
  api/          # controllers, DTOs, OpenAPI
  app/          # use-cases: CreateProduct, UpdateProduct, DeleteProduct, ListAudit
  domain/       # CreditProduct, AuditEvent, invariants, roles
  infra/        # JPA/JDBC, Keycloak resource-server, clock, id generator
```

Доступ к БД:

- **JDBC / jOOQ / MyBatis** предпочтительнее «магии» для явного `FOR UPDATE` + insert audit.
- JPA допустим, если команда так живёт; критичный use-case писать нативно/явно.

Транзакция update (create/delete — аналогично с другим `operation`):

```text
@Transactional
updateProduct(cmd):
  requireRole(EDITOR or FS_ADMIN)
  product = repo.lockById(cmd.id)
  assert product.version == cmd.version else Conflict
  diff = Diff.calculate(product, cmd)
  if diff.isEmpty → return NoOp
  product.apply(cmd); product.version++
  repo.save(product)
  auditRepo.append(AuditEvent.from(actor, UPDATE, diff, actionId))
  return Result(product, actionId)
```

Security: Spring Security OAuth2 Resource Server → issuer банковского Keycloak, маппинг authorities из realm/client roles (`credit-admin.*`).

---

## 3. Frontend

- React + TypeScript, React Query/TanStack Query для GET/POST/PATCH/DELETE.
- Логин: OIDC Authorization Code + PKCE против Keycloak.
- Форма create/edit + подтверждение delete (только для `fs-admin`).
- При `409` — toast «продукт изменили параллельно» + refetch.
- Журнал аудита: operation + before/after; колонка `action_id` с copy.
- Никакой бизнес-логики аудита на клиенте — только отображение ответа API.

---

## 4. Данные и интеграция с конвейером

**Запись:** только Product Admin.

**Чтение актуальными процессами кредитования** (варианты, выбрать по ландшафту):

1. **Прямой read API** Product Admin (sync) — проще всего для MVP.
2. **DB replica / read-model** — если конвейер уже ходит в каталог.
3. **Событие `CreditProductUpdated`** (post-MVP outbox) — для кешей витрины/скоринга.

Важно: онлайн-заявка не должна зависеть от доступности Admin UI; read-path конвейера лучше отделить (read replica или event).

---

## 5. Безопасность стека

| Механизм | Реализация |
|---|---|
| AuthN | Keycloak OIDC Code + PKCE (UI), JWT resource-server (API); пользователи из AD |
| AuthZ | Spring Security по ролям `viewer` / `editor` / `fs-admin` |
| DB | роль приложения: `SELECT/INSERT/UPDATE` на products; `SELECT/INSERT` на audit |
| Secrets | Vault / платформенный secret store |
| Network | mTLS mesh или сетевые политики namespace |

---

## 6. Локальная разработка

```text
docker compose: PostgreSQL + Keycloak (с тестовым AD/LDAP mock или in-memory users под AD-логины)
make migrate
make run-api
make run-ui
```

Seed: 3–5 демо-продуктов + пользователи с ролями viewer / editor / fs-admin.

---

## 7. Критерии выбора, если стек команды другой

Если кредитный контур уже на **.NET / Node / Go** — **не плодить второй стек**. Переносим те же архитектурные инварианты:

1. Одна транзакция product + audit на CREATE/UPDATE/DELETE.
2. `actor_id` из Keycloak (`sub`), login из AD.
3. `action_id` на каждое действие.
4. Optimistic locking.
5. Append-only audit table.
6. Роль `fs-admin` для удаления и админских операций ФС.

Технологии вторичны относительно этих инвариантов.
