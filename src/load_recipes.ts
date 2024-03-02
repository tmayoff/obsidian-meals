import { App, TAbstractFile, TFile, TFolder } from 'obsidian';
import { get } from 'svelte/store';
import { get_recipes } from './recipe/recipe';
import { settings } from './settings';
import { recipes } from './store';

export async function load_recipes(app: App, file: TAbstractFile | undefined) {
    const recipe_folder = app.vault.getFolderByPath(get(settings).recipe_directory);

    if (file instanceof TFolder && file !== recipe_folder) return;
    if (file instanceof TFile && file.parent !== recipe_folder) return;

    get_recipes(recipe_folder!).then((r) => {
        recipes.set(r);
    });
}
