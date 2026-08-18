import {
    defineConfig,
    eslintConfig,
    globalIgnores,
    TYPESCRIPT_SCRIPTS_SCOPE,
} from 'arui-presets-lint/eslint';

import { commonjsConfig, eslintConfigIgnore } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [
    globalIgnores(eslintConfigIgnore),
    commonjsConfig,
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
                    // конфиги arui-scripts читает сборщик, в tsconfig.json приложения они не входят
                    allowDefaultProject: ['arui-scripts.config.ts', 'arui-scripts.overrides.ts'],
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
