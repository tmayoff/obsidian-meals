import { type App, getFrontMatterInfo, Modal, parseYaml, Setting, SuggestModal } from 'obsidian';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import { AppendMarkdownExt, NoteExists, OpenNotePath } from '../utils/filesystem.ts';
import { Download, DownloadRecipeFileContent, generateFrontmatter } from './downloader.ts';
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

class OverwriteDialog extends Modal {
    onConfirmPromise: any;

    onConfirm(): Promise<boolean> {
        return new Promise((resolve) => {
            this.onConfirmPromise = resolve;
        });
    }

    onOpen(): void {
        this.contentEl.createEl('h3', { text: 'OVERWITING!!!!' });
        this.contentEl.createEl('p', {
            text: "This file already contains a recipe that differs from what's downloaded. This can be reversed with the undo command (i.e. Ctrl+Z)",
        });
        this.contentEl.createEl('b', {
            text: 'Are you sure you want to overwrite the contents?',
        });

        new Setting(this.contentEl).addButton((btn) =>
            btn
                .setButtonText("Yes I'm sure")
                .setWarning()
                .onClick(() => {
                    this.onConfirmPromise(true);
                    this.close();
                }),
        );
        new Setting(this.contentEl).addButton((btn) =>
            btn
                .setButtonText("Nope, don't write anything")
                .setCta()
                .onClick(() => {
                    this.onConfirmPromise(false);
                    this.close();
                }),
        );
    }
}

export function DownloadRecipeCommand(ctx: Context) {
    new DownloadRecipeModal(ctx).open();
}

async function DownloadRecipe(ctx: Context, url: string) {
    const include_nutritional_information = get(ctx.settings).includeNutritionalInformation;

    const result = await DownloadRecipeFileContent(url, include_nutritional_information);
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

    await ctx.app.vault.create(newRecipeNotePath, recipeContent);
    await OpenNotePath(ctx.app, newRecipeNotePath);
}

export async function RedownloadRecipe(ctx: Context, mealsRecipe: MealsRecipe) {
    if (get(ctx.settings).debugMode) {
        console.debug('Redownloading recipe', mealsRecipe.name);
    }

    const frontmatter = getFrontMatterInfo(await ctx.app.vault.cachedRead(mealsRecipe.path)).frontmatter;
    const frontmatterYaml = parseYaml(frontmatter);

    const sourceUrl = frontmatterYaml.source;

    const result = await Download(sourceUrl);
    if (result.isErr()) {
        new ErrorDialog(ctx.app, `${result.error}`).open();
        return;
    }

    const { recipeContent, recipe } = result.unwrap();

    const originalContent = await ctx.app.vault.cachedRead(mealsRecipe.path);
    if (originalContent !== recipeContent) {
        const diag = new OverwriteDialog(ctx.app);
        diag.open();

        const confirmed = await diag.onConfirm();
        if (!confirmed) {
            return;
        }

        if (ctx.debugMode()) {
            console.debug(`Updating file ${mealsRecipe.path.path}`);
        }

        await ctx.app.vault.process(mealsRecipe.path, () => {
            let content = generateFrontmatter(get(ctx.settings).includeNutritionalInformation, sourceUrl, recipe);
            content += recipeContent;
            return content;
        });
    }
}
