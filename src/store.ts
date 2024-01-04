import { derived, get, writable } from 'svelte/store';
import { get_recipes, type Recipe } from './recipe/recipe';
import { TFolder, app, type App } from 'obsidian';
import { settings } from './settings';

export const APP = writable();

export const recipes = writable(new Array<Recipe>());

export const ingredients = derived(recipes, ($recipes) => {
    const ingredients = new Set();

    for (const recipe of $recipes) {
        for (const ingredient of recipe.ingredients) {
            if (ingredient === undefined) {
                console.error('Recipe ingredient is broken', recipe, ingredient);
                continue;
            }

            ingredients.add(ingredient.description.toLowerCase());
        }
    }

    return ingredients;
});

export async function load_recipes() {
    const recipe_folder = get(APP).vault.getAbstractFileByPath(get(settings).recipe_directory);

    if (recipe_folder instanceof TFolder) {
        get_recipes(recipe_folder).then((r) => {
            recipes.set(r);
        });
    }
}
