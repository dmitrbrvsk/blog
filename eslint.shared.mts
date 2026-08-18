import { globals, type Linter } from 'arui-presets-lint/eslint';

/**
 * Пресет считает все скрипты es-модулями, но .js в репозитории - commonjs:
 * это конфиги jest/stylelint и рантайм-хелперы, подключаемые сборкой через require
 */
export const commonjsConfig: Linter.Config = {
    name: 'arui-scripts/commonjs',
    files: ['**/*.js'],
    languageOptions: {
        sourceType: 'commonjs',
        globals: globals.node,
    },
};

/**
 * Конфиги eslint написаны на .mts и используют import.meta, а tsconfig пакетов
 * собирает commonjs, где import.meta невалиден. Линтить сами конфиги смысла нет
 */
export const eslintConfigIgnore = ['eslint.config.mts'];
