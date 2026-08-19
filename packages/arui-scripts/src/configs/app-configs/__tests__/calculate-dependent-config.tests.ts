import fs from 'fs';

import { resolveNodeModuleRelativeTo } from '../../util/resolve';
import { calculateDependentConfig, calculateDependentContext } from '../calculate-dependent-config';
import { type AppConfigs, type AppContext } from '../types';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(),
    statSync: jest.fn(),
}));

jest.mock('../../util/resolve', () => ({
    resolveNodeModuleRelativeTo: jest.fn(() => '/project/node_modules/@babel/runtime/package.json'),
}));

describe('calculateDependentConfig', () => {
    it('should normalize string polyfills entry to an array', () => {
        const config = {
            clientPolyfillsEntry: './polyfills.ts',
        } as unknown as AppConfigs;

        expect(calculateDependentConfig(config).clientPolyfillsEntry).toEqual(['./polyfills.ts']);
    });

    it('should keep empty polyfills as an empty array', () => {
        const config = {
            clientPolyfillsEntry: null,
        } as unknown as AppConfigs;

        expect(calculateDependentConfig(config).clientPolyfillsEntry).toEqual([]);
    });
});

describe('calculateDependentContext', () => {
    const mockedReadFileSync = fs.readFileSync as unknown as jest.Mock;
    const mockedStatSync = fs.statSync as unknown as jest.Mock;
    const mockedResolve = resolveNodeModuleRelativeTo as unknown as jest.Mock;

    beforeEach(() => {
        mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '7.23.0' }));
        mockedStatSync.mockImplementation((filePath: string) => ({
            isFile: () => filePath.endsWith('.dict'),
        }));
        mockedResolve.mockReturnValue('/project/node_modules/@babel/runtime/package.json');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should derive output paths and split dictionary paths by file/dir', () => {
        const config = {
            assetsPath: 'assets',
            buildPath: '.build',
            statsOutputFilename: 'stats.json',
            dictionaryCompression: {
                dictionaryPath: ['dicts/app.dict', '/abs/prev-version', 'relative/dir'],
            },
        } as unknown as AppConfigs;
        const context = {
            cwd: '/project',
        } as unknown as AppContext;

        const result = calculateDependentContext(config, context);

        expect(result.publicPath).toBe('assets/');
        expect(result.serverOutputPath).toBe('/project/.build');
        expect(result.clientOutputPath).toBe('/project/.build/assets');
        expect(result.statsOutputPath).toBe('/project/.build/stats.json');
        expect(result.watchIgnorePath).toEqual(['node_modules', '.build']);
        expect(result.babelRuntimeVersion).toBe('7.23.0');
        expect(result.compressionPredefinedDictionaryPath).toEqual([
            expect.stringMatching(/dicts\/app\.dict$/),
        ]);
        expect(result.compressionPreviousVersionPath).toEqual([
            '/abs/prev-version',
            expect.stringMatching(/relative\/dir$/),
        ]);
    });

    it('should fall back to installed @babel/runtime version when project copy is missing', () => {
        mockedResolve.mockImplementation(() => {
            throw new Error('not found');
        });

        const config = {
            assetsPath: 'assets',
            buildPath: '.build',
            statsOutputFilename: 'stats.json',
            dictionaryCompression: {
                dictionaryPath: [],
            },
        } as unknown as AppConfigs;
        const context = {
            cwd: '/project',
        } as unknown as AppContext;

        const result = calculateDependentContext(config, context);

        expect(result.babelRuntimeVersion).toEqual(expect.stringMatching(/^\d+\./));
    });
});
