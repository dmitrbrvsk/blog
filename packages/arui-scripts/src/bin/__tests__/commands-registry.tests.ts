import { commands } from '../commands-registry';

describe('commands-registry', () => {
    it('should expose unique CLI commands with loaders', () => {
        const names = commands.map((command) => command.name);

        expect(names).toEqual([
            'start',
            'start:prod',
            'build',
            'docker-build',
            'docker-build:compiled',
            'test',
            'test:vitest',
            'ensure-yarn',
            'archive-build',
            'bundle-analyze',
            'changelog',
        ]);
        expect(new Set(names).size).toBe(names.length);

        commands.forEach((command) => {
            expect(command.description.length).toBeGreaterThan(0);
            expect(typeof command.load).toBe('function');
        });
    });

    it('should mark passthrough commands that forward args to inner tools', () => {
        const passthrough = commands
            .filter((command) => command.passthrough)
            .map((command) => command.name);

        expect(passthrough).toEqual([
            'docker-build',
            'docker-build:compiled',
            'test',
            'test:vitest',
        ]);
    });
});
