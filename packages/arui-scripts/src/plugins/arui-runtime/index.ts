import { type Compiler, RuntimeGlobals } from '@rspack/core';

import { RuntimeModule } from './arui-runtime-module';

export class AruiRuntimePlugin {
    apply(compiler: Compiler) {
        compiler.hooks.compilation.tap(this.constructor.name, (compilation) => {
            compilation.hooks.runtimeRequirementInTree
                .for(RuntimeGlobals.require)
                .tap(this.constructor.name, (chunk) => {
                    compilation.addRuntimeModule(chunk, new RuntimeModule());

                    return true;
                });
        });
    }
}

/**
 * Метод для вставки runtime чанков css в документ. Нужен для того, чтобы модули могли использовать shadow-dom.
 * Функция, которую возвращает этот метод - НЕ прогоняется через babel, поэтому он должен быть написан на чистом js,
 * без использования синтаксиса, который не поддерживается браузерами.
 * Более того, мы не можем использовать импорты или require внутри, это так же сломает сборку.
 */
type AruiRuntimeScope = {
    $ARUI?: {
        scriptSource?: HTMLScriptElement;
    };
};

export function getInsertCssRuntimeMethod(): (linkTag: HTMLLinkElement) => void {
    /* eslint-disable no-var,vars-on-top */
    return function insertCssRuntime(linkTag) {
        // $ARUI в рантайм добавляет RuntimeModule этого плагина, в типах webpack его нет
        var aruiScope = __webpack_require__ as unknown as AruiRuntimeScope;

        var scriptSource = aruiScope.$ARUI?.scriptSource;

        if (scriptSource) {
            var targetElementSelector = scriptSource.dataset.resourcesTargetSelector;

            if (targetElementSelector) {
                var targetElement = document.querySelector(targetElementSelector);

                if (targetElement) {
                    if (targetElement.shadowRoot) {
                        targetElement.shadowRoot.append(linkTag);

                        return;
                    }
                    targetElement.append(linkTag);

                    return;
                }
            }
        }
        document.head.append(linkTag);
    };
    /* eslint-enable no-var,vars-on-top */
}
