export function mergePackageJson(existingRaw: string, generatedRaw: string): string {
    const existing = JSON.parse(existingRaw) as Record<string, unknown>;
    const generated = JSON.parse(generatedRaw) as Record<string, unknown>;

    const mergeRecord = (
        current: Record<string, string> | undefined,
        incoming: Record<string, string> | undefined,
    ): Record<string, string> => {
        const result = { ...(current ?? {}) };

        Object.entries(incoming ?? {}).forEach(([key, value]) => {
            if (result[key] === undefined) {
                result[key] = value;
            }
        });

        return result;
    };

    const merged: Record<string, unknown> = {
        ...existing,
        scripts: {
            ...((existing.scripts as Record<string, string> | undefined) ?? {}),
            ...((generated.scripts as Record<string, string> | undefined) ?? {}),
        },
        dependencies: mergeRecord(
            existing.dependencies as Record<string, string> | undefined,
            generated.dependencies as Record<string, string> | undefined,
        ),
        devDependencies: mergeRecord(
            existing.devDependencies as Record<string, string> | undefined,
            generated.devDependencies as Record<string, string> | undefined,
        ),
    };

    ['prettier', 'stylelint', 'commitlint', 'jest', 'engines'].forEach((key) => {
        if (generated[key] !== undefined && existing[key] === undefined) {
            merged[key] = generated[key];
        }
    });

    return `${JSON.stringify(merged, null, 4)}\n`;
}

export function mergeGitignore(existingRaw: string, generatedRaw: string): string {
    const existingLines = existingRaw.split('\n');
    const seen = new Set(existingLines.map((line) => line.trim()));
    const extra = generatedRaw
        .split('\n')
        .filter((line) => line.trim() !== '' && !seen.has(line.trim()));

    if (extra.length === 0) {
        return existingRaw.endsWith('\n') ? existingRaw : `${existingRaw}\n`;
    }

    const base = existingRaw.endsWith('\n') ? existingRaw : `${existingRaw}\n`;

    return `${base}${extra.join('\n').replace(/\n+$/, '')}\n`;
}
