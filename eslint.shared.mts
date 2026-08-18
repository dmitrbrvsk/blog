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
 * Линтеры объявлены в корневом package.json монорепозитория, поэтому для конфигов
 * в пакетах правило должно проверять зависимости именно по нему
 */
export const lintConfigFilesConfig: Linter.Config = {
    name: 'arui-scripts/lint-config-files',
    files: ['eslint.config.mts'],
    rules: {
        'import-x/no-extraneous-dependencies': [
            'error',
            { devDependencies: true, packageDir: [import.meta.dirname] },
        ],
    },
};
