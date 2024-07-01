import type { TFile } from 'obsidian';
import { getFrontMatterInfo } from 'obsidian';
import { type Ingredient, parseIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { RecipeFormat } from '../settings';
import type { Recipe } from './recipe';

export async function get_ingredient_set(ctx: Context, recipes: Recipe[]) {
    const recipesFiles = recipes.map((r) => r.path);

    return Promise.all(
        recipesFiles.map(async (dir) => {
            return await get_ingredients(ctx, dir);
        }),
    ).then((ingredients) => {
        const allIngredients: Set<string> = new Set();
        for (const ingredient of ingredients) {
            for (const i of ingredient) {
                allIngredients.add(i.description.toLocaleLowerCase());
            }
        }
        return allIngredients;
    });
}

export async function get_ingredients(ctx: Context, recipeFile: TFile) {
    if (recipeFile === undefined) {
        console.log('FAILED', recipeFile);
    }

    const filecontent = await ctx.app.vault.read(recipeFile);

    const contentStart = getFrontMatterInfo(filecontent).contentStart;
    const content = filecontent.substring(contentStart);

    if (get(ctx.settings).recipe_format === RecipeFormat.RecipeMD) {
        return parseIngredientsRecipemd(ctx, content);
    }

    return parseIngredients(ctx, content);
}

function parseIngredients(ctx: Context, content: string): Ingredient[] {
    const recipes: Ingredient[] = new Array();

    const headerString = '# Ingredients';
    if (!content.contains(headerString)) {
        return new Array();
    }

    const start = content.indexOf(headerString) + headerString.length;
    content = content.substring(start);
    const end = content.indexOf('#');

    const ingredients = content.substring(0, end);
    for (const line of ingredients.split('\n').filter((line) => {
        return line.length > 0;
    })) {
        const i = parse_ingredient(ctx, line);
        if (i === undefined) continue;
        recipes.push(i);
    }

    return recipes;
}

function parseIngredientsRecipemd(ctx: Context, content: string): Ingredient[] {
    const recipes: Ingredient[] = new Array();
    const ingredients = content.split('---')[1];

    if (ingredients === undefined || ingredients.length <= 0) {
        return new Array();
    }

    for (const line of ingredients.split('\n').filter((line) => {
        return line.length > 0;
    })) {
        const i = parse_ingredient(ctx, line);
        if (i === undefined) continue;
        recipes.push(i);
    }

    return recipes;
}

function parse_ingredient(ctx: Context, content: string): Ingredient {
    // Parse the ingredient line
    const linePrefix = '- ';
    let ingredientContent = content.substring(content.indexOf(linePrefix) + linePrefix.length);

    const doAdvancedParse = get(ctx.settings).advanced_ingredient_parsing;

    if (doAdvancedParse) {
        // ============================
        // Special ingredient parsing
        // =============================

        // Ingredient name ignores everything after the first comma
        // 200g onions, chopped
        // ~~~~~~~~~~~
        // 200g onion

        const firstComma = ingredientContent.indexOf(',');

        if (firstComma >= 0) ingredientContent = ingredientContent.substring(0, firstComma);
    }

    const ingredient = parseIngredient(ingredientContent)[0];

    if (doAdvancedParse && ingredient !== undefined) {
        ingredient.description = singular(ingredient.description);
    }

    return ingredient;
}
