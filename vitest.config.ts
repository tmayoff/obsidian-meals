/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        include: ['src/tests/**.test.*'],
        deps: {
            moduleDirectories: ['node_modules', 'src'],
        },
    },
});
