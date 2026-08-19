import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { CLI_NODE_ENGINE_RANGE, NODE_ENGINE_RANGE } from '../node-engines.js';

const pkg = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8'),
) as { engines: { node: string } };

describe('node engines', () => {
    it('CLI требует Node.js 26', () => {
        expect(CLI_NODE_ENGINE_RANGE).toBe('^26.0.0');
        expect(pkg.engines.node).toBe(CLI_NODE_ENGINE_RANGE);
    });

    it('сгенерированные приложения остаются на 22 / 24 / 26', () => {
        expect(NODE_ENGINE_RANGE).toBe('^22.12.0 || ^24.11.1 || ^26.0.0');
    });
});
