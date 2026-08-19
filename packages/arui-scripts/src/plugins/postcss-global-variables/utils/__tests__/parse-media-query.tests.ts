import { type AtRule, type Root } from 'postcss';

import { parseMediaQuery } from '../utils';

describe('parseMediaQuery', () => {
    it('should collect custom-media rules by name', () => {
        const desktop = { params: '--desktop (min-width: 1024px)' } as AtRule;
        const mobile = { params: '--mobile (max-width: 767px)' } as AtRule;
        const parsedCustomMedia: Record<string, AtRule> = {};
        const importedFile = {
            walkAtRules: (name: string, callback: (rule: AtRule) => void) => {
                expect(name).toBe('custom-media');
                callback(desktop);
                callback(mobile);
            },
        } as unknown as Root;

        parseMediaQuery(importedFile, parsedCustomMedia);

        expect(parsedCustomMedia).toEqual({
            '--desktop': desktop,
            '--mobile': mobile,
        });
    });
});
