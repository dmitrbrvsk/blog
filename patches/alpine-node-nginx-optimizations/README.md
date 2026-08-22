# Патчи для `packages/alpine-node-nginx`

Контекст и обоснование — в
[`docs/alpine-node-nginx-docker-optimizations.md`](../../docs/alpine-node-nginx-docker-optimizations.md).

Файлы ниже — готовые замены, не механический `git apply` ко всему монорепо.
Класть в `core-ds/arui-scripts` как есть:

| Файл здесь | Куда в arui-scripts |
|---|---|
| `Dockerfile-slim.incremental` | `packages/alpine-node-nginx/Dockerfile-slim` |
| `Dockerfile.incremental` | `packages/alpine-node-nginx/Dockerfile` |
| `Dockerfile-nginx-slim.incremental` | `packages/alpine-node-nginx/Dockerfile-nginx-slim` |
| `Dockerfile-slim.apk` | опциональный новый файл, пакетный nginx |
| `alpine-node.yml` | `.github/workflows/alpine-node.yml` |
| `alpine-nginx-slim.yml` | `.github/workflows/alpine-nginx-slim.yml` |

`*.incremental` сохраняют сборку nginx из исходников (нужна для
`brotli_auto_dictionary` из `ngx-brotli-cdt`). Убирают двойной `make`,
`nginx-debug`, глобальный npm, дубль `ADD nginx.conf` и недетерминированный
`apk upgrade`.

`Dockerfile-slim.apk` — альтернатива без компиляции. Не использовать как
замену slim, пока не проверено отсутствие `brotli_auto_dictionary` на проекте.
