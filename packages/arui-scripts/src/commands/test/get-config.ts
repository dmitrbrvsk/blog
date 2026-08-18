import { replaceRootDirInPath } from 'jest-config';
import Resolver from 'jest-resolve';
import merge from 'lodash.merge';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { configs } from '../../configs/app-configs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- дефолтные настройки jest написаны на js и не типизированы
// @ts-ignore
import defaultJestConfig from '../../configs/jest/settings';

const PRESET_EXTENSIONS = ['.json', '.js', '.cjs', '.mjs'];
const PRESET_NAME = 'jest-preset';

type JestConfig = Record<string, unknown> & { preset?: string };

export const getJestConfig = async () => {
    const { preset, ...appJestConfig } = await getAppJestConfig();

    let presetConfig = {};

    if (preset) {
        presetConfig = await getPresetConfig(preset);
    }

    return merge(defaultJestConfig, presetConfig, appJestConfig);
};

async function getAppJestConfig(): Promise<JestConfig> {
    const jestConfigPath = path.resolve(process.cwd(), 'jest.config.js');

    if (fs.existsSync(jestConfigPath)) {
        return await importJestConfig(pathToFileURL(jestConfigPath).href);
    }

    if (configs.appPackage.jest) {
        return configs.appPackage.jest;
    }

    return {};
}

// Путь до конфигурации известен только в рантайме, поэтому типов у импорта нет
async function importJestConfig(href: string): Promise<JestConfig> {
    const module = (await import(href)) as { default: JestConfig };

    return module.default;
}

async function getPresetConfig(presetPath?: string): Promise<JestConfig> {
    if (!presetPath) {
        return {};
    }
    const rootDir = process.cwd();

    const normalizedPresetPath = replaceRootDirInPath(rootDir, presetPath);
    const presetModule = Resolver.findNodeModule(
        normalizedPresetPath.startsWith('.')
            ? normalizedPresetPath
            : path.join(normalizedPresetPath, PRESET_NAME),
        {
            basedir: rootDir,
            extensions: PRESET_EXTENSIONS,
        },
    );

    if (!presetModule) {
        throw new Error(`Cannot find module '${normalizedPresetPath}'`);
    }

    const { preset: subPreset, ...preset } = await importJestConfig(
        pathToFileURL(presetModule).href,
    );

    if (subPreset) {
        console.warn(`Jest can't handle preset chaining. Preset "${subPreset}" will be ignored.`);
    }

    return preset;
}
