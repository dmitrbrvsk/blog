import { type Assets } from 'assets-webpack-plugin';
import path from 'node:path';

import { configs } from './app-configs';
import { MODULES_ENTRY_NAME } from './modules';

export function processAssetsPluginOutput(assets: Assets) {
    const adjustedAssets = assets;

    for (const key of Object.keys(adjustedAssets)) {
        // заменяем путь к файлам на корректный в случае если в нем есть 'auto/'
        adjustedAssets[key] = {
            css: replaceAutoPath(adjustedAssets[key].css) as string,
            js: replaceAutoPath(adjustedAssets[key].js) as string,
        };
    }

    // добавляем в манифест js-файлы для модулей
    for (const moduleName of Object.keys(configs.modules?.exposes || {})) {
        if (configs.compatModules?.exposes?.[moduleName]) {
            throw new Error(
                `Модуль ${moduleName} определен как module и как compat. Поменяйте название одного из модулей или удалите его`,
            );
        }
        adjustedAssets[moduleName] = {
            mode: 'default',
            js: path.join(configs.publicPath, MODULES_ENTRY_NAME),
        };
    }

    const result = {
        ...adjustedAssets,
        __metadata__: {
            version: configs.version,
            name: configs.normalizedName,
        },
    };

    return JSON.stringify(result);
}

function replaceAutoPath(assets: string | string[] | undefined) {
    if (!assets) {
        return assets;
    }
    if (Array.isArray(assets)) {
        return assets.map((asset) => asset.replace(/^auto\//, configs.publicPath));
    }

    return assets.replace(/^auto\//, configs.publicPath);
}
