import stripAnsi from 'strip-ansi';

import { formatWebpackMessages } from '../format-webpack-messages';

describe('formatWebpackMessages', () => {
    it('should return empty collections when stats are missing', () => {
        expect(formatWebpackMessages(undefined)).toEqual({ errors: [], warnings: [] });
    });

    it('should format export errors into a friendlier message', () => {
        const result = formatWebpackMessages({
            errors: [
                {
                    message: "export 'foo' was not found in './bar'",
                },
            ],
            warnings: [],
        });

        expect(stripAnsi(result.errors[0])).toContain(
            "Attempted import error: 'foo' is not exported from './bar'.",
        );
        expect(result.warnings).toEqual([]);
    });

    it('should keep only syntax errors when they are present', () => {
        const result = formatWebpackMessages({
            errors: [
                { message: 'Something else went wrong' },
                { message: 'Syntax error: Unexpected token (1:0)' },
            ],
            warnings: [],
        });

        expect(result.errors).toHaveLength(1);
        expect(stripAnsi(result.errors[0])).toContain('Syntax error:');
    });

    it('should format object messages using the message field', () => {
        const result = formatWebpackMessages({
            errors: [],
            warnings: [{ message: 'Module not found: Cannot find file: missing.css' }],
        });

        expect(stripAnsi(result.warnings[0])).toContain('Cannot find file: missing.css');
    });
});
