import { defineConfig, eslintConfig, globalIgnores } from 'arui-presets-lint/eslint';

import { commonjsConfig, eslintConfigIgnore } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [
    // в assets лежит вендоренный релиз yarn, который копируется в создаваемый проект
    globalIgnores([...eslintConfigIgnore, 'assets/**']),
    commonjsConfig,
    {
        rules: {
            // CLI пишет в консоль
            'no-console': 'off',
        },
    },
]);
