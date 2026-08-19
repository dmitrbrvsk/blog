import path from 'path';

import { tryResolve } from '../../util/resolve';
import { getConfigFilePath, readConfigFile } from '../read-config-file';

jest.mock('../../util/resolve', () => ({
    tryResolve: jest.fn(),
}));

const mockedTryResolve = tryResolve as unknown as jest.Mock;

describe('getConfigFilePath', () => {
    it('should resolve arui-scripts.config relative to cwd', () => {
        mockedTryResolve.mockReturnValue('/project/arui-scripts.config.ts');

        expect(getConfigFilePath('/project')).toBe('/project/arui-scripts.config.ts');
        expect(mockedTryResolve).toHaveBeenCalledWith(
            path.join('/project', '/arui-scripts.config'),
        );
    });
});

describe('readConfigFile', () => {
    beforeEach(() => {
        jest.resetModules();
        mockedTryResolve.mockReset();
    });

    it('should return null when config file is not found', () => {
        mockedTryResolve.mockReturnValue(undefined);

        expect(readConfigFile('/project')).toBeNull();
    });

    it('should unwrap default export from es modules', () => {
        mockedTryResolve.mockReturnValue('virtual-arui-scripts-config');
        jest.doMock(
            'virtual-arui-scripts-config',
            () => ({
                __esModule: true,
                default: { serverPort: 4000 },
            }),
            { virtual: true },
        );

        expect(readConfigFile('/project')).toEqual({ serverPort: 4000 });
    });
});
