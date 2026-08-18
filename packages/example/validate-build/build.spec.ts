import fs from 'node:fs';
import path from 'node:path';

const BUILD_PATH = path.join(__dirname, '../.build');

type AssetsManifest = Record<string, { js: string; css?: string }>;

// JSON.parse и асимметричные матчеры jest типизированы как any,
// поэтому приводим их к ожидаемой форме один раз
const anyString = expect.any(String) as string;

async function readManifest(...segments: string[]): Promise<AssetsManifest> {
    return JSON.parse(
        await fs.promises.readFile(path.join(BUILD_PATH, ...segments), 'utf8'),
    ) as AssetsManifest;
}

async function fileExists(filePath: string) {
    try {
        const res = await fs.promises.stat(filePath);

        return res.isFile();
    } catch {
        return false;
    }
}

describe('assets-manifest', () => {
    it('should have client assets manifest', async () => {
        const manifestPath = path.join(BUILD_PATH, 'assets/webpack-assets.json');

        expect(await fileExists(manifestPath)).toBe(true);
    });

    it('should have server assets manifest', async () => {
        const manifestPath = path.join(BUILD_PATH, 'webpack-assets.json');

        expect(await fileExists(manifestPath)).toBe(true);
    });

    it('should contain list of all assets', async () => {
        const manifest = await readManifest('webpack-assets.json');

        expect(manifest).toMatchObject({
            worker: {
                js: anyString,
            },
            __metadata__: {
                version: anyString,
                name: 'example',
            },
        });
    });
});

describe('server', () => {
    it('should have server entry', async () => {
        const serverEntryPath = path.join(BUILD_PATH, 'server.js');

        expect(await fileExists(serverEntryPath)).toBe(true);
    });
});

describe('client', () => {
    it('should create client entry', async () => {
        const assetsManifest = await readManifest('assets/webpack-assets.json');

        const mainJsPath = path.join(BUILD_PATH, assetsManifest.main.js);

        expect(await fileExists(mainJsPath)).toBe(true);
    });

    it('should create valid css', async () => {
        const assetsManifest = await readManifest('assets/webpack-assets.json');

        const { css } = assetsManifest.main;

        expect(css).toEqual(anyString);

        const moduleCssPath = path.join(BUILD_PATH, String(css));

        expect(await fileExists(moduleCssPath)).toBe(true);
        expect(await fs.promises.readFile(moduleCssPath, 'utf8')).toMatchSnapshot();
    });
});
