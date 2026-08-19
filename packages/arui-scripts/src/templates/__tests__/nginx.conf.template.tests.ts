describe('nginx.conf.template', () => {
    function getTemplate(config: Record<string, unknown>) {
        jest.resetModules();
        jest.doMock('../../configs/app-configs', () => ({
            configs: {
                clientServerPort: 8080,
                serverPort: 3000,
                clientOnly: false,
                publicPath: 'assets/',
                nginxRootPath: '/src',
                buildPath: '.build',
                dictionaryCompression: {
                    enablePreviousVersionHeaders: false,
                },
                overridesPath: [],
                ...config,
            },
        }));

        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        return require('../nginx.conf.template').nginxConfTemplate as string;
    }

    it('should listen on clientServerPort and proxy to serverPort by default', () => {
        const template = getTemplate({});

        expect(template).toContain('listen 8080');
        expect(template).toContain('proxy_pass http://127.0.0.1:3000');
        expect(template).not.toContain('index index.html');
    });

    it('should serve static files in clientOnly mode', () => {
        const template = getTemplate({ clientOnly: true });

        expect(template).toContain('root /src/.build');
        expect(template).toContain('index index.html');
        expect(template).not.toContain('proxy_pass');
    });

    it('should enable brotli dictionary headers when configured', () => {
        const template = getTemplate({
            dictionaryCompression: { enablePreviousVersionHeaders: true },
        });

        expect(template).toContain('brotli_auto_dictionary on;');
    });

    it('should disable cache for remoteEntry.js', () => {
        const template = getTemplate({});

        expect(template).toContain('location = /assets/remoteEntry.js');
        expect(template).toContain('no-store, no-cache, must-revalidate');
    });
});
