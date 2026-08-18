import { type FactoryModule, type WindowWithModule } from '@alfalab/scripts-modules';

const factory: FactoryModule = (runParams, moduleState) => ({
    someData: 'Some data here',
    // eslint-disable-next-line no-alert -- модуль-пример демонстрирует вызов из хост-приложения
    saySomething: () => alert('something'),
    runParams,
    ...moduleState,
});

(window as WindowWithModule).FactoryModuleCompat = factory;
