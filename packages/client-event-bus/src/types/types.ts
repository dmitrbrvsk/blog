import { type AbstractAppEventBus, type AbstractKnownEventTypes } from './abstract-types';

declare global {
    /* eslint-disable @typescript-eslint/naming-convention,no-underscore-dangle,vars-on-top -- имя глобальной переменной задано контрактом event-bus */
    var __alfa_event_buses: Record<string, AbstractAppEventBus<AbstractKnownEventTypes>>;
    /* eslint-enable @typescript-eslint/naming-convention,no-underscore-dangle,vars-on-top -- имя глобальной переменной задано контрактом event-bus */
}
