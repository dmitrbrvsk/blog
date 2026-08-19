import path from 'path';

import fs from 'fs-extra';

import { clientBaseDir } from './build-file-map.js';
import { defaultAnswers } from './defaults.js';
import { type CodeLoader, type E2eFramework, type InitAnswers, type TestRunner } from './types.js';

export type DetectedProject = {
    answers: InitAnswers;
    aruiScriptsVersion: string;
};

function configPath(targetDir: string): string {
    return path.join(targetDir, 'arui-scripts.config.ts');
}

function pkgPath(targetDir: string): string {
    return path.join(targetDir, 'package.json');
}

async function exists(targetDir: string, relPath: string): Promise<boolean> {
    return fs.pathExists(path.join(targetDir, relPath));
}

function extractString(config: string, key: string): string | undefined {
    const match = config.match(new RegExp(`${key}:\\s*'((?:\\\\'|[^'])*)'`));

    return match ? match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\') : undefined;
}

function extractNumber(config: string, key: string): number | undefined {
    const match = config.match(new RegExp(`${key}:\\s*(\\d+)`));

    return match ? Number(match[1]) : undefined;
}

function stripVersionRange(value: string): string {
    return value.replace(/^[\^~>=<\s]+/, '').split(/\s+/)[0];
}

export function parseAruiScriptsVersion(dep: string | undefined, fallback: string): string {
    if (!dep) {
        return fallback;
    }

    const parsed = stripVersionRange(dep);

    return parsed || fallback;
}

export async function detectProject(
    targetDir: string,
    fallbackAruiScriptsVersion: string,
): Promise<DetectedProject> {
    if (!(await fs.pathExists(pkgPath(targetDir)))) {
        throw new Error(
            `В ${targetDir} нет package.json. Запустите команду в корне проекта arui-scripts.`,
        );
    }

    if (!(await fs.pathExists(configPath(targetDir)))) {
        throw new Error(
            `В ${targetDir} нет arui-scripts.config.ts. Команда add работает только с проектами, созданными через create-arui-scripts-app.`,
        );
    }

    const pkg = (await fs.readJson(pkgPath(targetDir))) as {
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    const config = await fs.readFile(configPath(targetDir), 'utf8');
    const name = typeof pkg.name === 'string' && pkg.name.trim() ? pkg.name.trim() : 'app';
    const answers = defaultAnswers(name);

    answers.clientOnly =
        /clientOnly:\s*true/.test(config) ||
        ((await exists(targetDir, 'src/index.tsx')) &&
            !(await exists(targetDir, 'src/client/index.tsx')));

    answers.dualEntries =
        (await exists(targetDir, 'src/desktop/index.tsx')) ||
        (await exists(targetDir, 'src/client/desktop/index.tsx'));

    const client = clientBaseDir(answers);

    answers.useRtk =
        (await exists(targetDir, `${client}/store/index.ts`)) ||
        (await exists(targetDir, 'src/client/store/index.ts')) ||
        (await exists(targetDir, 'src/store/index.ts'));
    answers.useRouter =
        (await exists(targetDir, `${client}/routes.tsx`)) ||
        (await exists(targetDir, 'src/client/routes.tsx')) ||
        (await exists(targetDir, 'src/routes.tsx'));
    answers.useLint = await exists(targetDir, 'eslint.config.mts');
    answers.cssModules =
        (await exists(targetDir, `${client}/components/app.module.css`)) ||
        (await exists(targetDir, 'src/client/components/app.module.css')) ||
        (await exists(targetDir, 'src/components/app.module.css'));
    answers.polyfills =
        (await exists(targetDir, `${client}/polyfills.ts`)) ||
        (await exists(targetDir, 'src/client/polyfills.ts')) ||
        (await exists(targetDir, 'src/polyfills.ts'));

    if (await exists(targetDir, 'src/modules/example/index.tsx')) {
        answers.moduleRole = 'remote';
    } else if (
        (await exists(targetDir, `${client}/components/remote-module.tsx`)) ||
        (await exists(targetDir, 'src/client/components/remote-module.tsx')) ||
        (await exists(targetDir, 'src/components/remote-module.tsx'))
    ) {
        answers.moduleRole = 'host';
    }
    answers.reactCompiler = /experimentalReactCompiler:/.test(config);
    answers.testRunner = (
        (await exists(targetDir, 'vitest.config.ts')) ? 'vitest' : 'jest'
    ) as TestRunner;

    if (await exists(targetDir, 'playwright.config.ts')) {
        answers.e2eFramework = 'playwright';
    } else if (await exists(targetDir, 'cypress.config.ts')) {
        answers.e2eFramework = 'cypress';
    } else {
        answers.e2eFramework = 'none' as E2eFramework;
    }

    const codeLoader = extractString(config, 'codeLoader');

    if (codeLoader === 'swc' || codeLoader === 'babel' || codeLoader === 'tsc') {
        answers.codeLoader = codeLoader as CodeLoader;
    }

    const clientPort = extractNumber(config, 'clientServerPort');

    if (clientPort !== undefined) {
        answers.clientServerPort = clientPort;
    }

    const serverPort = extractNumber(config, 'serverPort');

    if (serverPort !== undefined) {
        answers.serverPort = serverPort;
    }

    answers.dockerRegistry = extractString(config, 'dockerRegistry') ?? '';
    answers.presets = extractString(config, 'presets') ?? '';

    const aruiScriptsVersion = parseAruiScriptsVersion(
        pkg.devDependencies?.['arui-scripts'],
        fallbackAruiScriptsVersion,
    );

    return { answers, aruiScriptsVersion };
}
