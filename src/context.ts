import { type App, type TAbstractFile, TFile, TFolder } from 'obsidian';
import { derived, get, writable } from 'svelte/store';
import type MealPlugin from './main';
import { GetRecipes, type Recipe } from './recipe/recipe';
import { MealSettings } from './settings';

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

    async loadRecipes(file: TAbstractFile | undefined) {
        const recipeFolderPath = get(this.settings).recipeDirectory;
        if (this.debugMode()) {
            console.debug('Recipe Folder:', recipeFolderPath);
        }
        const recipeFolder = this.app.vault.getFolderByPath(recipeFolderPath);
        if (recipeFolder == null) {
            console.error(`Failed to load recipes, can't access directory: ${recipeFolderPath}`);
            return;
        }

        if (file !== undefined) {
            if (file instanceof TFolder && file !== recipeFolder) {
                return;
            }
            if (file instanceof TFile && file.parent !== recipeFolder) {
                return;
            }
        }

        GetRecipes(this, recipeFolder!).then((r) => {
            this.recipes.set(r);
        });
    }

    debugMode() {
        return get(this.settings).debugMode;
    }
}
