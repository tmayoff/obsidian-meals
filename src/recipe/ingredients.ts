import type { App, TFile } from "obsidian";
import { parseIngredient, type Ingredient } from "parse-ingredient";

export async function get_ingredient_set(recipe_dirs: TFile[]) {
  return Promise.all(
    recipe_dirs.map(async (dir) => {
      return await get_ingredients(dir);
    })
  ).then((ingredients) => {
    let all_ingredients: Set<string> = new Set();
    ingredients.forEach((ingredient) => {
      ingredient.forEach((ingredient) => {
        all_ingredients.add(ingredient.description.toLocaleLowerCase());
      });
    });
    return all_ingredients;
  });
}

export async function get_ingredients(recipe_file: TFile) {
  let content = await recipe_file.vault.read(recipe_file);
  return parse_ingredients(content);
}

function parse_ingredients(content: string): Ingredient[] {
  let recipes: Ingredient[] = new Array();

  const HEADER_STRING = "# Ingredients";
  if (!content.contains(HEADER_STRING)) {
    return new Array();
  }

  let start = content.indexOf(HEADER_STRING) + HEADER_STRING.length;
  content = content.substring(start);
  let end = content.indexOf("#");

  let ingredients = content.substring(0, end);
  ingredients
    .split("\n")
    .filter((line) => {
      return line.length > 0;
    })
    .forEach((line) => {
      recipes.push(parse_ingredient(line));
    });

  return recipes;
}

function parse_ingredient(content: string): Ingredient {
  const LINE_PREFIX = "- ";
  content = content.substring(
    content.indexOf(LINE_PREFIX) + LINE_PREFIX.length
  );
  return parseIngredient(content)[0];
}
