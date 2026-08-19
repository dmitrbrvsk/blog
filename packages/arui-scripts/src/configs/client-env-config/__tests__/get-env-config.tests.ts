/* eslint-disable no-template-curly-in-string */
import { replaceTemplateVariables } from '../get-env-config';

describe('replaceTemplateVariables', () => {
    it('should replace ${VAR} placeholders with provided values', () => {
        expect(
            replaceTemplateVariables('{"api":"${API_URL}","env":"${NODE_ENV}"}', {
                API_URL: 'https://example.com',
                NODE_ENV: 'test',
            }),
        ).toBe('{"api":"https://example.com","env":"test"}');
    });

    it('should replace missing variables with an empty string', () => {
        expect(replaceTemplateVariables('value=${MISSING}', {})).toBe('value=');
    });

    it('should leave $VAR without braces unchanged', () => {
        expect(replaceTemplateVariables('keep=$FOO and ${BAR}', { BAR: 'ok' })).toBe(
            'keep=$FOO and ok',
        );
    });
});

describe('getEnvConfigContent', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
    });

    it('should return {} when env-config.json does not exist', () => {
        jest.doMock('fs', () => ({
            existsSync: () => false,
            readFileSync: jest.fn(),
        }));
        jest.doMock('../../app-configs', () => ({
            configs: { cwd: '/tmp/missing-env-config' },
        }));

        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const { getEnvConfigContent } = require('../get-env-config');

        expect(getEnvConfigContent()).toBe('{}');
    });

    it('should interpolate env variables from env-config.json and cache the result', () => {
        const readFileSync = jest.fn(() => '{"api":"${API_URL}"}');

        jest.doMock('fs', () => ({
            existsSync: () => true,
            readFileSync,
        }));
        jest.doMock('../../app-configs', () => ({
            configs: { cwd: '/tmp/project' },
        }));

        const originalApiUrl = process.env.API_URL;

        process.env.API_URL = 'https://api.test';

        try {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { getEnvConfigContent } = require('../get-env-config');

            expect(getEnvConfigContent()).toBe('{"api":"https://api.test"}');
            expect(getEnvConfigContent()).toBe('{"api":"https://api.test"}');
            expect(readFileSync).toHaveBeenCalledTimes(1);
        } finally {
            process.env.API_URL = originalApiUrl;
        }
    });
});
