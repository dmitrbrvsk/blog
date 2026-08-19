import { type Configuration, type RuleSetRule } from '@rspack/core';

import { findLoader } from '../find-loader';

describe('findLoader', () => {
    it('should return top-level rule with matching test', () => {
        const cssRule: RuleSetRule = { test: /\.css$/, use: ['css-loader'] };
        const config: Configuration = {
            module: {
                rules: [cssRule],
            },
        };

        expect(findLoader(config, '/\\.css$/')).toBe(cssRule);
    });

    it('should return nested oneOf rule with matching test', () => {
        const cssModulesRule: RuleSetRule = { test: /\.module\.css$/, use: ['css-loader'] };
        const config: Configuration = {
            module: {
                rules: [
                    {
                        oneOf: [cssModulesRule, { test: /\.svg$/, type: 'asset' }],
                    },
                ],
            },
        };

        expect(findLoader(config, '/\\.module\\.css$/')).toBe(cssModulesRule);
    });

    it('should skip webpack "..." fallback entries and empty rules', () => {
        const jsRule: RuleSetRule = { test: /\.js$/, use: ['swc-loader'] };
        const config: Configuration = {
            module: {
                rules: ['...', undefined, false, jsRule],
            },
        };

        expect(findLoader(config, '/\\.js$/')).toBe(jsRule);
    });

    it('should return undefined when no rule matches', () => {
        const config: Configuration = {
            module: {
                rules: [{ test: /\.css$/, use: ['css-loader'] }],
            },
        };

        expect(findLoader(config, '/\\.scss$/')).toBeUndefined();
    });

    it('should return undefined when module.rules is missing', () => {
        expect(findLoader({}, '/\\.css$/')).toBeUndefined();
    });
});
