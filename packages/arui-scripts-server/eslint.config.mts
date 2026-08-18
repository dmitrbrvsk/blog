import { defineConfig, eslintConfig, globalIgnores } from 'arui-presets-lint/eslint';

import { commonjsConfig, eslintConfigIgnore } from '../../eslint.shared.mts';

export default defineConfig(eslintConfig, [globalIgnores(eslintConfigIgnore), commonjsConfig]);
