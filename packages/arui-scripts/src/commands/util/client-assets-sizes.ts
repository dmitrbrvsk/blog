import { type Stats } from '@rspack/core';
import chalk from 'chalk';
import filesize from 'filesize';
import path from 'node:path';

import { configs } from '../../configs/app-configs';

function removeFileNameHash(fileName: string) {
    const parts = fileName.replaceAll('\\', '/').split('.');

    const id = parts[0];
    const isChunk = fileName.includes('.chunk.');
    const extension = parts.find((p) => ['js', 'css'].includes(p));

    return `${id}${isChunk ? '.chunk' : ''}.${extension}`;
}

type AssetSize = {
    size?: number;
    gzipSize?: number;
    brSize?: number;
    dcbSize?: number;
};

export function printAssetsSizes(webpackStats: Stats) {
    const assetsStats = webpackStats.toJson({ all: false, assets: true }).assets || [];
    const assetsMap: Record<string, AssetSize> = {};
    const statExtensions = new Set(['js', 'css', 'br', 'gz', 'dcb']);

    for (const asset of assetsStats) {
        if (asset.type !== 'asset') {
            continue;
        }

        const extension = path.parse(asset.name).ext.slice(1);

        if (!statExtensions.has(extension) || asset.name.endsWith('.dict.br')) {
            continue;
        }

        const assetName = removeFileNameHash(asset.name);

        if (!assetsMap[assetName]) {
            assetsMap[assetName] = {};
        }

        if (extension === 'js' || extension === 'css') {
            assetsMap[assetName].size = asset.size;
        }

        if (extension === 'br') {
            assetsMap[assetName].brSize = asset.size;
        }

        if (extension === 'gz') {
            assetsMap[assetName].gzipSize = asset.size;
        }

        if (extension === 'dcb') {
            assetsMap[assetName].dcbSize = asset.size;
        }
    }

    const totalSizes = {
        size: 0,
        gzipSize: 0,
        brSize: 0,
        dcbSize: 0,
    };

    console.log(chalk.blueBright('Assets sizes:'));

    for (const assetName of Object.keys(assetsMap)) {
        const asset = assetsMap[assetName];
        const size = asset.size || 0;
        const gzipSize = asset.brSize || size;
        const brSize = asset.brSize || gzipSize;
        const dcbSize = asset.dcbSize || brSize;

        totalSizes.size += size;
        totalSizes.gzipSize += gzipSize;
        totalSizes.brSize += brSize;
        totalSizes.dcbSize += dcbSize;

        console.log(
            `  ${filesize(size)} (${filesize(gzipSize)} gzip, ${filesize(brSize)} br${
                configs.dictionaryCompression.dictionaryPath.length > 0
                    ? `, ${filesize(dcbSize)} dcb`
                    : ''
            }) ${chalk.cyan(assetName)}`,
        );
    }

    console.log(
        `${chalk.blueBright('\nTotal size:\n')}  ${filesize(totalSizes.size)} (${filesize(
            totalSizes.gzipSize,
        )} gzip, ${filesize(totalSizes.brSize)} br${
            configs.dictionaryCompression.dictionaryPath.length > 0
                ? `, ${filesize(totalSizes.dcbSize)} dcb`
                : ''
        })\n`,
    );
}
