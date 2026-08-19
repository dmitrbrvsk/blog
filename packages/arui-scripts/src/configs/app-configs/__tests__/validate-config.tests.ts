import { type AppContextWithConfigs } from '../types';
import { validateConfig } from '../validate-config';

function createConfig(
    overrides: Pick<AppContextWithConfigs, 'experimentalReactCompiler' | 'codeLoader'>,
): AppContextWithConfigs {
    return overrides as AppContextWithConfigs;
}

describe('validateConfig', () => {
    it('should allow experimentalReactCompiler when codeLoader is swc', () => {
        expect(() =>
            validateConfig(
                createConfig({
                    experimentalReactCompiler: { compilationMode: 'infer' },
                    codeLoader: 'swc',
                }),
            ),
        ).not.toThrow();
    });

    it('should allow any codeLoader when experimentalReactCompiler is disabled', () => {
        expect(() =>
            validateConfig(
                createConfig({
                    experimentalReactCompiler: 'disabled',
                    codeLoader: 'babel',
                }),
            ),
        ).not.toThrow();
    });

    it('should throw when experimentalReactCompiler is enabled without swc', () => {
        expect(() =>
            validateConfig(
                createConfig({
                    experimentalReactCompiler: { compilationMode: 'infer' },
                    codeLoader: 'babel',
                }),
            ),
        ).toThrow(/experimentalReactCompiler/);
    });
});
