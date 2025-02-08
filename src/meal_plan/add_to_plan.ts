import { SuggestModal } from 'obsidian';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { OpenNoteFile } from '../utils/filesystem.ts';
import { AddRecipeToMealPlan } from './plan.ts';

type Callback = () => Promise<void>;

class AddToPlanTarget {
    name = '';
    cb: Callback | undefined;
}

export class AddToPlanModal extends SuggestModal<AddToPlanTarget> {
    showGoto: boolean;
    buttons: AddToPlanTarget[];

    constructor(ctx: Context, recipe: Recipe, showGoto: boolean) {
        super(ctx.app);
        this.showGoto = showGoto;
        this.buttons = [];

        if (this.showGoto) {
            this.buttons.push({
                name: 'Go to recipe',
                cb: async () => {
                    await OpenNoteFile(ctx.app, recipe.path);
                },
            });
        }

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
