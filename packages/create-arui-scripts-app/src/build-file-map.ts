import { appComponentTemplate } from './templates/app-component.template.js';
import { appStylesFileName, appStylesTemplate } from './templates/app-styles.template.js';
import { appTestTemplate } from './templates/app-test.template.js';
import { aruiScriptsConfigTemplate } from './templates/arui-scripts-config.template.js';
import { clientEntryTemplate } from './templates/client-entry.template.js';
import {
    postsApiTemplate,
    postsFetchTemplate,
    postsListTemplate,
} from './templates/data.template.js';
import {
    cypressConfigTemplate,
    cypressExampleSpecTemplate,
    cypressSupportCommandsTemplate,
    cypressSupportE2eTemplate,
} from './templates/e2e-cypress.template.js';
import {
    playwrightConfigTemplate,
    playwrightExampleSpecTemplate,
    playwrightHelpersTemplate,
} from './templates/e2e-playwright.template.js';
import {
    eslintConfigTemplate,
    knipConfigTemplate,
    lefthookConfigTemplate,
    secretlintConfigTemplate,
} from './templates/lint.template.js';
import {
    gitignoreTemplate,
    globalDefinitionsTemplate,
    polyfillsTemplate,
    readmeTemplate,
    yarnrcTemplate,
} from './templates/misc.template.js';
import { hostModuleMounterTemplate, remoteModuleTemplate } from './templates/modules.template.js';
import { packageJsonTemplate } from './templates/package-json.template.js';
import {
    aboutPageTemplate,
    homePageTemplate,
    layoutTemplate,
    routesTemplate,
} from './templates/router.template.js';
import { serverEntryTemplate } from './templates/server-entry.template.js';
import { storeHooksTemplate, storeIndexTemplate } from './templates/store.template.js';
import { tsconfigTemplate } from './templates/tsconfig.template.js';
import { vitestConfigTemplate } from './templates/vitest-config.template.js';
import { type TemplateContext } from './types.js';

export function clientBaseDir(ctx: { clientOnly: boolean }): string {
    return ctx.clientOnly ? 'src' : 'src/client';
}

export function clientEntryPaths(ctx: { clientOnly: boolean; dualEntries: boolean }): string[] {
    const client = clientBaseDir(ctx);

    if (ctx.dualEntries) {
        return [`${client}/desktop/index.tsx`, `${client}/mobile/index.tsx`];
    }

    return [`${client}/index.tsx`];
}

export function buildFileMap(ctx: TemplateContext): Record<string, string> {
    const client = clientBaseDir(ctx);

    const files: Record<string, string> = {
        'package.json': packageJsonTemplate(ctx),
        'arui-scripts.config.ts': aruiScriptsConfigTemplate(ctx),
        'tsconfig.json': tsconfigTemplate(ctx),
        '.gitignore': gitignoreTemplate(ctx),
        '.yarnrc.yml': yarnrcTemplate(),
        'global-definitions.d.ts': globalDefinitionsTemplate(),
        'README.md': readmeTemplate(ctx),
        [`${client}/components/app.tsx`]: appComponentTemplate(ctx),
        [`${client}/components/${appStylesFileName(ctx)}`]: appStylesTemplate(ctx),
        [`${client}/components/__tests__/app.test.ts`]: appTestTemplate(ctx),
        [`${client}/components/posts-list.tsx`]: postsListTemplate(ctx),
    };

    clientEntryPaths(ctx).forEach((entryPath) => {
        files[entryPath] = clientEntryTemplate(ctx);
    });

    if (!ctx.clientOnly) {
        files['src/server/index.tsx'] = serverEntryTemplate(ctx);
    }

    if (ctx.testRunner === 'vitest') {
        files['vitest.config.ts'] = vitestConfigTemplate();
    }

    if (ctx.polyfills) {
        files[`${client}/polyfills.ts`] = polyfillsTemplate();
    }

    if (ctx.useRtk) {
        files[`${client}/store/index.ts`] = storeIndexTemplate();
        files[`${client}/store/hooks.ts`] = storeHooksTemplate();
        files[`${client}/store/posts-api.ts`] = postsApiTemplate();
    } else {
        files[`${client}/api/posts.ts`] = postsFetchTemplate();
    }

    if (ctx.useRouter) {
        files[`${client}/routes.tsx`] = routesTemplate();
        files[`${client}/components/layout.tsx`] = layoutTemplate(ctx);
        files[`${client}/pages/home.tsx`] = homePageTemplate(ctx);
        files[`${client}/pages/about.tsx`] = aboutPageTemplate(ctx);
    }

    if (ctx.useLint) {
        files['eslint.config.mts'] = eslintConfigTemplate();
        files['knip.ts'] = knipConfigTemplate();
        files['.secretlintrc.json'] = secretlintConfigTemplate();
        files['lefthook.yml'] = lefthookConfigTemplate();
    }

    if (ctx.e2eFramework === 'playwright') {
        files['playwright.config.ts'] = playwrightConfigTemplate(ctx);
        files['e2e/helpers/index.ts'] = playwrightHelpersTemplate();
        files['e2e/example.spec.ts'] = playwrightExampleSpecTemplate();
    } else if (ctx.e2eFramework === 'cypress') {
        files['cypress.config.ts'] = cypressConfigTemplate(ctx);
        files['cypress/support/e2e.ts'] = cypressSupportE2eTemplate();
        files['cypress/support/commands.ts'] = cypressSupportCommandsTemplate();
        files['cypress/e2e/example.cy.ts'] = cypressExampleSpecTemplate();
    }

    if (ctx.moduleRole === 'host') {
        files[`${client}/components/remote-module.tsx`] = hostModuleMounterTemplate(ctx);
    } else if (ctx.moduleRole === 'remote') {
        files['src/modules/example/index.tsx'] = remoteModuleTemplate();
    }

    return files;
}
