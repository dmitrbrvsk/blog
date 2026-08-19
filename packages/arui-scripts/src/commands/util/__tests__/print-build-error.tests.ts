import stripAnsi from 'strip-ansi';

import { printBuildError } from '../print-build-error';

describe('printBuildError', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should print error message for regular errors', () => {
        printBuildError(new Error('boom'));

        expect(console.log).toHaveBeenCalledWith('boom\n');
    });

    it('should print minification location for terser errors', () => {
        const err = new Error('from Terser');

        err.stack = 'Error: from Terser\n    at minify [src/app.js:10,4][bundle.js]';

        printBuildError(err);

        const output = (console.log as jest.Mock).mock.calls
            .map((call) => stripAnsi(String(call[0])))
            .join('\n');

        expect(output).toContain('Failed to minify the code from this file');
        expect(output).toContain('src/app.js:10:4');
        expect(output).toContain('https://cra.link/failed-to-minify');
    });
});
