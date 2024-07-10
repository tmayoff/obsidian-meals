import { TFile, type TFolder } from 'obsidian';
import type { Ingredient } from 'parse-ingredient';
import type { Context } from '../context';
import { GetIngredients } from './ingredients';

export class Recipe {
    name: string;
    path: TFile;

    ingredients: Ingredient[];

    constructor(path: TFile, name: string = path.basename) {
        this.path = path;
        this.name = name;
        this.ingredients = new Array();
    }

    public async fillIngredients(ctx: Context) {
        this.ingredients = await GetIngredients(ctx, this.path);
    }
}

export async function GetRecipes(ctx: Context, recipeDir: TFolder) {
    const recipes: Recipe[] = new Array();

    for (const file of recipeDir.children) {
        if (file instanceof TFile) {
            if (ctx.debugMode()) {
                console.debug('Parsing recipe:', file.path);
            }
            const recipe = new Recipe(file);
            await recipe.fillIngredients(ctx);
            recipes.push(recipe);
        }
    }

    return recipes;
}
