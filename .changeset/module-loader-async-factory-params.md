---
'@alfalab/scripts-modules': minor
---

`getFactoryParams` в `useModuleFactory` теперь может возвращать промис - хук и раньше ожидал результат через `await`, но тип этого не допускал.

Обработчики событий XHR переведены с `onload`/`onerror` на `addEventListener`, поведение не изменилось.
