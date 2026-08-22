// Фрагмент для packages/arui-scripts/src/templates/dockerfile-compiled.template.ts
// и packages/arui-scripts/src/commands/util/docker-build.ts
//
// 1) COPY вместо ADD, cache mount вместо yarn cache clean --all.
// 2) DOCKER_BUILDKIT=1 + inline cache в getDockerBuildCommand.

const compiledInstallLayerExample = `
COPY --chown=nginx:nginx package.json yarn.lock .yarnrc.yml .yarn /src/
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \\
    --mount=type=cache,target=/root/.npm \\
    ln -sf /src/.yarn/releases/yarn-x.cjs /usr/local/bin/yarn && \\
    yarn workspaces focus --production --all
COPY --chown=nginx:nginx . /src
`;

const dockerBuildCommandExample = `
DOCKER_BUILDKIT=1 docker build --platform linux/x86_64 \\
  --cache-from type=registry,ref=\${imageFullName} \\
  --build-arg BUILDKIT_INLINE_CACHE=1 \\
  -f "./\${tempDirName}/Dockerfile" \\
  --build-arg START_SH_LOCATION="./\${tempDirName}/start.sh" \\
  --build-arg NGINX_CONF_LOCATION="./\${tempDirName}/nginx.conf" \\
  --build-arg NGINX_BASE_CONF_LOCATION="./\${tempDirName}/base-nginx.conf" \\
  -t \${imageFullName} .
`;

void compiledInstallLayerExample;
void dockerBuildCommandExample;
