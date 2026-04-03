/// <reference types="vitest" />

import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            obsidian: path.resolve(__dirname, 'src/tests/__mocks__/obsidian.ts'),
        },
    },
    test: {
        include: ['src/tests/**.test.*'],
        deps: {
            moduleDirectories: ['node_modules', 'src'],
        },
    },
});
