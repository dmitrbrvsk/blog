# Технологический стек — Product Admin MVP

Стек выбран под **банковский внутренний контур**: предсказуемость, аудит, SSO, операционная зрелость. Где возможно — совпадать с платформенным стандартом кредитования/МСБ (ниже — рекомендуемый default, если стандарта нет).

## 1. Рекомендуемый стек

| Слой | Технология | Зачем |
|---|---|---|
| **Admin UI** | TypeScript + React (Vite) | Стандарт для внутренних SPA; быстрый CRUD/формы |
| **UI-kit** | Корпоративная DS (если есть) / Ant Design / MUI | Таблицы, формы, журнал — из коробки; не кастомный дизайн-лендинг |
| **BFF / API** | Kotlin + Spring Boot 3 **или** Java 21 + Spring Boot 3 | Типичный банковский backend; транзакции, security, observability |
| **Альтернатива API** | Go (chi/echo) + pgx | Если команда Go-native и уже так устроен конвейер |
| **Auth** | OIDC (Keycloak / Entra ID / корпоративный IdP) | `sub` = `actor_id`, роли в realm/client roles |
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
  app/          # use-cases: UpdateProduct, ListAudit
  domain/       # CreditProduct, AuditEvent, invariants
  infra/        # JPA/JDBC, security, clock, id generator
```

Доступ к БД:

- **JDBC / jOOQ / MyBatis** предпочтительнее «магии» для явного `FOR UPDATE` + insert audit.
- JPA допустим, если команда так живёт; критичный use-case писать нативно/явно.

Транзакция update:

```text
@Transactional
updateProduct(cmd):
  product = repo.lockById(cmd.id)
  assert product.version == cmd.version else Conflict
  diff = Diff.calculate(product, cmd)
  if diff.isEmpty → return NoOp
  product.apply(cmd); product.version++
  repo.save(product)
  auditRepo.append(AuditEvent.from(actor, diff, actionId))
  return Result(product, actionId)
```

---

## 3. Frontend

- React + TypeScript, React Query/TanStack Query для GET/PATCH.
- Форма: controlled fields + отображение серверных ошибок валидации.
- При `409` — toast «продукт изменили параллельно» + refetch.
- Экран аудита: таблица + expandable row с before/after; колонка `action_id` с copy.
- Никакой бизнес-логики «что писать в audit» на клиенте — только отображение ответа API.

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
| AuthN | OIDC Authorization Code + PKCE (UI), JWT resource-server (API) |
| AuthZ | Spring Security method/HTTP security по ролям |
| DB | роль приложения: `SELECT/INSERT/UPDATE` на products; `SELECT/INSERT` на audit |
| Secrets | Vault / платформенный secret store |
| Network | mTLS mesh или сетевые политики namespace |

---

## 6. Локальная разработка

```text
docker compose: PostgreSQL + (опционально Keycloak)
make migrate
make run-api
make run-ui
```

Seed: 3–5 демо-продуктов + фиктивный IdP user для viewer/editor.

---

## 7. Критерии выбора, если стек команды другой

Если кредитный контур уже на **.NET / Node / Go** — **не плодить второй стек**. Переносим те же архитектурные инварианты:

1. Одна транзакция product + audit.
2. `actor_id` из IdP.
3. `action_id` на каждое изменение.
4. Optimistic locking.
5. Append-only audit table.

Технологии вторичны относительно этих инвариантов.
