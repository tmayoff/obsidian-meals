import { SuggestModal } from 'obsidian';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { AddRecipeToMealPlan } from './plan.ts';

type Callback = () => Promise<void>;

class AddToPlanTarget {
    name = '';
    cb: Callback | undefined;
}

export class AddToPlanModal extends SuggestModal<AddToPlanTarget> {
    buttons: AddToPlanTarget[];

    constructor(ctx: Context, recipe: Recipe) {
        super(ctx.app);
        this.buttons = [];

        for (const d of DAYS_OF_WEEK) {
            this.buttons.push({
                name: d,
                cb: async () => {
                    await AddRecipeToMealPlan(ctx, recipe, d);
                },
            });
        }
    }

    getSuggestions(_query: string): AddToPlanTarget[] | Promise<AddToPlanTarget[]> {
        // TODO search
        return this.buttons;
    }

    renderSuggestion(item: AddToPlanTarget, el: HTMLElement): void {
        el.createEl('div', { text: item.name });
    }

    onChooseSuggestion(item: AddToPlanTarget, _evt: MouseEvent | KeyboardEvent): void {
        if (item.cb) {
            item.cb();
        }

        this.close();
    }
}
