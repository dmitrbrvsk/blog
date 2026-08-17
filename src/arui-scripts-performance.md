# Оптимизации arui-scripts: где ещё теряется время и размер у потребителей

Разбор `arui-scripts@23.5.1` (`packages/arui-scripts`) с точки зрения тех, кто собирает приложения этим тулингом. Цель — не «переписать сборщик», а найти изменения, которые дадут профит сразу многим проектам: быстрее `yarn start` / `yarn build`, меньше бандл, короче CI и Docker.

Исходники: [core-ds/arui-scripts](https://github.com/core-ds/arui-scripts/tree/master/packages/arui-scripts).

## Что уже хорошо

За последние мажорные релизы основная работа по скорости уже сделана:

- Сборщик — **Rspack 2**, трансформер по умолчанию — **SWC** (`codeLoader: 'swc'`, `jestCodeTransformer: 'swc'`). На больших проектах это давало до ~2× относительно Babel.
- Клиент и сервер собираются **параллельно** отдельными процессами.
- Typecheck в dev вынесен в отдельный `tsc --watch --noEmit --skipLibCheck` (`disableDevRspackTypecheck: true`).
- Полифилы больше не обязательны: `clientPolyfillsEntry` по умолчанию пустой.
- JS в production минифицируется нативным `SwcJsMinimizerRspackPlugin`.
- Nginx отдаёт заранее сжатые файлы (`gzip_static` / `brotli_static`).
- Есть Vitest как быстрая альтернатива Jest.

Дальше — то, что всё ещё стоит времени или байт на каждом потребителе.

---

## Приоритет 1. Профит на каждом `yarn build` / CI

Это изменения в дефолтах arui-scripts. Потребителю ничего делать не нужно, кроме обновления пакета.

Прогресс:

- [x] 1. Persistent cache + `compiler.close()` — **только dev**
- [x] 2. Brotli quality 5–6, не сжимать PNG — **не делаем**
- [x] 3. Урезать `stats` в prod и watch
- [x] 4. `builtin:swc-loader` для `node_modules`
- [x] 5. Починить печать gzip-размеров
- [x] 6. Поправить доку

### 1. Persistent cache в Rspack 2 не включён

**Решение: делаем, только для dev.** `yarn build` / `start:prod` / CI без дискового кеша — сборка остаётся воспроизводимой.

В Rspack 2 `cache: true` — это **только memory-cache текущего процесса**. Диск появляется только при `{ type: 'persistent' }`. После рестарта `yarn start` компиляция снова холодная.

Что сделано:

- `getRspackCache(mode, name)` включает `{ type: 'persistent' }` только при `mode === 'dev'`, иначе `false`.
- Отдельные имена кеша: `client-dev`, `client-dev-<configName>` для compat-модулей, `server-dev`.
- `version` = версия arui-scripts; `buildDependencies` — конфиг, overrides, пресеты, `tsconfig.json`, `package.json` самого пакета.
- Yarn cache помечен как `immutablePaths`, чтобы не хешировать `.yarn/cache`.
- При Ctrl+C / SIGTERM компилятор закрывается (`compiler.close()`), иначе Rspack может не дописать кеш на диск.
- `caveats.md` описывает путь `node_modules/.cache/rspack` и как сбросить кеш.

Патч: [`src/arui-scripts-patches/01-dev-persistent-cache.patch`](./arui-scripts-patches/01-dev-persistent-cache.patch).

Ожидаемый эффект: повторный `yarn start` на той же машине — секунды вместо холодной сборки. Production не меняется.

### 2. Brotli quality 11 в пайплайне сборки

**Решение: не делаем.** Оставляем quality 11 и gzip PNG как есть — максимальное сжатие важных ассетов важнее минут на CI.

```ts
new CompressionPlugin({
  algorithm: 'brotliCompress',
  compressionOptions: {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  },
  test: /\.(js|css|html|svg|dict)$/,
})
```

Quality 11 — максимальный, на больших JS/CSS это минуты CPU. Nginx всё равно отдаёт `.br` через `brotli_static`, поэтому прекомпресс нужен, но **не любой ценой**.

Практика: quality **5–6** даёт почти тот же размер на текстовых ассетах и собирается на порядок быстрее. 11 оставить опцией (`compression.brotliQuality`) для тех, кому важны последние килобайты.

Дополнительно gzip гоняет PNG (`test: /\.js$|\.css$|\.png$|\.svg$/`). PNG уже сжат, gzip по нему почти ничего не даёт, только время. Проверку `checkNodeVersion(10)` перед Brotli можно выкинуть: Node 20+/22+ всегда проходит.

### 3. Полные `source-map` в production

```ts
devtool: mode === 'dev' ? configs.devSourceMaps : 'source-map',
```

Полные source map — один из самых дорогих этапов prod-сборки (и по CPU, и по диску). Для клиента достаточно `hidden-source-map` (те же map-файлы, без `sourceMappingURL` в бандле). Для сервера — `cheap-module-source-map` или отдельный флаг.

Имеет смысл вынести `prodSourceMaps` в настройки, по аналогии с `devSourceMaps`. Сейчас это можно поменять только оверрайдом.

### 4. `stats.toJson({})` и болтливый вывод в dev

**Решение: делаем.** Только эти два места: `toJson` в prod-сборке и `modules` в watch. `bundle-analyze` и печать размеров ассетов не трогаем.

После успешной prod-сборки сообщения собираются так:

```ts
const messages = formatWebpackMessages(stats?.toJson({}));
```

Стало:

```ts
stats?.toJson({
    all: false,
    errors: true,
    warnings: true,
    errorDetails: true,
})
```

В print на каждый rebuild `statsOptions.modules` с `true` на `false`.

Патч: [`src/arui-scripts-patches/03-trim-stats.patch`](./arui-scripts-patches/03-trim-stats.patch).

### 5. CSS всё ещё на JS-стеке webpack-эпохи

JS уже на `builtin:swc-loader` + `SwcJsMinimizerRspackPlugin`. CSS — нет:

- цепочка из ~15 PostCSS-плагинов, включая устаревшие `postcss-color-function` и `postcss-color-mod-function`;
- `css-loader` + `postcss-loader` вместо native CSS Rspack (`experiments.css` явно выключен);
- минификация через `css-minimizer-webpack-plugin` (cssnano), хотя у Rspack есть `LightningCssMinimizerRspackPlugin`.

PostCSS полностью выкинуть нельзя: mixins / custom-media / тема `core-components` / `postcss-global-variables` — реальный контракт с дизайн-системой. Но **autoprefixer + minify** можно отдать Lightning CSS, а calc/nested — тоже: это обычно самая дорогая часть.

Отдельный runtime-эффект: `keepCssVars: false` по умолчанию. CSS-переменные инлайнятся (`postcss-custom-properties`, `preserve: false`). Это наследие IE11. При `iOS >= 14` переменные поддерживаются везде; инлайн раздувает CSS (особенно с `core-components`). Дефолт `keepCssVars: true` уменьшит CSS и уберёт два плагина из критического пути.

### 6. `vendor` + `commons` с `minSize: 0`

```ts
splitChunks: {
  chunks: 'all',
  cacheGroups: {
    commons: { chunks: 'initial', minChunks: 2, minSize: 0 },
    vendor: {
      test: /node_modules/,
      chunks: 'initial',
      name: 'vendor',
      priority: 10,
      enforce: true,
    },
  },
}
```

`enforce: true` + один `vendor` для всего `node_modules`:

- любой bump зависимости инвалидирует весь vendor у всех пользователей;
- на HTTP/2 один гигантский chunk хуже нескольких средних;
- `minSize: 0` плодит микрочанки.

Дефолтный `splitChunks: { chunks: 'all' }` у Rspack обычно даёт и лучше кеширование, и меньше работы на split. Текущую схему оставить оверрайдом для тех, кому нужен один `vendor.js`.

---

## Приоритет 2. Быстрее `yarn start` (HMR и первый старт)

### 7. Lazy compilation выключен

Rspack умеет `experiments.lazyCompilation`. Клиентские роуты и редко открываемые экраны не компилируются, пока их не запросят. На больших SPA это главный рычаг cold start.

Включать только для клиента, не для сервера (SSR/Node entry должен быть собран целиком). Для Module Federation — осторожно, remote entry лучше оставить eager.

### 8. `node_modules` клиента идут через JS `swc-loader`

**Решение: делаем.** На клиенте `getExternalCodeLoader` переведён на `builtin:swc-loader` без опций — как уже сделано на сервере. `cacheDirectory` / `cacheCompression` не переносим: это опции babel-loader, у SWC их нет. `swcClientConfig` не добавляем — его и раньше здесь не было.

Патч: [`src/arui-scripts-patches/04-builtin-swc-loader-externals.patch`](./arui-scripts-patches/04-builtin-swc-loader-externals.patch).

### 9. JS-плагины, которые можно заменить или выключить

| Сейчас | Зачем | Что лучше |
| --- | --- | --- |
| `HtmlWebpackPlugin` | HTML в `clientOnly` | `HtmlRspackPlugin` (Rust) |
| `CaseSensitivePathsPlugin` | опечатки в регистре | встроенная проверка Rspack / `snapshot` |
| `WatchMissingNodeModulesPlugin` | CRA-наследие | Rspack и так пересобирается после `yarn add` |
| `WebpackDeduplicationPlugin` | дедуп по `yarn.lock` | полезен для **размера**, но парсит lockfile на каждую сборку; не работает с npm/pnpm |
| `ProvideSharedPlugin({ provides: {} })` | совместимость с WMF | лишний runtime **во всех** приложениях, даже без модулей |

Пустой `ProvideSharedPlugin` особенно показателен: его добавляют, потому что «webpack всегда добавлял sharing runtime». Для приложений без `modules` / `compatModules` это лишние байты в каждом бандле. Достаточно не добавлять его, если `disableModulesSupport` или модули не настроены.

### 10. Старт CLI: `ts-node` с `ignore: []`

```ts
require('ts-node').register({
  transpileOnly: true,
  ignore: [],
  skipProject: true,
  // ...
});
```

`ignore: []` отключает дефолтный `/node_modules/` — ts-node готов транспилить всё, включая пресеты из зависимостей. Это удобно, но на каждый `arui-scripts *` платится старт Node + ts-node дважды (клиент и сервер — отдельные процессы).

На Node 22+ достаточно native type stripping. На 20 — `jiti` / `tsx`. Плюс клиент и сервер заново читают `package.json`, пресеты, overrides. Можно вынести загрузку конфига в один процесс и форкать компиляторы уже с готовым JSON.

`pathinfo: true` на сервере даже в production — мелочь, но в watch даёт лишнюю работу.

---

## Приоритет 3. Размер бандла и runtime у пользователей

Сборка — не только wall-clock. Потребители платят и в браузере.

### 11. Browserslist слишком широкий

```ts
['last 2 versions', 'not dead', 'Android >= 6', 'iOS >= 14']
```

Android 6 (2015) тянет трансформы и (при `core-js`) полифилы, которые не нужны `iOS >= 14` и современным Chrome. SWC `env.mode: 'entry'` смотрит на этот список.

Сужение до чего-то вроде `defaults, iOS >= 15, Android >= 10, not dead` уменьшает и время транспиляции, и размер JS. Это breaking change по поддержке браузеров — лучше новая настройка / мажор, а не тихий дефолт.

`core-js` в зависимостях arui-scripts — `3.32.0` (2023). Babel `corejs: '3.32'` зашит отдельно. Рассинхрон с тем, что стоит в приложении, даёт лишние/неполные полифилы.

### 12. Jest по умолчанию, хотя Vitest уже есть

`arui-scripts test` → Jest. `test:vitest` — отдельная команда. На типичном юнит-сьюте Vitest + Vite-трансформ заметно быстрее `@swc/jest` в Jest, плюс не тащит второй рантайм.

Имеет смысл:

- сделать Vitest рекомендованным путём в доке и в `create-arui-scripts-app`;
- подтянуть `docs/commands.md`: там до сих пор написано, что JS идёт через Babel, а TS — через `tsc`. Сейчас дефолт — SWC.

`globals['ts-jest']` в jest-preset при дефолтном SWC — мёртвый конфиг.

### 13. Картинки: imagemin вместо sharp

`image-minimizer-webpack-plugin` + `imagemin` + svgo. JPEG/PNG по умолчанию выключены (правильно для закрытых контуров: бинарники `cjpeg` качаются с сети). SVG включён.

`imagemin` медленный и плохо живёт в современных Node. Для тех, кто включает jpg/png, `sharp` быстрее на порядок. Даже svgo можно гонять через `svgo` напрямую, без imagemin-обёртки.

### 14. Docker: холодная сборка и толстый context

`docker-build`:

1. удаляет `.build`;
2. `npm run build` без кеша;
3. `yarn workspaces focus --production` (или аналог);
4. `docker build` с `ADD . /src` — в образ часто уезжает весь `node_modules`.

Профит для потребителей:

- не удалять `.build`, если вызывающий CI уже собрал проект;
- по умолчанию рекомендовать `docker-build:compiled` (node_modules в ignore);
- генерировать `.dockerignore` с `.git`, тестами, `.cache`, coverage;
- `ADD` только `.build` + production-зависимости, а не весь репозиторий;
- не гонять `docker version` два раза через `shelljs` на каждый билд.

`start.sh` вычитает 100 МБ из cgroup limit под nginx — это runtime, не сборка, но на маленьких лимитах (256–512 МБ) Node получает слишком мало. Имеет смысл сделать запас настраиваемым.

---

## Приоритет 4. Долг, который мешает оптимизациям

Мелочи, из-за которых сложно ускорять дальше и легко словить ложные дефолты.

- Документация говорит, что `devSourceMaps` по умолчанию `inline-cheap-source-map`. В коде — `cheap-module-source-map`. **Сделано:** в `settings.md` указан `cheap-module-source-map`.
- `style-loader` в зависимостях, в клиентском конфиге не используется (везде `CssExtractRspackPlugin`).
- `@babel/core` запинен на `7.22.10`, остальной Babel — `^7.23` / `^7.26`.
- `fs-extra@6`, `rimraf@2`, `chalk@2`, `null-loader@0.1.1` — не про скорость, но раздувают install у каждого потребителя.
- `statsOptions` существует, но prod-сборка его не использует.
- Баг в печати размеров: gzip берётся из `asset.brSize`, а не `gzipSize` — потребители видят неверные цифры и принимают решения по «сжатию» вслепую.

**Решение: делаем.** `const gzipSize = asset.gzipSize || size`.

Патч: [`src/arui-scripts-patches/05-fix-gzip-size-print.patch`](./arui-scripts-patches/05-fix-gzip-size-print.patch).

- `overrides.md` до сих пор описывает ключи `webpack*`. В 23.x они deprecated. **Сделано:** актуальные ключи `rspack*`, webpack* описаны как deprecated.

Патч доки: [`src/arui-scripts-patches/06-fix-docs.patch`](./arui-scripts-patches/06-fix-docs.patch).

---

## Что потребитель может сделать сегодня, не дожидаясь релиза

Через `arui-scripts.overrides.ts` уже можно снять часть боли.

**Сузить браузеры** (меньше трансформов и полифилов):

```ts
const overrides: OverrideFile = {
  supportingBrowsers: () => ['last 2 Chrome versions', 'last 2 Firefox versions', 'iOS >= 15', 'not dead'],
};
```

**Облегчить source map в prod:**

```ts
rspackClientProd: (config) => {
  const apply = (c: Configuration) => { c.devtool = 'hidden-source-map'; return c; };
  return Array.isArray(config) ? config.map(apply) : apply(config);
},
```

**Не инлайнить CSS-переменные:**

```ts
// arui-scripts.config.ts
export default { keepCssVars: true };
```

**Не тащить sharing-runtime, если модулей нет:**

```ts
export default { disableModulesSupport: true };
```

**Не собирать сервер, если его нет:**

```ts
export default { clientOnly: true };
```

**Тесты — Vitest, не Jest:** `arui-scripts test:vitest`.

**Docker:** `arui-scripts docker-build:compiled` вместо `docker-build`, если сборка уже прошла в CI.

**Brotli / splitChunks / cache** — через `rspackClientProd`, пока нет первоклассных настроек.

---

## Рекомендуемый порядок работ в самом arui-scripts

Сгруппировано по отношению «инвазивность → профит для всех потребителей».

1. **Без breaking changes, большой профит**
   - persistent cache в dev + `compiler.close()` при остановке `yarn start`;
   - ~~brotli quality 5–6, не сжимать PNG~~ — решили не трогать;
   - `stats.toJson` только errors/warnings, `modules: false` в watch — сделано;
   - `builtin:swc-loader` для `node_modules` — сделано;
   - починить печать gzip-размеров — сделано;
   - поправить доку (`devSourceMaps`, `commands.md`, ключи rspack) — сделано.

2. **Совместимо, но уже заметно в бандле/CSS**
   - `LightningCssMinimizerRspackPlugin` вместо cssnano;
   - `HtmlRspackPlugin`;
   - `keepCssVars: true` (или хотя бы предупреждение);
   - не вешать пустой `ProvideSharedPlugin`;
   - `prodSourceMaps` как настройка;
   - поднять Rspack 2.0 → 2.1 (нативный React Compiler, cache cleanup).

3. **Нужна миграция / мажор**
   - дефолтный `splitChunks` без единого `vendor`;
   - ужесточить browserslist;
   - lazy compilation в `start`;
   - Vitest как основной тестовый раннер;
   - Docker: compiled-flow по умолчанию, нормальный `.dockerignore`;
   - убрать ts-node в пользу native strip / jiti.

---

## Итог

arui-scripts уже не webpack-монолит 2018 года: Rspack + SWC закрывают самую больную часть. То, что осталось, — **настройки эпохи webpack 4/IE11**, которые крутятся на каждом приложении банка:

- memory-cache вместо persistent;
- brotli 11 и полные source map в CI;
- PostCSS+cssnano вместо Lightning CSS;
- один вечный `vendor.js`;
- browserslist с Android 6;
- инлайн CSS-переменных;
- sharing-runtime даже без модулей.

Именно эти дефолты умножаются на число репозиториев-потребителей. Точечные изменения в `packages/arui-scripts` дадут больше суммарного профита, чем локальные оверрайды в каждом сервисе.
