/**
 * Функция проверяет что все ключи объекта settingsObject есть в уже существующей конфигурации
 */
export function validateSettingsKeys(
    existingConfig: Record<string, unknown>,
    settingsObject: Record<string, unknown>,
    source?: string,
) {
    for (const setting of Object.keys(settingsObject)) {
        if (existingConfig[setting] === undefined) {
            console.warn(`Неизвестная настройка "${setting}" в ${source || 'конфигурации'}`);
        }
    }
}
