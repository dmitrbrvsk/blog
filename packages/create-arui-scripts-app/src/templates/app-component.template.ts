import { type TemplateContext } from '../types';

function tsString(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function appComponentTemplate(ctx: TemplateContext): string {
    if (ctx.useRouter) {
        return `import React from 'react';

import { AppRoutes } from '../routes';

export function App() {
    return <AppRoutes />;
}
`;
    }

    const styleImport = ctx.cssModules
        ? "import styles from './app.module.css';"
        : "import './app.css';";

    const rootClass = ctx.cssModules ? '{styles.root}' : "'app'";
    const titleClass = ctx.cssModules ? '{styles.title}' : "'app__title'";
    const appNameLiteral = tsString(ctx.name);
    const hostImport =
        ctx.moduleRole === 'host' ? "\nimport { RemoteModule } from './remote-module';" : '';
    const hostBlock =
        ctx.moduleRole === 'host'
            ? `
            <Gap size={16} />
            <RemoteModule />`
            : '';

    return `import React from 'react';

import { Gap } from '@alfalab/core-components/gap';
import { Typography } from '@alfalab/core-components/typography';
${hostImport}

import { PostsList } from './posts-list';

${styleImport}

const appName = ${appNameLiteral};

export function App() {
    return (
        <div className=${rootClass}>
            <Typography.Title view='medium' tag='h1' className=${titleClass}>
                {appName}
            </Typography.Title>
            <Gap size={16} />
            <PostsList />${hostBlock}
        </div>
    );
}
`;
}
