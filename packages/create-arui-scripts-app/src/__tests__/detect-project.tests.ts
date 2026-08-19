import os from 'os';
import path from 'path';

import fs from 'fs-extra';

import { detectProject, parseAruiScriptsVersion } from '../detect-project';
import { runInit } from '../run';

describe('parseAruiScriptsVersion', () => {
    it('снимает префикс диапазона', () => {
        expect(parseAruiScriptsVersion('^23.5.1', '1.0.0')).toBe('23.5.1');
        expect(parseAruiScriptsVersion('~23.0.0', '1.0.0')).toBe('23.0.0');
        expect(parseAruiScriptsVersion(undefined, '23.0.1')).toBe('23.0.1');
    });
});

describe('detectProject', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-arui-detect-'));
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    it('падает без package.json', async () => {
        await expect(detectProject(tempDir, '23.0.1')).rejects.toThrow(/package\.json/);
    });

    it('читает ответы из сгенерированного проекта', async () => {
        await runInit({
            cwd: tempDir,
            targetDirArg: 'app',
            flags: {
                yes: true,
                clientOnly: true,
                useRtk: true,
                useRouter: true,
                useLint: true,
                e2eFramework: 'playwright',
                testRunner: 'vitest',
                dockerRegistry: 'reg.example',
            },
            aruiScriptsVersion: '23.0.1',
        });

        const target = path.join(tempDir, 'app');
        const detected = await detectProject(target, '1.0.0');

        expect(detected.aruiScriptsVersion).toBe('23.0.1');
        expect(detected.answers).toMatchObject({
            name: 'app',
            clientOnly: true,
            useRtk: true,
            useRouter: true,
            useLint: true,
            e2eFramework: 'playwright',
            testRunner: 'vitest',
            dockerRegistry: 'reg.example',
            dualEntries: false,
        });
    });

    it('определяет dualEntries по desktop/mobile точкам входа', async () => {
        await runInit({
            cwd: tempDir,
            targetDirArg: 'app',
            flags: { yes: true, dualEntries: true },
            aruiScriptsVersion: '23.0.1',
        });

        const detected = await detectProject(path.join(tempDir, 'app'), '1.0.0');

        expect(detected.answers.dualEntries).toBe(true);
        expect(detected.answers.clientOnly).toBe(false);
    });
});
