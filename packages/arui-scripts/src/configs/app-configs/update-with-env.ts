import merge from 'lodash.merge';

import { type AppConfigs, type PackageSettings } from './types';
import { validateSettingsKeys } from './validate-settings-keys';

export function updateWithEnv(config: AppConfigs) {
    if (!process.env.ARUI_SCRIPTS_CONFIG) {
        return config;
    }

    try {
        console.warn('Используйте ARUI_SCRIPTS_CONFIG только для отладки');
        const envSettings = JSON.parse(process.env.ARUI_SCRIPTS_CONFIG) as PackageSettings;

        validateSettingsKeys(config, envSettings, 'ENV');

        return merge(config, envSettings);
    } catch (e) {
        console.error(e);
        throw new Error(
            'Not valid JSON passed. Correct it. For example: ARUI_SCRIPTS_CONFIG="{"serverPort":3333}"',
        );
    }
}
