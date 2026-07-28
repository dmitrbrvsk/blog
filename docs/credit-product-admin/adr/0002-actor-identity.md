# ADR 0002: Идентичность через банковский Keycloak + AD

## Статус

Accepted (MVP)

## Контекст

Нужна однозначная идентификация оператора в журнале изменений. Учётки сотрудников банка живут в **Active Directory**. Корпоративный IdP — **банковский Keycloak** с federation к AD.

## Решение

- AuthN Admin UI и API: **OIDC** через банковский Keycloak.
- Пользователи входят **AD-учётками** (Keycloak User Federation / Identity Provider → AD).
- `actor_id` = claim `sub` из access token Keycloak (стабильный ID УЗ в IdP).
- `actor_login` = AD login / UPN (`preferred_username`) на момент события.
- `actor_display_name` = `name` (опционально).
- Каждое мутирующее действие (CREATE/UPDATE/DELETE) получает `action_id` (UUID), возвращаемый в ответе API.
- Роли приложения приходят из Keycloak (client/realm roles), маппятся из AD-групп на стороне IAM (см. ADR 0005).

## Последствия

(+) Единый банковский контур SSO; без локальных паролей в приложении.  
(+) Стабильная корреляция с AD/IAM через `sub` + читаемый login в журнале.  
(+) История сохраняет login as-of (даже если UPN позже сменят).  
(−) Зависимость от доступности Keycloak при логине (сессии/refresh — по политике банка).  
(−) Нужна согласованная схема имён AD-групп с командой IAM.
