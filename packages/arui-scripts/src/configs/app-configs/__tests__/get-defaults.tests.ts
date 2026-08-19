import { getDefaultAppConfig, getDefaultAppContext, nginxConfigFileName } from '../get-defaults';

describe('get-defaults', () => {
    it('should expose nginx config file name', () => {
        expect(nginxConfigFileName).toBe('nginx.conf');
    });

    it('should return baseline app config values', () => {
        const config = getDefaultAppConfig();

        expect(config.clientServerPort).toBe(8080);
        expect(config.serverPort).toBe(3000);
        expect(config.buildPath).toBe('.build');
        expect(config.assetsPath).toBe('assets');
        expect(config.codeLoader).toBe('swc');
        expect(config.experimentalReactCompiler).toBe('disabled');
        expect(config.clientOnly).toBe(false);
        expect(config.keepCssVars).toBe(false);
        expect(config.disableModulesSupport).toBe(false);
    });

    it('should derive context from package.json', () => {
        const context = getDefaultAppContext();

        expect(context.name).toBe('arui-scripts');
        expect(context.normalizedName).toBe('arui_scripts');
        expect(context.cwd).toBe(process.cwd());
        expect(typeof context.useYarn).toBe('boolean');
        expect(context.publicPath).toBe('');
        expect(context.watchIgnorePath).toEqual([]);
    });
});
