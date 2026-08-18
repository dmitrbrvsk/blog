import { defineConfig, eslintConfig, TYPESCRIPT_SCRIPTS_SCOPE } from 'arui-presets-lint/eslint';

import { commonjsConfig, lintConfigFilesConfig } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [
    commonjsConfig,
    lintConfigFilesConfig,
    {
        settings: {
            react: {
                version: '18.0.0',
            },
        },
    },
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
            // это тестовый проект и ему позволительно писать в консоль
            'no-console': 'off',
        },
    },
]);
