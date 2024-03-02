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
        console.log(this.app);
        const recipe_folder_path = get(this.settings).recipe_directory;
        const recipe_folder = this.app.vault.getFolderByPath(recipe_folder_path);
        if (recipe_folder == null) {
            console.error(`Failed to load recipes, can't access directory: ${recipe_folder_path}`);
            return;
        }

        if (file !== undefined) {
            if (file instanceof TFolder && file !== recipe_folder) return;
            if (file instanceof TFile && file.parent !== recipe_folder) return;
        }

        get_recipes(this, recipe_folder!).then((r) => {
            this.recipes.set(r);
        });

        console.log('loaded recipes');
    }
}
