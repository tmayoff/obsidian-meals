import { Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import type { Context } from '../context';
import type { Recipe } from '../recipe/recipe';
import { SearchRecipe } from '../recipe/search_modal';
import Cook from './Cook.svelte';

export function FindAndCook(ctx: Context) {
    const suggester = new SearchRecipe(ctx, (recipe) => {
        CookRecipe(ctx, recipe);
    });
    suggester.open();
}

class CookModal extends Modal {
    component: Record<string, any> | null = null;
    context: Context;

    recipe: Recipe;

    constructor(ctx: Context, recipe: Recipe) {
        super(ctx.app);
        this.context = ctx;
        this.recipe = recipe;
    }

    onOpen() {
        this.component = mount(Cook, {
            target: this.containerEl.children[1].children[2],
            props: {
                recipe: this.recipe,
            },
        });
    }

    onClose() {
        if (this.component != null) {
            unmount(this.component);
        }
    }
}

export function CookRecipe(ctx: Context, recipe: Recipe) {
    const modal = new CookModal(ctx, recipe);
    modal.open();
}
