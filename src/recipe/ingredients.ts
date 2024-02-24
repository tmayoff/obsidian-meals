import type { App, TFile } from 'obsidian';
import { parseIngredient, type Ingredient } from 'parse-ingredient';
import type { Recipe } from './recipe';
import { settings } from '../settings';
import { get } from 'svelte/store';


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
    if (get(settings).recipe_format == 'RecipeMD') {
      return parse_ingredients_recipemd(content);
    } else {
      return parse_ingredients(content);
    }
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

function parse_ingredients_recipemd(content: string): Ingredient[] {
    const debug = false;
    const recipes: Ingredient[] = new Array();
    var ingredients;
    

    if (content.substring(0,2)=='---') {
      ingredients = content.split('---')[3];
    } else {
      ingredients = content.split('---')[1];
    }

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
    if (content.match(/^ *-/)) {
      content = content.substring(content.indexOf(LINE_PREFIX) + LINE_PREFIX.length);
      content = content.replace(/\*/g,"")
    return parseIngredient(content)[0];
    } else {
      return parseIngredient("")[0];
    }
}
