import { type PackageSettings } from './types';

type ConfigFileModule = PackageSettings & {
    __esModule?: boolean;
    default?: PackageSettings;
};

/**
 * Конфигурация подключается через require: заранее неизвестны ни путь до файла,
 * ни язык, на котором он написан. ts-node отдаёт es-модули, из них настройки
 * нужно достать из default
 */
export function requireConfigFile(configPath: string): PackageSettings {
    // eslint-disable-next-line import-x/no-dynamic-require -- путь до конфигурации известен только в рантайме
    const settings = require(configPath) as ConfigFileModule;

    // eslint-disable-next-line no-underscore-dangle -- поле добавляет транспайлер
    return settings.__esModule ? (settings.default ?? {}) : settings;
}
