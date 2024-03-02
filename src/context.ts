import { type App, type TAbstractFile, TFile, TFolder } from 'obsidian';
import { derived, get, writable } from 'svelte/store';
import type MealPlugin from './main';
import { type Recipe, get_recipes } from './recipe/recipe';
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

    async load_recipes(file: TAbstractFile | undefined) {
        const recipe_folder = this.app.vault.getFolderByPath(get(this.settings).recipe_directory);

        if (file instanceof TFolder && file !== recipe_folder) return;
        if (file instanceof TFile && file.parent !== recipe_folder) return;

        get_recipes(recipe_folder!).then((r) => {
            this.recipes.set(r);
        });
    }
}
