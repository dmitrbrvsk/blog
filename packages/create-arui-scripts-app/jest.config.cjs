const path = require('path');

const chalkRoot = path.join(path.dirname(require.resolve('chalk', { paths: [__dirname] })), '..');

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    testTimeout: 15000,
    extensionsToTreatAsEsm: ['.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // chalk 6 uses package imports; Jest 28 не резолвит #subpath сам
        '^#ansi-styles$': path.join(chalkRoot, 'source/vendor/ansi-styles/index.js'),
        '^#supports-color$': path.join(chalkRoot, 'source/vendor/supports-color/index.js'),
    },
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
};
