import postcss from 'postcss';

import { postCssPrefix } from '../postcss-prefix-selector';

describe('postCssPrefix', () => {
    async function transform(css: string, prefix = '.app ') {
        const result = await postcss([postCssPrefix({ prefix })]).process(css, { from: undefined });

        return result.css;
    }

    it('should prefix regular selectors', async () => {
        const css = await transform('.button { color: red; }');

        expect(css).toContain('.app .button');
    });

    it('should wrap :root with prefix only to encapsulate css variables', async () => {
        const css = await transform(':root { --color: red; }');

        expect(css).toContain('.app');
        expect(css).toContain('--color: red');
        expect(css).not.toContain(':root');
    });

    it('should not prefix keyframe selectors', async () => {
        const css = await transform('@keyframes fade { from { opacity: 0; } to { opacity: 1; } }');

        expect(css).toContain('from {');
        expect(css).toContain('to {');
        expect(css).not.toContain('.app from');
        expect(css).not.toContain('.app to');
    });
});
