import type { TFile } from 'obsidian';
import { getFrontMatterInfo } from 'obsidian';
import { type Ingredient as TIngredient, parseIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { RecipeFormat } from '../settings';
import type { Recipe } from './recipe';

interface AltIngredient {
    altQuantity: number | null;
    altUnitOfMeasure: string | null;
    altUnitOfMeasureID: string | null;
}

type Ingredient = TIngredient & AltIngredient;

export async function GetIngredientSet(ctx: Context, recipes: Recipe[]) {
    const recipesFiles = recipes.map((r) => r.path);

    return Promise.all(
        recipesFiles.map(async (dir) => {
            return await GetIngredients(ctx, dir);
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

export async function GetIngredients(ctx: Context, recipeFile: TFile) {
    if (recipeFile === undefined) {
        console.error('Failed to get ingredients', recipeFile);
    }

    const filecontent = await ctx.app.vault.read(recipeFile);

    const contentStart = getFrontMatterInfo(filecontent).contentStart;
    const content = filecontent.substring(contentStart);

    if (get(ctx.settings).recipeFormat === RecipeFormat.RecipeMD) {
        return parseIngredientsRecipemd(ctx, content);
    }

    return parseIngredients(ctx, content);
}

function parseIngredients(ctx: Context, content: string): Ingredient[] {
    if (ctx.debugMode()) {
        console.debug('Parsing ingredients as: RecipeMD');
    }

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
        const i = ParseIngredient(ctx, line);
        if (i === undefined) {
            continue;
        }
        recipes.push(i);
    }

    return recipes;
}

function parseIngredientsRecipemd(ctx: Context, content: string): Ingredient[] {
    if (ctx.debugMode()) {
        console.debug('Parsing ingredients as: RecipeMD');
    }

    const recipes: Ingredient[] = new Array();
    const ingredients = content.split('---')[1];

    if (ingredients === undefined || ingredients.length <= 0) {
        return new Array();
    }

    for (const line of ingredients.split('\n').filter((line) => {
        return line.length > 0;
    })) {
        const i = ParseIngredient(ctx, line);
        if (i === undefined) {
            continue;
        }
        recipes.push(i);
    }

    return recipes;
}

function ParseIngredient(ctx: Context, content: string): Ingredient {
    // Parse the ingredient line
    const linePrefix = '-';
    const prefixIndex = content.indexOf(linePrefix);
    let ingredientContent = content;
    if (prefixIndex >= 0) {
        ingredientContent = ingredientContent.substring(prefixIndex).trim();
    }

    const doAdvancedParse = get(ctx.settings).advancedIngredientParsing;

    let altIngredients: AltIngredient = {
        altQuantity: null,
        altUnitOfMeasure: null,
        altUnitOfMeasureID: null,
    };

    if (doAdvancedParse) {
        if (ctx.debugMode()) {
            console.debug('Advanced parsing; original line:', content);
        }

        // ============================
        // Special ingredient parsing
        // =============================

        // Ingredients with (...) will be parsed as follows: if it contains another alternate quantity: 17 oz (200g), it will be added as an alternate quantity otherwise it'll be ignored
        const regex = /\((.*)\)/;
        if (regex.test(ingredientContent)) {
            // Regex match all '(...)'
            const match = regex.exec(ingredientContent);
            if (match != null) {
                // This hack is required due to the parseIngredient function expected a description, without it 200g is parsed into: {quantity: 200, description: 'g'}
                const extraQuantity = `DUMMY_INGREDIENT ${match[1]}`;
                const ingredients = parseIngredient(extraQuantity);
                if (ingredients.length > 0) {
                    altIngredients = {
                        altQuantity: ingredients[0].quantity,
                        altUnitOfMeasure: ingredients[0].unitOfMeasure,
                        altUnitOfMeasureID: ingredients[0].unitOfMeasureID,
                    };
                }
                ingredientContent = ingredientContent.replace(regex, '');
            }
        }

        // Ingredient name ignores everything after the first comma
        // 200g onions, chopped
        // ~~~~~~~~~~~
        // 200g onion

        const firstComma = ingredientContent.indexOf(',');

        if (firstComma >= 0) {
            ingredientContent = ingredientContent.substring(0, firstComma);
        }
    }

    const tingredient: TIngredient = parseIngredient(ingredientContent)[0];

    if (doAdvancedParse && tingredient !== undefined) {
        tingredient.description = singular(tingredient.description);
    }

    if (ctx.debugMode()) {
        console.debug('Final ingredient output', tingredient, altIngredients);
    }

    return {
        ...tingredient,
        ...altIngredients,
    };
}
