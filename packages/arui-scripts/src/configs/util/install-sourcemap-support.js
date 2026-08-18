/* eslint-disable import-x/no-extraneous-dependencies -- source-map-support опционален, его добавляет само приложение */

try {
    require('source-map-support').install();
} catch {
    console.error(
        'unable to install source map support. Please add `source-map-support` as a dependency.',
    );
}
