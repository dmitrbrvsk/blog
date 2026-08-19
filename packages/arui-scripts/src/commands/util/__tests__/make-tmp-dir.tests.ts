import fs from 'fs';
import os from 'os';
import path from 'path';

import { makeTmpDir } from '../make-tmp-dir';

describe('makeTmpDir', () => {
    it('should create a temporary directory with optional prefix', async () => {
        const dir = await makeTmpDir('arui-scripts-test-');

        expect(dir.startsWith(path.join(os.tmpdir(), 'arui-scripts-test-'))).toBe(true);
        expect(fs.existsSync(dir)).toBe(true);

        fs.rmSync(dir, { recursive: true, force: true });
    });
});
