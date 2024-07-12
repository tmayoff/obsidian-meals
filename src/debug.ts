import { SuggestModal } from 'obsidian';
import type { Context } from './context';
import type { Ingredient } from 'parse-ingredient';

export class IngredientDebugModal extends SuggestModal<string> {
    ctx: Context;
    ingredients: Ingredient[];

    constructor(ctx: Context, ingredients: Ingredient[]) {
        super(ctx.app);
        this.ctx = ctx;
        this.ingredients = ingredients;
    }

    getSuggestions(query: string): string[] | Promise<string[]> {
        throw new Error('Method not implemented.');
    }

    renderSuggestion(value: string, el: HTMLElement) {
        throw new Error('Method not implemented.');
    }
    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        throw new Error('Method not implemented.');
    }
}
