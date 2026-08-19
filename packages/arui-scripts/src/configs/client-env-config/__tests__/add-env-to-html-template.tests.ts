import { addEnvToHtmlTemplate } from '../add-env-to-html-template';

jest.mock('../get-env-config', () => ({
    getEnvConfigContent: jest.fn(() => '{"API_URL":"https://example.com"}'),
}));

describe('addEnvToHtmlTemplate', () => {
    it('should replace envConfig placeholder with env config content', () => {
        const html = '<script type="application/json"><%= envConfig %></script>';

        expect(addEnvToHtmlTemplate(html)).toBe(
            '<script type="application/json">{"API_URL":"https://example.com"}</script>',
        );
    });

    it('should return html unchanged when placeholder is missing', () => {
        const html = '<div id="react-app"></div>';

        expect(addEnvToHtmlTemplate(html)).toBe(html);
    });
});
