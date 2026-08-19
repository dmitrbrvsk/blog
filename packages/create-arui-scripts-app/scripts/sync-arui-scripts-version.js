#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const aruiScriptsPkg = require('../../arui-scripts/package.json');

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/versions.ts');

const content = `/** Версия arui-scripts, которую scaffold кладёт в package.json нового проекта.
 * Генерируется скриптом scripts/sync-arui-scripts-version.js при сборке.
 */
export const DEFAULT_ARUI_SCRIPTS_VERSION = '${aruiScriptsPkg.version}';
`;

fs.writeFileSync(outFile, content);
console.log(`synced DEFAULT_ARUI_SCRIPTS_VERSION=${aruiScriptsPkg.version}`);
