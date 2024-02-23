import type { App, TFile } from 'obsidian';
import { parseIngredient, type Ingredient } from 'parse-ingredient';
import type { Recipe } from './recipe';

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
    const debug = true;
    const recipes: Ingredient[] = new Array();

//    const HEADER_STRING = '# Ingredients';
    const ingredients = content.split('---')[3];

    if (debug) {
      console.log("INGREDIENTS", ingredients);
    }


    if (typeof ingredients == 'undefined' || ingredients.length<=0) {
        return new Array();
    }
    if (debug) {
      console.log("PROCESSING", ingredients);
    }

    for (const line of ingredients?.split('\n').filter((line) => {
        return line.length > 0;
    })) {
        const i = parse_ingredient(line);
        if (i === undefined) continue;
        recipes.push(i);
    }

    return recipes;
}

function parse_ingredient(content: string): Ingredient {
    const LINE_PREFIX = '- ';
    content = content.substring(content.indexOf(LINE_PREFIX) + LINE_PREFIX.length);
    return parseIngredient(content)[0];
}
