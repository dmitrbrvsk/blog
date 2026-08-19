import { createProgram } from './create-program';
import { printError } from './ui';

createProgram()
    .parseAsync(process.argv)
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);

        printError(message);
        process.exit(1);
    });
