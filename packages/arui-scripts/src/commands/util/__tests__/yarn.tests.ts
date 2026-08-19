import fs from 'fs';

import shell from 'shelljs';

import { configs } from '../../../configs/app-configs';
import {
    getInstallProductionCommand,
    getPruningCommand,
    getYarnBinSymlinkCommand,
    getYarnPathFromRc,
    getYarnVersion,
} from '../yarn';

jest.mock('../../../configs/app-configs', () => ({
    configs: {
        useYarn: true,
        clientOnly: false,
        cwd: '/project',
    },
}));

jest.mock('shelljs', () => ({
    which: jest.fn(),
    exec: jest.fn(),
    test: jest.fn(),
}));

jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));

const mockedWhich = shell.which as unknown as jest.Mock;
const mockedExec = shell.exec as unknown as jest.Mock;
const mockedTest = shell.test as unknown as jest.Mock;
const mockedReadFileSync = fs.readFileSync as unknown as jest.Mock;

describe('yarn helpers', () => {
    beforeEach(() => {
        configs.useYarn = true;
        configs.clientOnly = false;
        mockedWhich.mockReturnValue('/usr/bin/yarn');
        mockedExec.mockReturnValue('1.22.19');
        mockedTest.mockReturnValue(false);
        mockedReadFileSync.mockReset();
    });

    describe('getYarnVersion', () => {
        it('should return 1 for classic yarn', () => {
            expect(getYarnVersion()).toBe('1');
        });

        it('should return 2+ for berry yarn', () => {
            mockedExec.mockReturnValue('4.13.0');

            expect(getYarnVersion()).toBe('2+');
        });

        it('should return unavailable when yarn is not used', () => {
            configs.useYarn = false;

            expect(getYarnVersion()).toBe('unavailable');
        });
    });

    describe('getPruningCommand', () => {
        it('should skip pruning in client only mode', () => {
            configs.clientOnly = true;

            expect(getPruningCommand()).toContain('Skipping pruning');
        });

        it('should use yarn workspaces focus for berry', () => {
            mockedExec.mockReturnValue('4.13.0');

            expect(getPruningCommand()).toBe('yarn workspaces focus --production --all');
        });

        it('should use npm prune when yarn is unavailable', () => {
            configs.useYarn = false;

            expect(getPruningCommand()).toBe('npm prune --production');
        });
    });

    describe('getInstallProductionCommand', () => {
        it('should return classic yarn install command', () => {
            expect(getInstallProductionCommand()).toContain('yarn install --production');
        });

        it('should return npm install when yarn is unavailable', () => {
            configs.useYarn = false;

            expect(getInstallProductionCommand()).toBe('npm install --production');
        });
    });

    describe('getYarnPathFromRc', () => {
        it('should return null when .yarnrc.yml is missing', () => {
            mockedTest.mockReturnValue(false);

            expect(getYarnPathFromRc()).toBeNull();
        });

        it('should parse yarnPath from .yarnrc.yml', () => {
            mockedTest.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue(
                'nodeLinker: node-modules\nyarnPath: .yarn/releases/yarn-4.18.0.cjs\n',
            );

            expect(getYarnPathFromRc()).toBe('.yarn/releases/yarn-4.18.0.cjs');
        });
    });

    describe('getYarnBinSymlinkCommand', () => {
        it('should return symlink command for berry with yarnPath', () => {
            mockedExec.mockReturnValue('4.13.0');
            mockedTest.mockReturnValue(true);
            mockedReadFileSync.mockReturnValue("yarnPath: '.yarn/releases/yarn-4.18.0.cjs'\n");

            expect(getYarnBinSymlinkCommand()).toContain(
                'ln -sf /src/.yarn/releases/yarn-4.18.0.cjs /usr/local/bin/yarn',
            );
        });

        it('should return empty string for classic yarn', () => {
            expect(getYarnBinSymlinkCommand()).toBe('');
        });
    });
});
