import { type ModuleResources } from '../types';

const modulesCache: Record<string, Record<string, ModuleResources>> = {};

export function getModulesCache() {
    return modulesCache;
}

const modulesCleanupMethods: Record<string, () => void> = {};

export function cleanupModule(moduleId: string) {
    if (modulesCache[moduleId]) {
        delete modulesCache[moduleId];
    }

    if (modulesCleanupMethods[moduleId]) {
        modulesCleanupMethods[moduleId]();
        delete modulesCleanupMethods[moduleId];
    }
}

export function cleanupModulesCache() {
    for (const key of Object.keys(modulesCache)) {
        delete modulesCache[key];
    }

    for (const key of Object.keys(modulesCleanupMethods)) {
        modulesCleanupMethods[key]();
        delete modulesCleanupMethods[key];
    }
}

export function addCleanupMethod(moduleId: string, cleanupFn: () => void) {
    modulesCleanupMethods[moduleId] = cleanupFn;
}
