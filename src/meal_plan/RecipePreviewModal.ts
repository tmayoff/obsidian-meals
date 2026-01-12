import type moment from 'moment';
import { Component, MarkdownRenderer, Modal } from 'obsidian';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import { RemoveRecipeFromMealPlan } from './plan.ts';

export class RecipePreviewModal extends Modal {
    private ctx: Context;
    private recipeName: string;
    private date: moment.Moment;
    private dayName: string;
    private onRemoved: () => void;
    private renderComponent: Component;

    constructor(ctx: Context, recipeName: string, date: moment.Moment, dayName: string, onRemoved: () => void) {
        super(ctx.app);
        this.ctx = ctx;
        this.recipeName = recipeName;
        this.date = date;
        this.dayName = dayName;
        this.onRemoved = onRemoved;
        this.renderComponent = new Component();
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('recipe-preview-modal');
        this.renderComponent.load();

        // Header with recipe name and close button
        const header = contentEl.createDiv('recipe-preview-header');
        header.createEl('h2', { text: this.recipeName });

        // Content container for recipe
        const recipeContent = contentEl.createDiv('recipe-preview-content');

        // Load and render recipe content
        // Look for the recipe in the recipe directory
        const settings = get(this.ctx.settings);
        const recipePath = `${settings.recipeDirectory}/${this.recipeName}`;
        const recipeFile = this.ctx.app.vault.getFileByPath(AppendMarkdownExt(recipePath));

        if (recipeFile) {
            const content = await this.ctx.app.vault.read(recipeFile);
            await MarkdownRenderer.render(this.ctx.app, content, recipeContent, recipeFile.path, this.renderComponent);
        } else {
            recipeContent.createEl('p', {
                text: 'Recipe file not found.',
                cls: 'recipe-preview-error',
            });
        }

        // Actions footer
        const footer = contentEl.createDiv('recipe-preview-footer');

        const removeBtn = footer.createEl('button', {
            text: `Remove from ${this.dayName}`,
            cls: 'mod-warning',
        });
        removeBtn.addEventListener('click', async () => {
            await RemoveRecipeFromMealPlan(this.ctx, this.recipeName, this.date);
            this.onRemoved();
            this.close();
        });

        const closeBtn = footer.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        this.renderComponent.unload();
        this.contentEl.empty();
    }
}
