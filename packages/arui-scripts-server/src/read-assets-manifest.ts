import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { type AruiAppManifest } from '@alfalab/scripts-modules';

const readFile = promisify(fs.readFile);

const DEFAULT_BUNDLE_NAMES = ['vendor', 'internalVendor', 'main'];

let appManifest: AruiAppManifest;

export async function getAppManifest() {
    if (!appManifest) {
        const manifestPath = path.join(process.cwd(), '.build/webpack-assets.json');
        const fileContent = await readFile(manifestPath, 'utf8');

        appManifest = JSON.parse(fileContent) as AruiAppManifest;
    }

    return appManifest;
}

export async function readAssetsManifest(bundleNames: string[] = DEFAULT_BUNDLE_NAMES) {
    const manifest = await getAppManifest();
    let jsArray: string[] = [];
    let cssArray: string[] = [];

    for (const key of bundleNames) {
        if (!manifest[key]) continue;

        const { js, css } = manifest[key];

        if (js) jsArray = jsArray.concat(js);
        if (css) cssArray = cssArray.concat(css);
    }

    return {
        js: jsArray,
        css: cssArray,
    };
}
