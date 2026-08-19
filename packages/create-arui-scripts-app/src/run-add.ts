/* eslint-disable no-console */
import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';
import prompts from 'prompts';

import { buildContext } from './build-context';
import { buildFileMap } from './build-file-map';
import { detectProject } from './detect-project';
import {
    detectPackageManager,
    installDependencies,
    installLefthook,
    type PackageManager,
} from './install-dependencies';
import { mergeGitignore, mergePackageJson } from './merge-generated-files';
import { ADD_FEATURES, type AddFeature, type E2eFramework, type InitAnswers } from './types';
import { DEFAULT_ARUI_SCRIPTS_VERSION } from './versions';
import { writeFiles } from './write-files';

export type AddFlags = {
    yes?: boolean;
    force?: boolean;
    e2eFramework?: Exclude<E2eFramework, 'none'>;
    dockerRegistry?: string;
    install?: boolean;
    dryRun?: boolean;
};

export type RunAddOptions = {
    feature: string;
    cwd?: string;
    flags?: AddFlags;
    aruiScriptsVersion?: string;
};

const FEATURE_LABELS: Record<AddFeature, string> = {
    lint: 'arui-presets-lint',
    e2e: 'e2e',
    router: 'React Router',
    rtk: 'Redux Toolkit',
    docker: 'docker-build',
};

export function isAddFeature(value: string): value is AddFeature {
    return (ADD_FEATURES as string[]).includes(value);
}

function alreadyEnabled(feature: AddFeature, answers: InitAnswers): boolean {
    if (feature === 'lint') {
        return answers.useLint;
    }

    if (feature === 'e2e') {
        return answers.e2eFramework !== 'none';
    }

    if (feature === 'router') {
        return answers.useRouter;
    }

    if (feature === 'rtk') {
        return answers.useRtk;
    }

    return Boolean(answers.dockerRegistry);
}

function applyFeature(answers: InitAnswers, feature: AddFeature, flags: AddFlags): InitAnswers {
    const next = { ...answers, install: Boolean(flags.install) };

    if (feature === 'lint') {
        next.useLint = true;
    }

    if (feature === 'e2e') {
        next.e2eFramework = flags.e2eFramework ?? 'playwright';
    }

    if (feature === 'router') {
        next.useRouter = true;
    }

    if (feature === 'rtk') {
        next.useRtk = true;
    }

    if (feature === 'docker') {
        next.dockerRegistry = (flags.dockerRegistry ?? '').trim();
    }

    return next;
}

async function resolveAddFlags(feature: AddFeature, flags: AddFlags): Promise<AddFlags> {
    const next = { ...flags };

    if (feature === 'e2e' && !next.e2eFramework) {
        if (flags.yes || !process.stdin.isTTY) {
            next.e2eFramework = 'playwright';
        } else {
            const answers = await prompts({
                type: 'select',
                name: 'e2eFramework',
                message: 'e2e фреймворк',
                choices: [
                    { title: 'Playwright', value: 'playwright' },
                    { title: 'Cypress', value: 'cypress' },
                ],
            });

            if (!answers.e2eFramework) {
                throw new Error('Отменено.');
            }

            next.e2eFramework = answers.e2eFramework;
        }
    }

    if (feature === 'docker' && !next.dockerRegistry?.trim()) {
        if (flags.yes || !process.stdin.isTTY) {
            throw new Error('Для add docker укажите --docker-registry <url>.');
        }

        const answers = await prompts({
            type: 'text',
            name: 'dockerRegistry',
            message: 'Docker registry',
            validate: (value: string) => (value.trim() ? true : 'Укажите адрес docker registry'),
        });

        if (!answers.dockerRegistry) {
            throw new Error('Отменено.');
        }

        next.dockerRegistry = String(answers.dockerRegistry).trim();
    }

    return next;
}

export async function runAdd(options: RunAddOptions): Promise<void> {
    const { feature: featureName } = options;
    const targetDir = options.cwd ?? process.cwd();
    const flags = options.flags ?? {};

    if (!isAddFeature(featureName)) {
        throw new Error(`Неизвестная фича «${featureName}». Доступны: ${ADD_FEATURES.join(', ')}.`);
    }

    const feature = featureName;
    const fallbackVersion = options.aruiScriptsVersion ?? DEFAULT_ARUI_SCRIPTS_VERSION;
    const detected = await detectProject(targetDir, fallbackVersion);

    if (alreadyEnabled(feature, detected.answers)) {
        throw new Error(`${FEATURE_LABELS[feature]} уже подключен в этом проекте.`);
    }

    const resolvedFlags = await resolveAddFlags(feature, flags);
    const nextAnswers = applyFeature(detected.answers, feature, resolvedFlags);

    if (feature === 'docker' && !nextAnswers.dockerRegistry) {
        throw new Error('Для add docker укажите --docker-registry <url>.');
    }

    const before = buildFileMap(buildContext(detected.answers, detected.aruiScriptsVersion));
    const after = buildFileMap(buildContext(nextAnswers, detected.aruiScriptsVersion));
    const filesToWrite: Record<string, string> = {};
    const skipped: string[] = [];

    await Promise.all(
        Object.keys(after).map(async (relPath) => {
            if (before[relPath] === after[relPath]) {
                return;
            }

            const absPath = path.join(targetDir, relPath);
            const exists = await fs.pathExists(absPath);

            if (relPath === 'package.json' && exists) {
                const current = await fs.readFile(absPath, 'utf8');

                filesToWrite[relPath] = mergePackageJson(current, after[relPath]);

                return;
            }

            if (relPath === '.gitignore' && exists) {
                const current = await fs.readFile(absPath, 'utf8');

                filesToWrite[relPath] = mergeGitignore(current, after[relPath]);

                return;
            }

            if (!exists || flags.force) {
                filesToWrite[relPath] = after[relPath];

                return;
            }

            const current = await fs.readFile(absPath, 'utf8');

            if (current === before[relPath]) {
                filesToWrite[relPath] = after[relPath];

                return;
            }

            skipped.push(relPath);
        }),
    );

    if (skipped.length > 0 && !flags.force) {
        console.log(
            ` ${chalk.yellow(
                '!',
            )} Пропущены изменённые файлы (передайте --force, чтобы перезаписать):`,
        );
        skipped.forEach((file) => console.log(`   ${chalk.dim(file)}`));
    }

    const planned = Object.keys(filesToWrite).sort();

    if (flags.dryRun) {
        console.log();
        console.log(` ${chalk.bold('[dry-run]')} файлы не будут записаны`);
        planned.forEach((file) => console.log(` ${chalk.dim('•')} ${file}`));
        console.log(` ${chalk.dim(`${planned.length} файлов`)}`);
        console.log();

        return;
    }

    await writeFiles(targetDir, filesToWrite);

    console.log();
    console.log(
        ` ${chalk.green('✔')} ${chalk.bold('Готово!')} ${chalk.dim(
            `добавлен ${FEATURE_LABELS[feature]}`,
        )}`,
    );
    console.log(` ${chalk.dim(`${Object.keys(filesToWrite).length} файлов обновлено`)}`);

    if (nextAnswers.install) {
        const packageManager: PackageManager = detectPackageManager();
        const spinner = ora({ text: 'Устанавливаю зависимости…', color: 'cyan' }).start();

        try {
            await installDependencies(targetDir, packageManager);
            spinner.succeed(chalk.green('Зависимости установлены'));
        } catch (error) {
            spinner.fail(chalk.red('Не удалось установить зависимости'));
            throw error;
        }

        if (feature === 'lint') {
            try {
                await installLefthook(targetDir);
            } catch {
                console.log(
                    ` ${chalk.dim(
                        'lefthook: не удалось установить хуки. Выполните: npx --no-install lefthook install',
                    )}`,
                );
            }
        }
    }
}
