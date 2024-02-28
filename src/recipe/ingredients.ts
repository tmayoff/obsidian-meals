import type { TFile } from 'obsidian';
import { type Ingredient, parseIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import type { Recipe } from './recipe';
import { get } from 'svelte/store';
import { settings } from '../settings';

export async function get_ingredient_set(recipes: Recipe[]) {
    const recipes_files = recipes.map((r) => r.path);

    return Promise.all(
        recipes_files.map(async (dir) => {
            return await get_ingredients(dir);
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

export async function get_ingredients(recipe_file: TFile) {
    const content = await recipe_file.vault.read(recipe_file);
    return parse_ingredients(content);
}

function parse_ingredients(content: string): Ingredient[] {
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
        const i = parse_ingredient(line);
        if (i === undefined) continue;
        recipes.push(i);
    }

    return recipes;
}

function parse_ingredient(content: string): Ingredient {
    // Parse the ingredient line
    const LINE_PREFIX = '- ';
    let ingredient_content = content.substring(content.indexOf(LINE_PREFIX) + LINE_PREFIX.length);

    const do_advanced_parse = get(settings).advanced_ingredient_parsing;

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
