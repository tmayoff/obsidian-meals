import type { TFile } from 'obsidian';
import { getFrontMatterInfo } from 'obsidian';
import { type Ingredient, parseIngredient } from 'parse-ingredient';
import {singular} from 'pluralize';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { RecipeFormat } from '../settings';
import type { Recipe } from './recipe';

export async function get_ingredient_set(ctx: Context, recipes: Recipe[]) {
    const recipes_files = recipes.map((r) => r.path);

    return Promise.all(
        recipes_files.map(async (dir) => {
            return await get_ingredients(ctx, dir);
        }),
    ).then((ingredients) => {
        const all_ingredients: Set<string> = new Set();
        for (const ingredient of ingredients) {
            for (const i of ingredient) {
                all_ingredients.add(i.description.toLocaleLowerCase());
            }
        }
        return all_ingredients;
    });
}

export async function get_ingredients(ctx: Context, recipe_file: TFile) {
    if (recipe_file === undefined) {
        console.log('FAILED', recipe_file);
    }

    const filecontent = await ctx.app.vault.read(recipe_file);

    const contentStart = getFrontMatterInfo(filecontent).contentStart;
    const content = filecontent.substring(contentStart);

    if (get(ctx.settings).recipe_format === RecipeFormat.RecipeMD) {
        return parse_ingredients_recipemd(ctx, content);
    }

    return parse_ingredients(ctx, content);
}

function parse_ingredients(ctx: Context, content: string): Ingredient[] {
    const recipes: Ingredient[] = new Array();

    const HEADER_STRING = '# Ingredients';
    if (!content.contains(HEADER_STRING)) {
        return new Array();
    }

    const start = content.indexOf(HEADER_STRING) + HEADER_STRING.length;
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

function parse_ingredients_recipemd(ctx: Context, content: string): Ingredient[] {
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
    const LINE_PREFIX = '- ';
    let ingredient_content = content.substring(content.indexOf(LINE_PREFIX) + LINE_PREFIX.length);

    const do_advanced_parse = get(ctx.settings).advanced_ingredient_parsing;

    if (do_advanced_parse) {
        // ============================
        // Special ingredient parsing
        // =============================

        // Ingredient name ignores everything after the first comma
        // 200g onions, chopped
        // ~~~~~~~~~~~
        // 200g onion

        const first_comma = ingredient_content.indexOf(',');

        if (first_comma >= 0) ingredient_content = ingredient_content.substring(0, first_comma);
    }

    const ingredient = parseIngredient(ingredient_content)[0];

    if (do_advanced_parse && ingredient !== undefined) {
        ingredient.description = singular(ingredient.description);
    }

    return ingredient;
}
