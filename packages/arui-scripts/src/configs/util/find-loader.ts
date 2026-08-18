import { type Configuration, type RuleSetRule } from '@rspack/core';

function isTestEqual(test: RuleSetRule['test'], testRule: string) {
    if (typeof test === 'string' || test instanceof RegExp) {
        return String(test) === testRule;
    }

    return false;
}

export function findLoader(config: Configuration, testRule: string): RuleSetRule | undefined {
    for (const rule of config.module?.rules ?? []) {
        if (rule === '...' || !rule) {
            // Webpack имеет странный тип для rules, который позволяет в него положить строку '...'. Успокаиваем TS

            continue;
        }

        if (isTestEqual(rule.test, testRule)) {
            return rule;
        }

        if (rule.oneOf) {
            for (const oneOfRule of rule.oneOf) {
                if (oneOfRule && isTestEqual(oneOfRule.test, testRule)) {
                    return oneOfRule;
                }
            }
        }
    }

    return undefined;
}
