import { Modal } from 'obsidian';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';

export class RecipeSelectModal extends Modal {
    private ctx: Context;
    private onSelect: (recipe: Recipe) => void;
    private searchInput: HTMLInputElement | null = null;

    constructor(ctx: Context, onSelect: (recipe: Recipe) => void) {
        super(ctx.app);
        this.ctx = ctx;
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('recipe-select-modal');

        // Header
        contentEl.createEl('h2', { text: 'Select a recipe' });

        // Search input
        this.searchInput = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Search recipes...',
            cls: 'recipe-search-input',
        });
        this.searchInput.focus();

        // Recipe list container
        const listContainer = contentEl.createDiv('recipe-list-container');

        // Render initial list
        this.renderRecipeList(listContainer, '');

        // Handle search input
        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput?.value.toLowerCase() ?? '';
            this.renderRecipeList(listContainer, query);
        });

        // Handle keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    private renderRecipeList(container: HTMLElement, query: string) {
        container.empty();

        const recipes = get(this.ctx.recipes);
        const filtered = query ? recipes.filter((r) => r.name.toLowerCase().includes(query)) : recipes;

        if (filtered.length === 0) {
            container.createEl('p', {
                text: 'No recipes found',
                cls: 'recipe-list-empty',
            });
            return;
        }

        for (const recipe of filtered) {
            const item = container.createDiv('recipe-list-item');
            item.textContent = recipe.name;
            item.addEventListener('click', () => {
                this.onSelect(recipe);
                this.close();
            });
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
