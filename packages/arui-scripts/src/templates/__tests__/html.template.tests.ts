describe('html.template', () => {
    it('should contain react root and env-config placeholder', () => {
        jest.resetModules();
        jest.doMock('../../configs/app-configs', () => ({
            configs: {
                overridesPath: [],
            },
        }));

        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const { htmlTemplate } = require('../html.template');

        expect(htmlTemplate).toContain('id="react-app"');
        expect(htmlTemplate).toContain('<%= envConfig %>');
        expect(htmlTemplate).toContain('id="env-settings"');
        expect(htmlTemplate).toContain('<!doctype html>');
    });
});
