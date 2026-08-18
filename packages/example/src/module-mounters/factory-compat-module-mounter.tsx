import React from 'react';

import { Button } from '@alfalab/core-components/button';
import { Spinner } from '@alfalab/core-components/spinner';
import { Typography } from '@alfalab/core-components/typography';
import { Underlay } from '@alfalab/core-components/underlay';
import {
    createModuleFetcher,
    createModuleLoader,
    type FactoryModule,
    useModuleFactory,
} from '@alfalab/scripts-modules';

const loader = createModuleLoader<FactoryModule>({
    hostAppId: 'example',
    moduleId: 'FactoryModuleCompat',
    getModuleResources: createModuleFetcher({
        baseUrl: 'http://localhost:8082',
    }),
});

// useModuleFactory намеренно отдаёт экспорт модуля как any, чтобы не ломать
// выведение типов у потребителей, поэтому форму модуля описываем на месте
type CompatModule = {
    saySomething: () => void;
};

export const FactoryCompatModuleMaunter = () => {
    const factory = useModuleFactory({ loader });
    const { loadingState } = factory;
    const module = factory.module as CompatModule | undefined;

    return (
        <Underlay
            padding='m'
            backgroundColor='info'
            shadow='shadow-s'
            borderSize={1}
            borderRadius='m'
        >
            <div>
                {loadingState === 'pending' && <Spinner size='m' />}
                {loadingState === 'rejected' && <div>Failed to load module</div>}

                {module && (
                    <pre>
                        {JSON.stringify(
                            module,
                            (key, value) =>
                                typeof value === 'function' ? `[Function ${value.name}]` : value,
                            2,
                        )}
                    </pre>
                )}

                <Typography.Text tag='div'>
                    Снизу кнопка, на которую навешена функция из модуля
                </Typography.Text>
                <Button onClick={module?.saySomething}>Сказать</Button>
            </div>
        </Underlay>
    );
};
