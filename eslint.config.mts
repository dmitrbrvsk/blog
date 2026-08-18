import { defineConfig, eslintConfig, globalIgnores } from 'arui-presets-lint/eslint';

export default defineConfig(eslintConfig, [
    // Пакеты линтуются своими конфигами: turbo запускает lint в рабочей директории пакета,
    // а flat config резолвится от неё, а не от файла. Здесь остаются только корневые файлы
    globalIgnores(['packages/**']),
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
]);
