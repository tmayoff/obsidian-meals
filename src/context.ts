import type { App, TFile } from 'obsidian';
import { derived, get, writable } from 'svelte/store';
import type MealPlugin from './main.ts';
import { GetRecipe, GetRecipes, type Recipe } from './recipe/recipe.ts';
import { MealSettings } from './settings.ts';

export class Context {
    app: App;
    plugin: MealPlugin;

    recipes = writable(new Array<Recipe>());

    ingredients = derived(this.recipes, ($recipes) => {
        const ingredients = new Set<string>();

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

    settings = writable(new MealSettings());

    constructor(plugin: MealPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    async loadRecipes(file: TFile | undefined) {
        // Get the recipe folder path by default 'Meals'
        const recipeFolderPath = get(this.settings).recipeDirectory;
        if (this.debugMode()) {
            console.debug('Recipe Folder:', recipeFolderPath);
        }
        const recipeFolder = this.app.vault.getFolderByPath(recipeFolderPath);
        if (recipeFolder == null) {
            console.error(`Failed to load recipes, can't access directory: ${recipeFolderPath}`);
            return;
        }

        // Load just the recipe file specified and only if it's actually in the recipeFolder
        if (file !== undefined && file.parent === recipeFolder) {
            GetRecipe(this, file).then((r) => {
                this.recipes.update((arr) => {
                    arr.push(r);
                    return arr;
                });
            });
        } else {
            GetRecipes(this, recipeFolder!).then((r) => {
                this.recipes.set(r);
            });
        }
    }

    debugMode() {
        return get(this.settings).debugMode;
    }
}
