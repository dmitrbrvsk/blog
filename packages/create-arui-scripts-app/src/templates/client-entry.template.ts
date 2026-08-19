import { type TemplateContext } from '../types';

function wrapWithRouter(jsx: string, ctx: TemplateContext): string {
    if (!ctx.useRouter) {
        return jsx;
    }

    return `<BrowserRouter>${jsx}</BrowserRouter>`;
}

function wrapWithData(jsx: string, ctx: TemplateContext): string {
    if (ctx.useRtk) {
        return `
        <Provider store={store}>
            ${jsx}
        </Provider>`;
    }

    return `
        <QueryClientProvider client={queryClient}>
            ${jsx}
        </QueryClientProvider>`;
}

function wrapApp(jsx: string, ctx: TemplateContext): string {
    return wrapWithRouter(wrapWithData(jsx, ctx), ctx);
}

function fromEntry(ctx: TemplateContext, target: string): string {
    return ctx.dualEntries ? `../${target}` : `./${target}`;
}

function hmrBlock(ctx: TemplateContext): string {
    const appPath = fromEntry(ctx, 'components/app');

    return `if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('${appPath}', () => {
        const mod = require('${appPath}') as { App: typeof App };

        render(mod.App);
    });
}
`;
}

export function clientEntryTemplate(ctx: TemplateContext): string {
    return ctx.clientOnly ? clientOnlyEntryTemplate(ctx) : ssrEntryTemplate(ctx);
}

function routerImport(ctx: TemplateContext): string {
    return ctx.useRouter ? "\nimport { BrowserRouter } from 'react-router-dom';" : '';
}

function dataLibImport(ctx: TemplateContext): string {
    return ctx.useRtk
        ? "\nimport { Provider } from 'react-redux';"
        : "\nimport { QueryClient, QueryClientProvider } from '@tanstack/react-query';";
}

function ssrEntryTemplate(ctx: TemplateContext): string {
    const appImport = fromEntry(ctx, 'components/app');
    const storeImport = ctx.useRtk
        ? `\nimport { makeStore, type RootState } from '${fromEntry(ctx, 'store')}';`
        : '';
    const setup = ctx.useRtk
        ? `declare global {
    interface Window {
        __PRELOADED_STATE__?: Partial<RootState>;
    }
}

const store = makeStore(window.__PRELOADED_STATE__);`
        : `const queryClient = new QueryClient();`;

    return `import React from 'react';
import { hydrateRoot } from 'react-dom/client';${dataLibImport(ctx)}${routerImport(ctx)}

import { App } from '${appImport}';${storeImport}

${setup}
const targetElement = document.getElementById('react-app');

const root = hydrateRoot(
    targetElement!,${wrapApp('<App />', ctx)},
);

function render(AppComponent: typeof App) {
    root.render(${wrapApp('<AppComponent />', ctx)},
    );
}

${hmrBlock(ctx)}`;
}

function clientOnlyEntryTemplate(ctx: TemplateContext): string {
    const appImport = fromEntry(ctx, 'components/app');
    const storeImport = ctx.useRtk
        ? `\nimport { makeStore } from '${fromEntry(ctx, 'store')}';`
        : '';
    const setup = ctx.useRtk
        ? `const store = makeStore();`
        : `const queryClient = new QueryClient();`;

    return `import React from 'react';
import { createRoot } from 'react-dom/client';${dataLibImport(ctx)}${routerImport(ctx)}

import { App } from '${appImport}';${storeImport}

${setup}
const targetElement = document.getElementById('react-app');
const root = createRoot(targetElement!);

function render(AppComponent: typeof App) {
    root.render(${wrapApp('<AppComponent />', ctx)},
    );
}

render(App);

${hmrBlock(ctx)}`;
}
