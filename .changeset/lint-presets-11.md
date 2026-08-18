---
'arui-scripts': patch
'@alfalab/scripts-server': patch
---

Обновление `arui-presets-lint` до 11.1.1 с переходом на flat config eslint.

В `arui-scripts` объявлены зависимости `browserslist` и `source-map-support`, которые импортировались, но отсутствовали в `package.json`. Шаблон `build` в `.gitignore` привязан к корню пакета: раньше он скрывал от линтеров и сборщиков каталог `src/commands/build`. Остальные правки внутренние - типизация мест, где `any` расползался по коду, и приведение кода под новый набор правил.
