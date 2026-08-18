// TODO: remove eslint-disable-next-line
import merge from 'lodash.merge';

import { tryResolve } from '../util/resolve';

import { requireConfigFile } from './require-config-file';
import { type AppConfigs, type AppContext } from './types';
import { validateSettingsKeys } from './validate-settings-keys';

export function updateWithPresets(config: AppConfigs, context: AppContext) {
    if (!config.presets) {
        return config;
    }

    const presetsConfigPath = getPresetsConfigPath(config, context.cwd);
    const presetsOverridesPath = tryResolve(`${config.presets}/arui-scripts.overrides`, {
        paths: [context.cwd],
    });

    if (presetsConfigPath) {
        const presetsSettings = requireConfigFile(presetsConfigPath);

        validateSettingsKeys(config, presetsSettings, presetsConfigPath);
        // eslint-disable-next-line no-param-reassign
        config = merge(config, presetsSettings);
    }
    if (presetsOverridesPath) {
        context.overridesPath.unshift(presetsOverridesPath);
    }

    return config;
}

export function getPresetsConfigPath(config: AppConfigs, cwd: string) {
    return tryResolve(`${config.presets}/arui-scripts.config`, {
        paths: [cwd],
    });
}
