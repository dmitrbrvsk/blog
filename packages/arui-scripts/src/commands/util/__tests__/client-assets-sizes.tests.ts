import stripAnsi from 'strip-ansi';

import { printAssetsSizes } from '../client-assets-sizes';

jest.mock('../../../configs/app-configs', () => ({
    configs: {
        dictionaryCompression: {
            dictionaryPath: [],
        },
    },
}));

describe('printAssetsSizes', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should print js/css sizes and ignore unrelated assets', () => {
        const webpackStats = {
            toJson: () => ({
                assets: [
                    { type: 'asset', name: 'main.abcdef.js', size: 1024 },
                    { type: 'asset', name: 'main.abcdef.js.gz', size: 400 },
                    { type: 'asset', name: 'main.abcdef.js.br', size: 300 },
                    { type: 'asset', name: 'styles.123.css', size: 200 },
                    { type: 'asset', name: 'logo.png', size: 50000 },
                    { type: 'asset', name: 'dict.dict.br', size: 10 },
                    { type: 'chunk', name: 'ignored.js', size: 1 },
                ],
            }),
        };

        printAssetsSizes(webpackStats as never);

        const output = (console.log as jest.Mock).mock.calls
            .map((call) => stripAnsi(String(call[0])))
            .join('\n');

        expect(output).toContain('Assets sizes:');
        expect(output).toContain('main.js');
        expect(output).toContain('styles.css');
        expect(output).toContain('Total size:');
        expect(output).not.toContain('logo.png');
        expect(output).not.toContain('dict.dict.br');
    });
});
