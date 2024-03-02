import { TFile, type TFolder } from 'obsidian';
import type { Ingredient } from 'parse-ingredient';
import { Context } from '../context';
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

    public async fill_ingredients(ctx: Context) {
        this.ingredients = await get_ingredients(ctx, this.path);
    }
}

export async function get_recipes(ctx: Context, recipe_dir: TFolder) {
    const recipes: Recipe[] = new Array();

    for (const file of recipe_dir.children) {
        if (file instanceof TFile) {
            const recipe = new Recipe(file);
            await recipe.fill_ingredients(ctx);
            recipes.push(recipe);
        }
    }

    return recipes;
}
