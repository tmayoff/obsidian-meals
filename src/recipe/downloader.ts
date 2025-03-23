import { type App, Modal, SuggestModal, getFrontMatterInfo, parseYaml, requestUrl } from 'obsidian';
import { type Recipe, format, scrape } from 'recipe-rs';
import { get } from 'svelte/store';
import { Err, Ok, type Result } from 'ts-results-es';
import type { Context } from '../context.ts';
import { AppendMarkdownExt, NoteExists, OpenNotePath } from '../utils/filesystem.ts';
import { ErrCtx } from '../utils/result.ts';
import type { Recipe as MealsRecipe } from './recipe.ts';

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

interface DownloadedContent {
    recipeName: string;
    recipeContent: string;
}

async function Download(url: string): Promise<Result<DownloadedContent, ErrCtx>> {
    const dom = await requestUrl(url).text;

    let recipe: Recipe | null = null;
    let formatted = '';
    try {
        recipe = scrape(url, dom);
        formatted = format(recipe);
    } catch (exception) {
        console.error(exception);
        return Err(new ErrCtx(`${exception}`, ''));
    }

    const sanitized = recipe.name.replace(/[:?\/<>"\|\*\\-]/gi, ' ').trim();

    return Ok({ recipeName: sanitized, recipeContent: formatted });
}

async function DownloadRecipe(ctx: Context, url: string) {
    const result = await Download(url);
    if (result.isErr()) {
        new ErrorDialog(ctx.app, `${result.error}`).open();
        return;
    }

    const { recipeName, recipeContent } = result.unwrap();

    const newRecipeNotePath = AppendMarkdownExt(`${get(ctx.settings).recipeDirectory}/${recipeName}`);
    if (NoteExists(ctx.app, newRecipeNotePath)) {
        new ErrorDialog(ctx.app, 'Recipe with that name already exists').open();
        await OpenNotePath(ctx.app, newRecipeNotePath);
        return;
    }

    let content = '---\n';
    content += `source: ${url}\n`;
    content += '---\n';

    content += '\n';
    content += recipeContent;

    await ctx.app.vault.create(newRecipeNotePath, content);

    await OpenNotePath(ctx.app, newRecipeNotePath);
}

export async function RedownloadRecipe(ctx: Context, recipe: MealsRecipe) {
    const frontmatter = parseYaml(getFrontMatterInfo(await ctx.app.vault.cachedRead(recipe.path)).frontmatter);

    const sourceUrl = frontmatter.source;

    try {
        const url = new URL(sourceUrl);

        const result = await Download(url.toString());
        if (result.isErr()) {
            new ErrorDialog(ctx.app, `${result.error}`).open();
            return;
        }

        const { recipeName, recipeContent } = result.unwrap();
        console.log('Redownload the recipe', recipeName, recipeContent);
    } catch {
        new ErrorDialog(ctx.app, `Source URL: ${sourceUrl} is not a valid URL`).open();
    }
}
