import {
    defineConfig,
    eslintConfig,
    globalIgnores,
    TYPESCRIPT_SCRIPTS_SCOPE,
} from 'arui-presets-lint/eslint';

import { commonjsConfig, eslintConfigIgnore } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [
    globalIgnores([...eslintConfigIgnore, 'src/templates/dockerfile-compiled.template.ts']),
    commonjsConfig,
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
                // tsconfig.json пакета публикуется как базовый конфиг для приложений и не задаёт
                // types/skipLibCheck, поэтому линтим по конфигу, по которому пакет собирается
                projectService: false,
                project: ['./tsconfig-local.json'],
            },
        },
        files: [TYPESCRIPT_SCRIPTS_SCOPE],
    },
    {
        rules: {
            // чтобы могли использовать for и генераторы
            'no-restricted-syntax': 'off',
            // проект - cli-тулза, и она должна писать в консоль
            'no-console': 'off',
            'import-x/no-cycle': 'off', // TODO: 7 ошибок, возможно их можно убрать
            // TODO: 5 ошибок с импортом lodash.merge. Убрать отдельным пр
            'no-restricted-imports': 'off',
            '@typescript-eslint/no-restricted-imports': 'off',
        },
    },
]);
