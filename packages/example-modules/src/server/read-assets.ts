import fs from 'node:fs';
import path from 'node:path';

type AssetsManifest = Record<string, { js?: string; css?: string } | undefined>;

export function readAssetsManifest() {
    const manifestPath = path.join(process.cwd(), '.build/webpack-assets.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as AssetsManifest;
    const js: string[] = [];
    const css: string[] = [];

    for (const key of ['vendor', 'main']) {
        const entry = manifest[key];

        if (!entry) {
            continue;
        }
        if (entry.js) {
            js.push(entry.js.replace(/^auto/, 'assets'));
        }
        if (entry.css) {
            css.push(entry.css.replace(/^auto/, 'assets'));
        }
    }

    return {
        js,
        css,
    };
}
