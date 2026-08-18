import { readFile } from 'node:fs';

import { readAssetsManifest } from '../read-assets-manifest';

jest.mock('node:fs', () => ({
    readFile: jest.fn(),
}));

describe('readAssetsManifest', () => {
    it('should throw error if manifest file not found', async () => {
        (readFile as unknown as jest.Mock).mockImplementationOnce(() => {
            throw new Error('File not found');
        });
        await expect(readAssetsManifest(['vendor', 'main'])).rejects.toThrowError();
    });

    it('should return js and css assets', async () => {
        type ReadFileCallback = (error: Error | null, data: string) => void;

        (readFile as unknown as jest.Mock).mockImplementationOnce(
            (path: string, options: string, done: ReadFileCallback) =>
                done(
                    null,
                    JSON.stringify({
                        vendor: {
                            js: 'vendor.js',
                            css: 'vendor.css',
                        },
                        main: {
                            js: ['main1.js', 'main2.js'],
                            css: 'main.css',
                        },
                    }),
                ),
        );

        const result = await readAssetsManifest(['vendor', 'main']);

        expect(result).toEqual({
            js: ['vendor.js', 'main1.js', 'main2.js'],
            css: ['vendor.css', 'main.css'],
        });
    });
});
