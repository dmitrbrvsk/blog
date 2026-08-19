import path from 'path';

import { resolveNodeModuleRelativeTo, tryResolve } from '../resolve';

describe('tryResolve', () => {
    it('should return an absolute path for an existing module', () => {
        const resolved = tryResolve('jest');

        expect(resolved).toEqual(expect.stringContaining('jest'));
        expect(path.isAbsolute(resolved as string)).toBe(true);
    });

    it('should return undefined when module cannot be resolved', () => {
        expect(tryResolve('definitely-not-a-real-package-name-xyz')).toBeUndefined();
    });
});

describe('resolveNodeModuleRelativeTo', () => {
    it('should resolve module path relative to the given project root', () => {
        expect(resolveNodeModuleRelativeTo('/project', 'lodash')).toBe(
            path.resolve('/project/node_modules/lodash'),
        );
    });
});
