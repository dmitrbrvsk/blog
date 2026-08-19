export function storeIndexTemplate(): string {
    return `import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { postsApi } from './posts-api';

const rootReducer = combineReducers({
    [postsApi.reducerPath]: postsApi.reducer,
});

export function makeStore(preloadedState?: Partial<RootState>) {
    return configureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(postsApi.middleware),
        preloadedState,
    });
}

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
`;
}

export function storeHooksTemplate(): string {
    return `import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
`;
}
