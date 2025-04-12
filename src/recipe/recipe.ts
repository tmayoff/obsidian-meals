import { Notice, TFile, TFolder } from 'obsidian';
import type { Ingredient } from 'parse-ingredient';
import type { Context } from '../context.ts';
import { GetIngredients } from './ingredients.ts';

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
        const res = await GetIngredients(ctx, this.path);
        if (res.isErr()) {
            console.error(`Failed to parse ingredients: ${res.error}`);
            new Notice(`Failed to parse ingredients: ${res.error}`);
            return;
        }
        this.ingredients = res.unwrap();
    }
}

export async function GetRecipes(ctx: Context, recipeDir: TFolder) {
    const recipes: Recipe[] = new Array();

    for (const file of recipeDir.children) {
        if (file instanceof TFile) {
            if (ctx.debugMode()) {
                console.debug('Parsing recipe:', file.path);
            }

            recipes.push(await GetRecipe(ctx, file));
        } else if (file instanceof TFolder) {
            recipes.push.apply(recipes, await GetRecipes(ctx, file));
        }
    }

    return recipes;
}

export async function GetRecipe(ctx: Context, file: TFile) {
    if (ctx.debugMode()) {
        console.debug('Parsing recipe:', file.path);
    }
    const recipe = new Recipe(file);
    await recipe.fillIngredients(ctx);
    return recipe;
}
