import { getLocalIdent } from '../get-local-ident';

describe('getLocalIdent', () => {
    const rootContext = '/project/src';

    it('should use file basename for regular css modules', () => {
        const className = getLocalIdent(
            {
                resourcePath: '/project/src/button.module.css',
                rootContext,
            },
            '[hash:base64:5]',
            'root',
        );

        expect(className).toMatch(/^button_root__[A-Za-z0-9_]{1,5}$/);
    });

    it('should use parent directory name for index.module.css', () => {
        const className = getLocalIdent(
            {
                resourcePath: '/project/src/button/index.module.css',
                rootContext,
            },
            '[hash:base64:5]',
            'root',
        );

        expect(className).toMatch(/^button_root__[A-Za-z0-9_]{1,5}$/);
    });

    it('should produce a stable hash for the same file and class', () => {
        const context = {
            resourcePath: '/project/src/card.module.css',
            rootContext,
        };

        expect(getLocalIdent(context, '', 'title')).toBe(getLocalIdent(context, '', 'title'));
    });

    it('should produce different hashes for different class names', () => {
        const context = {
            resourcePath: '/project/src/card.module.css',
            rootContext,
        };

        expect(getLocalIdent(context, '', 'title')).not.toBe(
            getLocalIdent(context, '', 'subtitle'),
        );
    });
});
