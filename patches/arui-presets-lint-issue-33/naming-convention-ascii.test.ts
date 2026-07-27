import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { namingConventionOptions } from '../../eslint/rules/typescript.js';

const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
        {
            files: ['**/*.ts'],
            languageOptions: {
                parser: tseslint.parser,
                parserOptions: {
                    projectService: {
                        allowDefaultProject: ['*.ts'],
                    },
                    ecmaVersion: 'latest',
                    sourceType: 'module',
                },
            },
            plugins: {
                '@typescript-eslint': tseslint.plugin,
            },
            rules: {
                '@typescript-eslint/naming-convention': ['error', ...namingConventionOptions],
            },
        },
    ],
});

async function lint(code: string) {
    const [result] = await eslint.lintText(code, { filePath: 'file.ts' });

    return result.messages.filter(
        (message) => message.ruleId === '@typescript-eslint/naming-convention',
    );
}

describe('naming-convention ascii identifiers', () => {
    it('принимает ascii-идентификаторы и ascii-ключи с дефисами', async () => {
        const messages = await lint(`
            const userName = 1;
            const MAX_COUNT = 10;
            const $element = null;
            function loadData() {}
            class UserCard {}
            type UserId = string;
            const rules = { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'off' };
        `);

        expect(messages).toEqual([]);
    });

    it('запрещает кириллицу в имени переменной', async () => {
        const messages = await lint('const пользователь = 1;');

        expect(messages).toHaveLength(1);
        expect(messages[0].message).toMatch(/RegExp/i);
    });

    it('запрещает кириллицу в имени функции', async () => {
        const messages = await lint('function загрузить() {}');

        expect(messages).toHaveLength(1);
    });

    it('запрещает кириллицу в имени класса', async () => {
        const messages = await lint('class Компонент {}');

        expect(messages).toHaveLength(1);
    });

    it('запрещает кириллицу в параметре', async () => {
        const messages = await lint('function load(параметр: string) { return параметр; }');

        expect(messages).toHaveLength(1);
    });

    it('запрещает кириллицу в свойстве объекта', async () => {
        const messages = await lint('const data = { имя: 1 };');

        expect(messages).toHaveLength(1);
    });

    it('запрещает кириллицу в члене enum', async () => {
        const messages = await lint('enum Status { Активный = 1 }');

        expect(messages).toHaveLength(1);
    });
});
