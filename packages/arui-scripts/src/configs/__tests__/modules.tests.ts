import { configs } from '../app-configs';
import {
    getCssPrefixForModule,
    haveExposedDefaultModules,
    patchWebpackConfigForCompat,
} from '../modules';

describe('getCssPrefixForModule', () => {
    it('should return explicit cssPrefix when provided', () => {
        expect(
            getCssPrefixForModule({ name: 'chat', entry: './chat.ts', cssPrefix: '.chat' }),
        ).toBe('.chat');
    });

    it('should return undefined when cssPrefix is disabled', () => {
        expect(
            getCssPrefixForModule({ name: 'chat', entry: './chat.ts', cssPrefix: false }),
        ).toBeUndefined();
    });

    it('should fall back to .module-{name}', () => {
        expect(getCssPrefixForModule({ name: 'chat', entry: './chat.ts' })).toBe('.module-chat');
    });
});

describe('haveExposedDefaultModules', () => {
    const originalModules = configs.modules;

    afterEach(() => {
        configs.modules = originalModules;
    });

    it('should return exposes object when modules are configured', () => {
        configs.modules = {
            shared: {},
            exposes: { Button: './src/button' },
        };

        expect(haveExposedDefaultModules()).toEqual({ Button: './src/button' });
    });

    it('should return falsy value when modules are not configured', () => {
        configs.modules = null;

        expect(haveExposedDefaultModules()).toBeFalsy();
    });
});

describe('patchWebpackConfigForCompat', () => {
    it('should merge externals, set publicPath to auto and uniqueName', () => {
        const webpackConf = {
            externals: { react: 'React' },
            output: { filename: 'bundle.js' },
        };

        const result = patchWebpackConfigForCompat(
            {
                name: 'chat',
                entry: './chat.ts',
                cssPrefix: false,
                externals: { lodash: '_' },
            },
            webpackConf,
        );

        expect(result.externals).toEqual({ react: 'React', lodash: '_' });
        expect(result.output).toMatchObject({
            filename: 'bundle.js',
            publicPath: 'auto',
            uniqueName: 'chat',
        });
    });
});
