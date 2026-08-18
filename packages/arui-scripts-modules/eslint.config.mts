import { defineConfig, eslintConfig, TYPESCRIPT_SCRIPTS_SCOPE } from 'arui-presets-lint/eslint';

import { commonjsConfig, lintConfigFilesConfig } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [
    commonjsConfig,
    lintConfigFilesConfig,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
                projectService: {
                    // tsconfig.json собирает только src, конфиги в корне пакета в него не входят
                    allowDefaultProject: ['*.ts', '*.mts', '*.cts'],
                },
            },
        },
        files: [TYPESCRIPT_SCRIPTS_SCOPE],
    },
    {
        rules: {
            // CSS.escape отсутствует в jsdom, на котором тестируется и сам пакет,
            // и приложения-потребители
            'unicorn/require-css-escape': 'off',
        },
    },
]);
