import baseConfig from 'arui-presets-lint/knip';
import { type KnipConfig } from 'knip';

/**
 * Точки входа из корневого конфига knip не наследуются воркспейсами,
 * поэтому набор пресета приходится прокидывать в каждый из них
 */
const presetEntry = baseConfig.entry;

/**
 * arui-scripts передаёт плагины postcss и загрузчики сборщика строками в конфигурации,
 * поэтому статически knip их не видит.
 * TODO: часть из них могла остаться после перехода с webpack на rspack, нужен аудит
 */
const buildToolDependencies = [
    // browserslist приходит peer-зависимостью других пакетов, а source-map-support подключает
    // само приложение: оба намеренно не объявлены прямыми, см. комментарии в коде
    'browserslist',
    'source-map-support',
    '@alfalab/postcss-custom-properties',
    '@rspack/cli',
    'autoprefixer',
    'babel-core',
    'core-js',
    'imagemin',
    'imagemin-svgo',
    'mini-svg-data-uri',
    'postcss-calc',
    'postcss-color-function',
    'postcss-color-mod-function',
    'postcss-custom-media',
    'postcss-custom-properties',
    'postcss-discard-comments',
    'postcss-each',
    'postcss-for',
    'postcss-import',
    'postcss-inherit',
    'postcss-mixins',
    'postcss-nested',
    'postcss-omit-import-tilde',
    'postcss-remove-root',
    'postcss-strip-units',
    'postcss-url',
    'rimraf',
    'strip-ansi',
    'style-loader',
    'swc-plugin-coverage-instrument',
    'terser-webpack-plugin',
    'vite-tsconfig-paths',
    '@types/compression-webpack-plugin',
    '@types/tar',
];

export default {
    ...baseConfig,
    // patchMainWebpackConfigForModules - deprecated-алиас для обратной совместимости
    exclude: ['duplicates'],
    workspaces: {
        '.': {
            entry: ['eslint.config.mts', 'eslint.shared.mts'],
            // prettier нужен в корне, чтобы npx в git-хуках не подхватил версию из changesets
            ignoreDependencies: ['prettier', 'conventional-changelog-cli'],
        },
        'packages/*': {
            entry: presetEntry,
        },
        'packages/arui-scripts': {
            entry: [
                ...presetEntry,
                // cli и конфиг vitest публикуются из build: сопоставить их с исходниками
                // knip не может, потому что outDir задан в tsconfig-local.json
                'src/bin/index.ts',
                'src/configs/vitest/config.ts',
            ],
            ignoreDependencies: buildToolDependencies,
        },
        'packages/arui-scripts-server': {
            // адаптеры подключаются потребителями напрямую, см. README пакета
            entry: [...presetEntry, 'src/express.ts', 'src/hapi-16.ts', 'src/hapi-20.ts'],
            ignoreDependencies: ['@types/express', '@types/hapi16', '@types/hapi20', 'express'],
        },
        'packages/create-arui-scripts-app': {
            entry: presetEntry,
            // в assets лежит вендоренный релиз yarn для создаваемых проектов
            ignore: ['assets/**'],
        },
        'packages/example': {
            entry: [
                ...presetEntry,
                // точки входа приложения-примера заданы в arui-scripts.config.ts
                'src/client.tsx',
                'src/polyfills.js',
                'src/worker.ts',
            ],
            ignoreDependencies: [
                '@alfalab/scripts-server',
                // тип RuleSetRule в arui-scripts.overrides.ts импортируется только для типизации
                'webpack',
                'express',
                'lodash',
                'react-compiler-runtime',
                '@types/express',
                '@types/lodash',
                'postcss-preset-env',
            ],
        },
        'packages/example-modules': {
            entry: [
                ...presetEntry,
                'src/client.tsx',
                'src/bootstrap.tsx',
                'src/components/app.tsx',
                'src/server/read-assets.ts',
            ],
            ignoreDependencies: [
                '@alfalab/scripts-modules',
                '@alfalab/scripts-server',
                // тип RuleSetRule в arui-scripts.overrides.ts импортируется только для типизации
                'webpack',
                'body-parser',
                'express',
                'lodash',
                '@types/enzyme',
                '@types/express',
                '@types/lodash',
                'enzyme',
                'enzyme-adapter-react-16',
            ],
        },
    },
} satisfies KnipConfig;
