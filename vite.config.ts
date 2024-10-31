import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import extractorSvelte from '@unocss/extractor-svelte';
import builtins from 'builtin-modules';
import { presetUno } from '@unocss/preset-uno';
import UnoCSS from 'unocss/vite';
import { type PluginOption, defineConfig } from 'vite';

const setOutDir = (mode: string) => {
    // biome-ignore lint/style/useDefaultSwitchClause: <explanation>
    switch (mode) {
        case 'development':
            return './test_vault/.obsidian/plugins/tmayoff-meals';
        case 'production':
            return './build';
    }
};

// biome-ignore lint/style/noDefaultExport: <explanation>
export default defineConfig(({ mode }) => {
    return {
        plugins: [
            UnoCSS({
                presets: [presetUno()],
                extractors: [extractorSvelte()],
            }),
            svelte({
                preprocess: vitePreprocess(),
                compilerOptions: {
                    customElement: true,
                },
            }) as PluginOption,
        ],
        test: {
            watch: false
        },
        build: {
            ssrEmitAssets: true,
            lib: {
                entry: 'src/main',
                formats: ['cjs'],
            },
            rollupOptions: {
                output: {
                    entryFileNames: 'main.js',
                    assetFileNames: 'styles.css',
                },
                external: [
                    'obsidian',
                    'electron',
                    '@codemirror/autocomplete',
                    '@codemirror/collab',
                    '@codemirror/commands',
                    '@codemirror/language',
                    '@codemirror/lint',
                    '@codemirror/search',
                    '@codemirror/state',
                    '@codemirror/view',
                    '@lezer/common',
                    '@lezer/highlight',
                    '@lezer/lr',
                    ...builtins,
                ],
            },
            outDir: setOutDir(mode),
            emptyOutDir: false,
            sourcemap: mode === 'production' ? false : 'inline',
        },
    };
});
