import { validateSettingsKeys } from '../validate-settings-keys';

describe('validate-settings-keys', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should warn with console.warn if object contains unknown properties', () => {
        const objectWithSettings = {
            name: 'vasia',
            country: 'russia',
        };
        const baseSettings = {
            name: 'ivan',
        };

        validateSettingsKeys(baseSettings, objectWithSettings);

        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Неизвестная настройка "country"'),
        );
    });

    it('should include custom source in the warning message', () => {
        validateSettingsKeys({ name: 'ivan' }, { unknown: true }, 'package.json');

        expect(console.warn).toHaveBeenCalledWith('Неизвестная настройка "unknown" в package.json');
    });

    it('should not warn when all keys exist in the base config', () => {
        validateSettingsKeys({ name: 'ivan', country: 'russia' }, { name: 'vasia' });

        expect(console.warn).not.toHaveBeenCalled();
    });
});
