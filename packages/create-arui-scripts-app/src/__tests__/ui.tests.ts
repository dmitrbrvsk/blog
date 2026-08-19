import { formatFileTree } from '../ui';

describe('formatFileTree', () => {
    it('строит дерево с каталогами сверху', () => {
        expect(
            formatFileTree([
                'package.json',
                'src/client/index.tsx',
                'src/client/components/app.tsx',
            ]),
        ).toEqual([
            '  ├─ src/',
            '  │  └─ client/',
            '  │     ├─ components/',
            '  │     │  └─ app.tsx',
            '  │     └─ index.tsx',
            '  └─ package.json',
        ]);
    });

    it('для одного файла рисует └─', () => {
        expect(formatFileTree(['README.md'])).toEqual(['  └─ README.md']);
    });

    it('для пустого списка возвращает пустой массив', () => {
        expect(formatFileTree([])).toEqual([]);
    });
});
