/* eslint-disable no-console */
import chalk from 'chalk';

import { type TemplateContext } from './types';

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const { version: cliVersion } = require('../package.json');

type TreeNode = {
    name: string;
    children?: Map<string, TreeNode>;
};

type ChalkRgb = {
    rgb?: (r: number, g: number, b: number) => (text: string) => string;
};

function rgb(r: number, g: number, b: number, text: string): string {
    if (typeof (chalk as ChalkRgb).rgb !== 'function') {
        return chalk.cyan.bold(text);
    }

    return (chalk as Required<ChalkRgb>).rgb(r, g, b)(text);
}

function paintTitle(text: string): string {
    const from = [34, 211, 238];
    const to = [99, 102, 241];

    return text
        .split('')
        .map((char, index) => {
            const t = text.length <= 1 ? 0 : index / (text.length - 1);
            const r = Math.round(from[0] + (to[0] - from[0]) * t);
            const g = Math.round(from[1] + (to[1] - from[1]) * t);
            const b = Math.round(from[2] + (to[2] - from[2]) * t);

            return rgb(r, g, b, chalk.bold(char));
        })
        .join('');
}

function colorizeEntry(name: string, isDir: boolean): string {
    if (isDir) {
        return chalk.cyan.bold(name);
    }

    if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.mts')) {
        return chalk.white(name);
    }

    if (name.endsWith('.css')) {
        return chalk.magenta(name);
    }

    if (name.endsWith('.json') || name.endsWith('.yml')) {
        return chalk.yellow(name);
    }

    if (name.startsWith('.')) {
        return chalk.dim(name);
    }

    return name;
}

function compareNodes(left: TreeNode, right: TreeNode): number {
    const leftDir = Boolean(left.children);
    const rightDir = Boolean(right.children);

    if (leftDir !== rightDir) {
        return leftDir ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
}

function insertPath(root: Map<string, TreeNode>, filePath: string): void {
    const parts = filePath.split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;

        if (!current.has(part)) {
            current.set(part, {
                name: part,
                children: isFile ? undefined : new Map(),
            });
        }

        const node = current.get(part) as TreeNode;

        if (!isFile) {
            if (!node.children) {
                node.children = new Map();
            }

            current = node.children;
        }
    });
}

function renderTree(nodes: Map<string, TreeNode>, prefix: string, indent: string): string[] {
    const entries = [...nodes.values()].sort(compareNodes);

    return entries.flatMap((node, index) => {
        const isLast = index === entries.length - 1;
        const elbow = isLast ? '└─ ' : '├─ ';
        const isDir = Boolean(node.children);
        const label = isDir ? `${node.name}/` : node.name;
        const line = `${indent}${prefix}${elbow}${colorizeEntry(label, isDir)}`;

        if (!node.children) {
            return [line];
        }

        const nextPrefix = prefix + (isLast ? '   ' : '│  ');

        return [line, ...renderTree(node.children, nextPrefix, indent)];
    });
}

export function formatFileTree(paths: string[], indent = '  '): string[] {
    const root = new Map<string, TreeNode>();

    [...paths].sort().forEach((filePath) => insertPath(root, filePath));

    return renderTree(root, '', indent);
}

export function formatStack(context: TemplateContext): string {
    const tags = [
        chalk.cyan(context.useRtk ? 'React + RTK' : 'React'),
        chalk.blue(context.clientOnly ? 'clientOnly' : 'SSR'),
        ...(context.dualEntries ? [chalk.magenta('mobile/desktop')] : []),
        chalk.dim(context.codeLoader),
        chalk.dim(context.testRunner),
        ...(context.e2eFramework !== 'none' ? [chalk.dim(context.e2eFramework)] : []),
        ...(context.useRouter ? [chalk.dim('router')] : []),
        ...(context.moduleRole !== 'none' ? [chalk.magenta(context.moduleRole)] : []),
        ...(context.useLint ? [chalk.dim('lint')] : []),
    ];

    return tags.join(chalk.dim(' · '));
}

export function printBanner(subtitle: string): void {
    console.log();
    console.log(
        `  ${chalk.cyan('╭─')} ${paintTitle('create-arui-scripts-app')}  ${chalk.dim(
            `v${cliVersion}`,
        )}`,
    );
    console.log(`  ${chalk.cyan('│')}  ${chalk.dim(subtitle)}`);
    console.log(`  ${chalk.cyan('╰')}`);
    console.log();
}

export function printDryRun(targetDir: string, plannedFiles: string[]): void {
    console.log();
    console.log(
        `  ${chalk.bgYellow.black.bold(' dry-run ')} ${chalk.dim('файлы не будут записаны')}`,
    );
    console.log(`  ${chalk.dim(targetDir)}`);
    console.log();
    formatFileTree(plannedFiles).forEach((line) => console.log(line));
    console.log();
    console.log(`  ${chalk.dim(`${plannedFiles.length} файлов`)}`);
    console.log();
}

export function printDone(title: string, lines: string[]): void {
    console.log();
    console.log(`  ${chalk.cyan('╭─')}`);
    console.log(`  ${chalk.cyan('│')}  ${chalk.green('✔')}  ${chalk.bold(title)}`);
    lines.forEach((line) => {
        console.log(`  ${chalk.cyan('│')}     ${line}`);
    });
    console.log(`  ${chalk.cyan('╰─')}`);
}

export function printNextSteps(steps: string[]): void {
    if (steps.length === 0) {
        return;
    }

    console.log();
    console.log(`  ${chalk.bold('Дальше')}`);
    steps.forEach((step, index) => {
        const isLast = index === steps.length - 1;
        const elbow = isLast ? '└─' : '├─';

        console.log(`  ${chalk.cyan(elbow)} ${chalk.dim('$')} ${chalk.cyan(step)}`);
    });
    console.log();
}

export function printOk(text: string): void {
    console.log(`  ${chalk.green('✔')}  ${chalk.dim(text)}`);
}

export function printWarn(text: string): void {
    console.log(`  ${chalk.yellow('▲')}  ${text}`);
}

export function printError(message: string): void {
    console.error();
    console.error(`  ${chalk.bgRed.white.bold(' error ')} ${message}`);
    console.error();
}
