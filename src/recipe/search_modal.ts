import { SuggestModal } from 'obsidian';
import { get } from 'svelte/store';
import type { Context } from '../context';
import type { Recipe } from './recipe';

type callback_type = (recipe: Recipe) => void;

export class SearchRecipe extends SuggestModal<Recipe> {
    ctx: Context;

    callback: callback_type;

    constructor(ctx: Context, cb: callback_type) {
        super(ctx.app);
        this.ctx = ctx;

        this.callback = cb;
    }

    getSuggestions(_query: string): Recipe[] | Promise<Recipe[]> {
        return get(this.ctx.recipes);
    }

    renderSuggestion(recipe: Recipe, el: HTMLElement): void {
        el.setText(recipe.name);
    }
    onChooseSuggestion(recipe: Recipe, evt: MouseEvent | KeyboardEvent): void {
        this.callback(recipe);
    }
}
