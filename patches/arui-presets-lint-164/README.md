# Patch for core-ds/arui-presets-lint#164

Добавляет `eslint-plugin-react-you-might-not-need-an-effect@1.0.1` в пресет.

## Как применить в arui-presets-lint

```bash
git clone https://github.com/core-ds/arui-presets-lint.git
cd arui-presets-lint
git checkout -b cursor/eslint-plugin-react-you-might-not-need-an-effect-802d
git apply /path/to/164-eslint-plugin-react-you-might-not-need-an-effect.patch
# или: git am /path/to/164-eslint-plugin-react-you-might-not-need-an-effect.patch
yarn install
yarn build
yarn workspace arui-presets-lint test
```

## Что сделано

- dependency: `eslint-plugin-react-you-might-not-need-an-effect@1.0.1`
- глобальная регистрация плагина в `eslint/index.ts`
- конфиг `reactYouMightNotNeedAnEffectConfig` с `recommended` (все правила как `warn`)
- скоуп: `GLOBAL_SCRIPTS_SCOPE` (включая `.ts` с кастомными хуками)
- changeset (minor)
- тесты пакета проходят локально

## Почему PR не открыт в core-ds

Cloud agent запущен в репозитории `dmitrbrvsk/blog` и не имеет push/PR прав в `core-ds/arui-presets-lint`.
