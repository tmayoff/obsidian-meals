import { SuggestModal, requestUrl } from 'obsidian';
import { type Recipe, format, scrape } from 'recipe-rs';
import type { Context } from '../context';
import { AppendMarkdownExt, NoteExists, OpenNotePath } from '../utils/filesystem';
import { get } from 'svelte/store';

class DownloadRecipeModal extends SuggestModal<string> {
    query = '';
    context: Context;

    constructor(ctx: Context) {
        super(ctx.app);
        this.context = ctx;
    }

    getSuggestions(query: string): string[] | Promise<string[]> {
        this.query = query;
        return ['download'];
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.createEl('div', { text: value });
    }

    async onChooseSuggestion(item: string, _evt: MouseEvent | KeyboardEvent) {
        if (item === 'download') {
            await DownloadRecipe(this.context, this.query);
        }
    }
}

export function DownloadRecipeCommand(ctx: Context) {
    new DownloadRecipeModal(ctx).open();
}

async function DownloadRecipe(ctx: Context, url: string) {
    const dom = await requestUrl(url).text;
    const recipe: Recipe = scrape(url, dom);

    const formatted: string = format(recipe);

    const newRecipeNotePath = AppendMarkdownExt(`${get(ctx.settings).recipeDirectory}/${recipe.name}`);
    if (NoteExists(ctx.app, newRecipeNotePath)) {
        console.error('Recipe with that name already exists');
        await OpenNotePath(ctx.app, newRecipeNotePath);
        return;
    }

    let content = '---\n';
    content += `source: ${url}\n`;
    content += '---\n';

    content += '\n';
    content += formatted;

    await ctx.app.vault.create(newRecipeNotePath, content);

    await OpenNotePath(ctx.app, newRecipeNotePath);
}
