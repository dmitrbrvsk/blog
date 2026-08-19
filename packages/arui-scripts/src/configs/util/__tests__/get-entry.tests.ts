import { getEntry } from '../get-entry';

describe('getEntry', () => {
    const prependHot = (entry: string[], prefix: string) => [prefix, ...entry];

    it('should wrap a string entry with getSingleEntry', () => {
        expect(getEntry('./src/index.ts', (entry) => ['hot', ...entry])).toEqual([
            'hot',
            './src/index.ts',
        ]);
    });

    it('should wrap an array entry with getSingleEntry', () => {
        expect(getEntry(['./a.ts', './b.ts'], (entry) => ['polyfill', ...entry])).toEqual([
            'polyfill',
            './a.ts',
            './b.ts',
        ]);
    });

    it('should map each named entry in an object', () => {
        const result = getEntry(
            {
                main: './src/index.ts',
                admin: ['./src/admin.ts'],
            },
            (entry) => ['hot', ...entry],
        );

        expect(result).toEqual({
            main: ['hot', './src/index.ts'],
            admin: ['hot', './src/admin.ts'],
        });
    });

    it('should pass additional arguments to getSingleEntry', () => {
        const result = getEntry('index.ts', prependHot, 'webpack-hot');

        expect(result).toEqual(['webpack-hot', 'index.ts']);
    });
});
