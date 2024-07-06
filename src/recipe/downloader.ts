import { type App, Modal, SuggestModal, requestUrl } from 'obsidian';
import { type Recipe, format, scrape } from 'recipe-rs';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { AppendMarkdownExt, NoteExists, OpenNotePath } from '../utils/filesystem';

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

class ErrorDialog extends Modal {
    message = 'unknown error';

    constructor(app: App, message: string) {
        super(app);
        this.message = message;
    }

    onOpen() {
        this.contentEl.createEl('h4', { text: 'An error occured' });
        this.contentEl.createEl('p', { text: this.message });
        this.contentEl.createEl('a', {
            href: 'https://github.com/tmayoff/recipe-rs/issues/new',
            text: 'Please make an issue here so I can help resolve the issue',
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}

export function DownloadRecipeCommand(ctx: Context) {
    new DownloadRecipeModal(ctx).open();
}

async function DownloadRecipe(ctx: Context, url: string) {
    const dom = await requestUrl(url).text;

    let recipe: Recipe | null = null;
    let formatted = '';
    try {
        recipe = scrape(url, dom);
        formatted = format(recipe);
    } catch (exception) {
        new ErrorDialog(ctx.app, `${exception}`).open();
        return;
    }

    const newRecipeNotePath = AppendMarkdownExt(`${get(ctx.settings).recipeDirectory}/${recipe.name}`);
    if (NoteExists(ctx.app, newRecipeNotePath)) {
        new ErrorDialog(ctx.app, 'Recipe with that name already exists').open();
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
