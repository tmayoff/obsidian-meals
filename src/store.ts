import { App, TAbstractFile, TFile, TFolder } from 'obsidian';
import { derived, get, writable } from 'svelte/store';
import { type Recipe, get_recipes } from './recipe/recipe';
import { settings } from './settings';

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

export async function load_recipes(app: App, file: TAbstractFile | undefined) {
    const recipe_folder = app.vault.getFolderByPath(get(settings).recipe_directory);

    if (file !== undefined) {
        if (file instanceof TFolder && file !== recipe_folder) return;
        if (file instanceof TFile && file.parent !== recipe_folder) return;
    }

    get_recipes(recipe_folder!).then((r) => {
        recipes.set(r);
    });
}
