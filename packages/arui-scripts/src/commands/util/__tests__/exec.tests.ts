import shell from 'shelljs';

import { exec } from '../exec';

jest.mock('shelljs', () => ({
    exec: jest.fn(),
}));

const mockedExec = shell.exec as unknown as jest.Mock;

describe('exec', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        mockedExec.mockReset();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should resolve when command exits with 0', async () => {
        mockedExec.mockImplementation((_command: string, callback: (code: number) => void) => {
            callback(0);
        });

        await expect(exec('echo ok')).resolves.toBe(0);
        expect(mockedExec).toHaveBeenCalledWith('echo ok', expect.any(Function));
    });

    it('should reject when command exits with non-zero code', async () => {
        mockedExec.mockImplementation((_command: string, callback: (code: number) => void) => {
            callback(1);
        });

        await expect(exec('false')).rejects.toBe(1);
    });
});
