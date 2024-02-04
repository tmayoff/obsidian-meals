import { TFile, type TFolder } from 'obsidian';
import type { Ingredient } from 'parse-ingredient';
import { get_ingredients } from './ingredients';

export class Recipe {
    name: string;
    path: TFile;

    ingredients: Ingredient[];

    constructor(path: TFile, name: string = path.basename) {
        this.path = path;
        this.name = name;
        this.ingredients = new Array();
    }

    public async fill_ingredients() {
        this.ingredients = await get_ingredients(this.path);
    }
}

export async function get_recipes(recipe_dir: TFolder) {
    const recipes: Recipe[] = new Array();

    for (const file of recipe_dir.children) {
        if (file instanceof TFile) {
            const recipe = new Recipe(file);
            await recipe.fill_ingredients();
            recipes.push(recipe);
        }
    }

    return recipes;
}
