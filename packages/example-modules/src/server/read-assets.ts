import fs from 'node:fs';
import path from 'node:path';

export function readAssetsManifest() {
    const manifestPath = path.join(process.cwd(), '.build/webpack-assets.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const js: string[] = [];
    const css: string[] = [];

    for (const key of ['vendor', 'main']) {
        if (!manifest[key]) {
            continue;
        }
        if (manifest[key].js) {
            js.push(manifest[key].js.replace(/^auto/, 'assets'));
        }
        if (manifest[key].css) {
            css.push(manifest[key].css.replace(/^auto/, 'assets'));
        }
    }

    return {
        js,
        css,
    };
}
