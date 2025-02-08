/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/tests/**.test.*'],
        deps: {
            moduleDirectories: ['node_modules', 'src'],
        },
    },
});
