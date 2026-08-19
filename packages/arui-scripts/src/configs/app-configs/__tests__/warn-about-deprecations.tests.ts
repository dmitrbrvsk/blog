import { type AppContextWithConfigs } from '../types';
import { warnAboutDeprecations } from '../warn-about-deprecations';

describe('warnAboutDeprecations', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should convert object proxy config to array form', () => {
        const config = {
            proxy: {
                '/api': 'http://localhost:3001',
                '/ws': { target: 'http://localhost:3002', ws: true },
            },
        } as unknown as AppContextWithConfigs;

        warnAboutDeprecations(config);

        expect(config.proxy).toEqual([
            { context: '/api', target: 'http://localhost:3001' },
            { context: '/ws', target: 'http://localhost:3002', ws: true },
        ]);
        expect(console.warn).toHaveBeenCalled();
    });

    it('should not mutate proxy when it is already an array', () => {
        const proxy = [{ context: '/api', target: 'http://localhost:3001' }];
        const config = { proxy } as AppContextWithConfigs;

        warnAboutDeprecations(config);

        expect(config.proxy).toBe(proxy);
    });

    it('should copy disableDevWebpackTypecheck to disableDevRspackTypecheck', () => {
        const config = {
            disableDevWebpackTypecheck: false,
        } as AppContextWithConfigs;

        warnAboutDeprecations(config);

        expect(config.disableDevRspackTypecheck).toBe(false);
        expect(console.warn).toHaveBeenCalled();
    });
});
