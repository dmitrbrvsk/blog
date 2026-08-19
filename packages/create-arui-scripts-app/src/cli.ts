import { createProgram } from './create-program.js';
import { printError } from './ui.js';

createProgram()
    .parseAsync(process.argv)
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);

        printError(message);
        process.exit(1);
    });
