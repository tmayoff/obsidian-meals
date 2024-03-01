import { derived, get, writable } from 'svelte/store';
import { get_recipes, type Recipe } from './recipe/recipe';
import { TFolder, TFile, TAbstractFile, app, type App } from 'obsidian';
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

export async function load_recipes(file:TAbstractFile) {
    const recipe_folder = get(APP).vault.getAbstractFileByPath(get(settings).recipe_directory);
    
    if (recipe_folder instanceof TFolder) {
      if (file instanceof TFolder && file != recipe_folder) return
      if (file instanceof TFile && file.parent != recipe_folder) return

      get_recipes(recipe_folder).then((r) => {
          recipes.set(r);
      });
    } 
}
