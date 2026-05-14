// eslint.config.mjs
import tsparser from '@typescript-eslint/parser';
import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
    { ignores: ['src/tests/**', '**/*.test.ts'] },
    ...obsidianmd.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: { project: './tsconfig.json' },
        },
    },
]);
