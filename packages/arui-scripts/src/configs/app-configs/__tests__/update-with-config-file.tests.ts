import { readConfigFile } from '../read-config-file';
import { type AppConfigs, type AppContext } from '../types';
import { updateWithConfigFile } from '../update-with-config-file';

jest.mock('../read-config-file', () => ({
    readConfigFile: jest.fn(),
}));

const mockedReadConfigFile = readConfigFile as unknown as jest.Mock;

describe('updateWithConfigFile', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        mockedReadConfigFile.mockReset();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return original config when config file is missing', () => {
        mockedReadConfigFile.mockReturnValue(null);
        const config = { serverPort: 3000 } as AppConfigs;
        const context = { cwd: '/project' } as AppContext;

        expect(updateWithConfigFile(config, context)).toBe(config);
    });

    it('should merge settings from config file', () => {
        mockedReadConfigFile.mockReturnValue({ serverPort: 4000 });
        const config = { serverPort: 3000, clientOnly: false } as AppConfigs;
        const context = { cwd: '/project' } as AppContext;

        expect(updateWithConfigFile(config, context)).toEqual({
            serverPort: 4000,
            clientOnly: false,
        });
    });
});
