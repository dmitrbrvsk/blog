import { type RegisterOptions } from 'ts-node';

// Мы используем ts-node для работы c конфигами, описаными на ts
const { register } = require('ts-node') as {
    register: (options: RegisterOptions) => void;
};

register({
    transpileOnly: true,
    ignore: [],
    compilerOptions: {
        target: 'esnext',
        module: 'esnext',
        skipLibCheck: true,
        allowJs: false,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'bundler',
        esModuleInterop: true,
    },
    skipProject: true,
});
