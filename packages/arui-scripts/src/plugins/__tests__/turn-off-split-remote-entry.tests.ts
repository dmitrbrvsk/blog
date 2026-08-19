import { type Compiler } from '@rspack/core';

import { TurnOffSplitRemoteEntry } from '../turn-off-split-remote-entry';

function createChunk(name: string, isOnlyInitial = false) {
    return {
        name,
        isOnlyInitial: () => isOnlyInitial,
    };
}

type ChunkFilter = (chunk: ReturnType<typeof createChunk>) => boolean;

describe('TurnOffSplitRemoteEntry', () => {
    it('should skip when splitChunks is disabled', () => {
        const plugin = new TurnOffSplitRemoteEntry('remoteApp');
        const compiler = {
            options: {
                optimization: {
                    splitChunks: false,
                },
            },
        } as unknown as Compiler;

        expect(() => plugin.apply(compiler)).not.toThrow();
    });

    it('should keep remote entry out of splitChunks.chunks=all', () => {
        const plugin = new TurnOffSplitRemoteEntry('remoteApp');
        const splitChunks = {
            chunks: 'all' as const,
            cacheGroups: {
                vendors: {
                    chunks: 'all' as const,
                },
            },
        };
        const compiler = {
            options: {
                optimization: {
                    splitChunks,
                },
            },
        } as unknown as Compiler;

        plugin.apply(compiler);

        expect(typeof splitChunks.chunks).toBe('function');
        expect((splitChunks.chunks as unknown as ChunkFilter)(createChunk('remoteApp'))).toBe(
            false,
        );
        expect((splitChunks.chunks as unknown as ChunkFilter)(createChunk('main'))).toBe(true);
        expect(typeof splitChunks.cacheGroups.vendors.chunks).toBe('function');
        expect(
            (splitChunks.cacheGroups.vendors.chunks as unknown as ChunkFilter)(
                createChunk('remoteApp'),
            ),
        ).toBe(false);
    });

    it('should wrap custom chunks function and still exclude remote entry', () => {
        const plugin = new TurnOffSplitRemoteEntry('remoteApp');
        const prevChunks = jest.fn((chunk: { name: string }) => chunk.name === 'vendors');
        const splitChunks = {
            cacheGroups: {
                custom: {
                    chunks: prevChunks,
                },
            },
        };
        const compiler = {
            options: {
                optimization: {
                    splitChunks,
                },
            },
        } as unknown as Compiler;

        plugin.apply(compiler);

        expect(splitChunks.cacheGroups.custom.chunks(createChunk('remoteApp'))).toBe(false);
        expect(splitChunks.cacheGroups.custom.chunks(createChunk('vendors'))).toBe(true);
        expect(prevChunks).toHaveBeenCalled();
    });
});
