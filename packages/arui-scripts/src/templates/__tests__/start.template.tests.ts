describe('start.template', () => {
    function getTemplate(clientOnly: boolean) {
        jest.resetModules();
        jest.doMock('../../configs/app-configs', () => ({
            configs: {
                clientOnly,
                buildPath: '.build',
                serverOutput: 'server.js',
                overridesPath: [],
            },
        }));

        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        return require('../start.template').startScript as string;
    }

    it('should start nginx and node in isomorphic mode', () => {
        const template = getTemplate(false);

        expect(template).toContain('nginx &');
        expect(template).toContain('exec node --max-old-space-size=');
        expect(template).toContain('./.build/server.js');
    });

    it('should only start nginx and substitute env-config in clientOnly mode', () => {
        const template = getTemplate(true);

        expect(template).toContain('env-config.json');
        expect(template).toContain('<%= envConfig %>');
        expect(template).toContain('nginx');
        expect(template).not.toContain('exec node');
    });
});
