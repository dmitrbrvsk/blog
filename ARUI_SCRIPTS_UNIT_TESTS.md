# Юнит-тесты для arui-scripts

Агент был запущен на репозитории `dmitrbrvsk/blog`, поэтому изменения лежат здесь.
Сами тесты написаны и прогнаны против актуального `core-ds/arui-scripts` (`packages/arui-scripts`).

## Что проверено

В пакете `arui-scripts` уже были точечные тесты (CLI, overrides, polyfills, docker-шаблоны, postcss variables).
Большая часть утилит, конфигов и шаблонов оставалась без покрытия.

Добавлены базовые юнит-тесты для:

- утилит конфигов: `findLoader`, `getEntry`, `tryResolve`, `checkNodeVersion`
- app-config: defaults, validate, deprecations, env-config, config file, dependent paths
- команд: CSS ident, webpack messages, yarn helpers, размеры ассетов, exec
- плагинов: postcss prefix, `TurnOffSplitRemoteEntry`
- шаблонов: nginx, start.sh, html

Результат в `core-ds/arui-scripts`: **43 test suites / 137 tests, все зелёные**.
Линтер на новых файлах ошибок не даёт (остались только старые warning'и репозитория).

## Как перенести в core-ds/arui-scripts

Пути файлов совпадают с монорепозиторием. Вариант 1:

```bash
git clone https://github.com/core-ds/arui-scripts.git
cd arui-scripts
git apply /path/to/arui-scripts-unit-tests.patch
cd packages/arui-scripts
yarn test
```

Вариант 2: скопировать каталог `packages/arui-scripts/src/**/__tests__` из этого PR в клон `core-ds/arui-scripts`.

Запуск тестов:

```bash
yarn install --immutable
yarn workspace arui-scripts test
```
