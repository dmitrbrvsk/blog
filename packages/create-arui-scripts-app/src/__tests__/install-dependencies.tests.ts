import { EventEmitter } from 'events';

import { jest } from '@jest/globals';

import {
    createInitialCommit,
    initGitRepository,
    INITIAL_COMMIT_MESSAGE,
    installDependencies,
    installLefthook,
    type SpawnFn,
} from '../install-dependencies.js';

function fakeChild(exitCode: number): ReturnType<SpawnFn> {
    const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
    };

    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    setImmediate(() => {
        child.stderr.emit('data', Buffer.from('some output'));
        child.emit('close', exitCode);
    });

    return child as unknown as ReturnType<SpawnFn>;
}

const spawnMock = jest.fn(() => fakeChild(0));
const spawnOptions = { spawn: spawnMock as SpawnFn };

const originalPlatform = process.platform;

function setPlatform(platform: string) {
    Object.defineProperty(process, 'platform', { value: platform });
}

describe('installDependencies', () => {
    afterEach(() => {
        setPlatform(originalPlatform);
        spawnMock.mockReset();
    });

    it('на windows запускает пакетный менеджер через shell (yarn/npm — это .cmd)', async () => {
        setPlatform('win32');
        spawnMock.mockImplementation(() => fakeChild(0));

        await installDependencies('/target', 'yarn', spawnOptions);

        expect(spawnMock).toHaveBeenCalledWith(
            'yarn',
            [],
            expect.objectContaining({ cwd: '/target', shell: true }),
        );
    });

    it('на остальных платформах не использует shell', async () => {
        setPlatform('linux');
        spawnMock.mockImplementation(() => fakeChild(0));

        await installDependencies('/target', 'npm', spawnOptions);

        expect(spawnMock).toHaveBeenCalledWith(
            'npm',
            ['install'],
            expect.objectContaining({ shell: false }),
        );
    });

    it('при ненулевом коде выхода реджектится с выводом процесса', async () => {
        setPlatform('linux');
        spawnMock.mockImplementation(() => fakeChild(1));

        await expect(installDependencies('/target', 'npm', spawnOptions)).rejects.toThrow(
            /кодом 1[\s\S]*some output/,
        );
    });

    it('installLefthook вызывает npx --no-install lefthook install', async () => {
        setPlatform('linux');
        spawnMock.mockImplementation(() => fakeChild(0));

        await installLefthook('/target', spawnOptions);

        expect(spawnMock).toHaveBeenCalledWith(
            'npx',
            ['--no-install', 'lefthook', 'install'],
            expect.objectContaining({ cwd: '/target', shell: false }),
        );
    });

    it('initGitRepository вызывает git init', async () => {
        setPlatform('linux');
        spawnMock.mockImplementation(() => fakeChild(0));

        await initGitRepository('/target', spawnOptions);

        expect(spawnMock).toHaveBeenCalledWith(
            'git',
            ['init'],
            expect.objectContaining({ cwd: '/target', shell: false }),
        );
    });

    it('createInitialCommit делает git add и commit', async () => {
        setPlatform('linux');
        spawnMock.mockImplementation(() => fakeChild(0));

        await createInitialCommit('/target', spawnOptions);

        expect(spawnMock).toHaveBeenNthCalledWith(
            1,
            'git',
            ['add', '-A'],
            expect.objectContaining({ cwd: '/target' }),
        );
        expect(spawnMock).toHaveBeenNthCalledWith(
            2,
            'git',
            expect.arrayContaining(['commit', '--no-verify', '-m', INITIAL_COMMIT_MESSAGE]),
            expect.objectContaining({ cwd: '/target' }),
        );
    });
});
