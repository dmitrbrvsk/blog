import { Rule } from 'postcss';

import { addGlobalVariable } from '../utils';

describe('addGlobalVariable', () => {
    it('Должен добавлять переменные, найденные в cssValue, в rootSelector', () => {
        const mockRootSelector = new Rule({ selector: ':root' });
        const parsedVariables = {
            '--color-primary': '#ff0000',
        };

        addGlobalVariable('var(--color-primary)', mockRootSelector, parsedVariables);

        expect(mockRootSelector.nodes).toMatchObject([
            { prop: '--color-primary', value: '#ff0000' },
        ]);
    });

    it('Должен рекурсивно добавлять вложенные переменные', () => {
        const mockRootSelector = new Rule({ selector: ':root' });
        const mockRootSelectorWithSpace = new Rule({ selector: ':root' });
        const mockRootSelectorWithNewline = new Rule({ selector: ':root' });

        const parsedVariables = {
            '--color-primary': 'var(--color-secondary)',
            '--color-secondary': '#00ff00',
        };

        const parsedVariablesWithSpace = {
            '--color-primary': 'var( --color-secondary )',
            '--color-secondary': '#00ff00',
        };

        const parsedVariablesWithNewline = {
            '--color-primary': 'var(\n  --color-secondary\n  )',
            '--color-secondary': '#00ff00',
        };

        addGlobalVariable('var(--color-primary)', mockRootSelector, parsedVariables);
        addGlobalVariable(
            'var(--color-primary)',
            mockRootSelectorWithSpace,
            parsedVariablesWithSpace,
        );
        addGlobalVariable(
            'var(--color-primary)',
            mockRootSelectorWithNewline,
            parsedVariablesWithNewline,
        );

        expect(mockRootSelector.nodes).toMatchObject([
            { prop: '--color-primary', value: 'var(--color-secondary)' },
            { prop: '--color-secondary', value: '#00ff00' },
        ]);

        expect(mockRootSelectorWithSpace.nodes).toMatchObject([
            { prop: '--color-primary', value: 'var( --color-secondary )' },
            { prop: '--color-secondary', value: '#00ff00' },
        ]);

        expect(mockRootSelectorWithNewline.nodes).toMatchObject([
            { prop: '--color-primary', value: 'var(\n  --color-secondary\n  )' },
            { prop: '--color-secondary', value: '#00ff00' },
        ]);
    });

    it('Не должен добавлять переменные, если их нет в parsedVariables', () => {
        const mockRootSelector = new Rule({ selector: ':root' });
        const parsedVariables = {
            'color-primary': '#ff0000',
        };

        addGlobalVariable('var(--color-secondary)', mockRootSelector, parsedVariables);

        expect(mockRootSelector.nodes).toEqual([]);
    });
});
