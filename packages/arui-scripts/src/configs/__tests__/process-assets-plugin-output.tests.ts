import { MODULES_ENTRY_NAME } from '../modules';
import { processAssetsPluginOutput } from '../process-assets-plugin-output';

jest.mock('../app-configs', () => ({
    configs: {
        publicPath: 'assets/',
        version: '1.2.3',
        normalizedName: 'test_app',
        modules: {
            exposes: {
                Button: './src/button',
            },
        },
        compatModules: {
            exposes: {},
        },
    },
}));

describe('processAssetsPluginOutput', () => {
    it('should replace auto/ paths, add module entries and metadata', () => {
        const result = JSON.parse(
            processAssetsPluginOutput({
                main: {
                    js: 'auto/main.js',
                    css: 'auto/main.css',
                },
            }),
        );

        expect(result.main).toEqual({
            js: 'assets/main.js',
            css: 'assets/main.css',
        });
        expect(result.Button).toEqual({
            mode: 'default',
            js: expect.stringContaining(MODULES_ENTRY_NAME),
        });
        // eslint-disable-next-line no-underscore-dangle
        expect(result.__metadata__).toEqual({
            version: '1.2.3',
            name: 'test_app',
        });
    });

    it('should throw when a module is defined both as module and compat', () => {
        jest.resetModules();
        jest.doMock('../app-configs', () => ({
            configs: {
                publicPath: 'assets/',
                version: '1.2.3',
                normalizedName: 'test_app',
                modules: {
                    exposes: {
                        Button: './src/button',
                    },
                },
                compatModules: {
                    exposes: {
                        Button: { entry: './compat-button.ts' },
                    },
                },
            },
        }));

        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const processOutput = require('../process-assets-plugin-output').processAssetsPluginOutput;

        expect(() => processOutput({ main: { js: 'main.js' } })).toThrow(/Button/);
    });
});
