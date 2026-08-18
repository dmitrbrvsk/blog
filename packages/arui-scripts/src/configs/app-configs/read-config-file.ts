import path from 'node:path';

import { tryResolve } from '../util/resolve';

import { requireConfigFile } from './require-config-file';
import { type PackageSettings } from './types';

export function readConfigFile(cwd: string): PackageSettings | null {
    const appConfigPath = getConfigFilePath(cwd);

    if (!appConfigPath) {
        return null;
    }

    return requireConfigFile(appConfigPath);
}

export function getConfigFilePath(cwd: string) {
    return tryResolve(path.join(cwd, '/arui-scripts.config'));
}
