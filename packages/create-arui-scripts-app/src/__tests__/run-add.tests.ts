import os from 'os';
import path from 'path';

import fs from 'fs-extra';

import { type CliFlags } from '../defaults.js';
import { mergeGitignore, mergePackageJson } from '../merge-generated-files.js';
import { runInit } from '../run.js';
import { runAdd } from '../run-add.js';

describe('mergePackageJson', () => {
    it('добавляет новые скрипты и зависимости, не затирая пользовательские', () => {
        const existing = JSON.stringify(
            {
                name: 'app',
                scripts: { start: 'arui-scripts start', custom: 'echo hi' },
                dependencies: { react: '18.0.0' },
                devDependencies: { typescript: '5.0.0' },
            },
            null,
            4,
        );
        const generated = JSON.stringify(
            {
                name: 'app',
                scripts: { start: 'arui-scripts start', lint: 'arui-presets-lint scripts' },
                dependencies: { react: '^19.0.0', 'react-redux': '^9.2.0' },
                devDependencies: { typescript: '^6.0.0', 'arui-presets-lint': '^11.0.0' },
                prettier: 'arui-presets-lint/prettier',
            },
            null,
            4,
        );
        const merged = JSON.parse(mergePackageJson(`${existing}\n`, `${generated}\n`)) as {
            scripts: Record<string, string>;
            dependencies: Record<string, string>;
            devDependencies: Record<string, string>;
            prettier: string;
        };

        expect(merged.scripts.custom).toBe('echo hi');
        expect(merged.scripts.lint).toBe('arui-presets-lint scripts');
        expect(merged.dependencies.react).toBe('18.0.0');
        expect(merged.dependencies['react-redux']).toBe('^9.2.0');
        expect(merged.devDependencies.typescript).toBe('5.0.0');
        expect(merged.devDependencies['arui-presets-lint']).toBe('^11.0.0');
        expect(merged.prettier).toBe('arui-presets-lint/prettier');
    });
});

describe('mergeGitignore', () => {
    it('дописывает недостающие строки', () => {
        const merged = mergeGitignore(
            'node_modules\n.build\n',
            'node_modules\nplaywright-report/\n',
        );

        expect(merged).toContain('node_modules');
        expect(merged).toContain('.build');
        expect(merged).toContain('playwright-report/');
    });
});

describe('runAdd', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'create-arui-add-'));
    });

    afterEach(async () => {
        await fs.remove(tempDir);
    });

    async function scaffold(overrides: CliFlags = {}) {
        const target = path.join(tempDir, 'app');

        await runInit({
            cwd: tempDir,
            targetDirArg: 'app',
            flags: { yes: true, ...overrides },
            aruiScriptsVersion: '23.0.1',
        });

        return target;
    }

    it('add lint создаёт конфиги и scripts', async () => {
        const target = await scaffold();

        await runAdd({ feature: 'lint', cwd: target, flags: { yes: true } });

        expect(await fs.pathExists(path.join(target, 'eslint.config.mts'))).toBe(true);
        expect(await fs.pathExists(path.join(target, 'lefthook.yml'))).toBe(true);

        const pkg = await fs.readJson(path.join(target, 'package.json'));

        expect(pkg.scripts.lint).toContain('yarn lint:scripts');
        expect(pkg.devDependencies).toHaveProperty('arui-presets-lint');
    });

    it('add e2e playwright создаёт конфиг и не дублирует при повторном вызове', async () => {
        const target = await scaffold();

        await runAdd({
            feature: 'e2e',
            cwd: target,
            flags: { yes: true, e2eFramework: 'playwright' },
        });

        expect(await fs.pathExists(path.join(target, 'playwright.config.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(target, 'e2e/example.spec.ts'))).toBe(true);

        await expect(
            runAdd({
                feature: 'e2e',
                cwd: target,
                flags: { yes: true, e2eFramework: 'playwright' },
            }),
        ).rejects.toThrow(/уже подключен/);
    });

    it('add router и add rtk дополняют приложение', async () => {
        const target = await scaffold();

        await runAdd({ feature: 'router', cwd: target, flags: { yes: true } });
        await runAdd({ feature: 'rtk', cwd: target, flags: { yes: true } });

        expect(await fs.pathExists(path.join(target, 'src/client/routes.tsx'))).toBe(true);
        expect(await fs.pathExists(path.join(target, 'src/client/store/index.ts'))).toBe(true);

        const app = await fs.readFile(path.join(target, 'src/client/components/app.tsx'), 'utf8');
        const entry = await fs.readFile(path.join(target, 'src/client/index.tsx'), 'utf8');

        expect(app).toContain('AppRoutes');
        expect(entry).toContain('Provider');
        expect(entry).toContain('BrowserRouter');
    });

    it('add docker пишет registry и скрипт docker-build', async () => {
        const target = await scaffold();

        await runAdd({
            feature: 'docker',
            cwd: target,
            flags: { yes: true, dockerRegistry: 'registry.example.com' },
        });

        const config = await fs.readFile(path.join(target, 'arui-scripts.config.ts'), 'utf8');
        const pkg = await fs.readJson(path.join(target, 'package.json'));

        expect(config).toContain("dockerRegistry: 'registry.example.com'");
        expect(pkg.scripts['docker-build']).toBe('arui-scripts docker-build');
    });

    it('add docker без registry падает', async () => {
        const target = await scaffold();

        await expect(
            runAdd({ feature: 'docker', cwd: target, flags: { yes: true } }),
        ).rejects.toThrow(/docker-registry/);
    });

    it('неизвестная фича падает', async () => {
        const target = await scaffold();

        await expect(
            runAdd({ feature: 'storybook', cwd: target, flags: { yes: true } }),
        ).rejects.toThrow(/Неизвестная фича/);
    });

    it('пропускает изменённый шаблон без --force', async () => {
        const target = await scaffold();
        const appPath = path.join(target, 'src/client/components/app.tsx');

        await fs.writeFile(appPath, '// custom app\n');

        await runAdd({ feature: 'rtk', cwd: target, flags: { yes: true } });

        expect(await fs.readFile(appPath, 'utf8')).toBe('// custom app\n');
        expect(await fs.pathExists(path.join(target, 'src/client/store/index.ts'))).toBe(true);
    });

    it('add --dry-run не пишет файлы', async () => {
        const target = await scaffold();

        await runAdd({ feature: 'lint', cwd: target, flags: { yes: true, dryRun: true } });

        expect(await fs.pathExists(path.join(target, 'eslint.config.mts'))).toBe(false);
    });
});
