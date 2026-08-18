import { type Compiler } from '@rspack/core';
import cluster, { type Worker } from 'node:cluster';
import path from 'node:path';

const defaultOptions = {
    script: 'server.js',
};

export class ReloadServerPlugin {
    workers: Worker[] = [];

    done: null | (() => void) = null;

    constructor({ script } = defaultOptions) {
        cluster.setupMaster({
            exec: path.resolve(process.cwd(), script),
        });

        cluster.on('online', (worker) => {
            this.workers.push(worker);

            if (this.done) {
                this.done();
            }
        });
    }

    apply(compiler: Compiler) {
        compiler.hooks.afterEmit.tapAsync('ReloadServerPlugin', (compilation, callback) => {
            this.done = callback;
            for (const worker of this.workers) {
                try {
                    if (worker.process.pid) {
                        process.kill(worker.process.pid, 'SIGTERM');
                    }
                } catch {
                    console.warn(`Unable to kill process #${worker.process.pid}`);
                }
            }

            this.workers = [];

            cluster.fork();
        });
    }
}
