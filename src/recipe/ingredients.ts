import type { App, TFile } from "obsidian";

class Ingredient {
  name: string;
  amount: string;

  constructor(name: string, amount: string) {
    this.name = name;
    this.amount = amount;
  }
}

export async function get_ingredients(app: App, recipe_file: TFile) {
  console.log("Getting Ingredients from %s...", recipe_file.path);
  let content = await recipe_file.vault.read(recipe_file);
  let ingredients = parse_ingredients(content);
  console.log(ingredients);
}

function parse_ingredients(content: string): Ingredient[] {
  let recipes: Ingredient[] = new Array();

  const HEADER_STRING = "# Ingredients";
  if (!content.contains(HEADER_STRING)) {
    return new Array();
  }

  let start = content.indexOf(HEADER_STRING) + HEADER_STRING.length;
  let end = content.substring(start).indexOf("#");

  let ingredients = content.substring(start, end);

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
  let words = content.split(" ");
  let amount = words[words.length - 1];
  words.pop();
  let name: string = words.join(" ");
  return new Ingredient(name, amount);
}
