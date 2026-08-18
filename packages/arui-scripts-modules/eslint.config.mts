import { defineConfig, eslintConfig, globalIgnores } from 'arui-presets-lint/eslint';

import { commonjsConfig, eslintConfigIgnore } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [
    globalIgnores(eslintConfigIgnore),
    commonjsConfig,
    {
        rules: {
            // CSS.escape отсутствует в jsdom, на котором тестируется и сам пакет,
            // и приложения-потребители
            'unicorn/require-css-escape': 'off',
        },
    },
]);
