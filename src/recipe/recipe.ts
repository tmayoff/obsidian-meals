import * as fs from "fs";
import { TFile, type TFolder } from "obsidian";

class Recipe {
  path: TFile;

  constructor(path: TFile) {
    this.path = path;
  }
}

export function get_recipes(recipe_dir: TFolder): Recipe[] {
  let recipes: Recipe[] = new Array();

  recipe_dir.children.forEach((file) => {
    if (file instanceof TFile) {
      recipes.push(new Recipe(file));
    }
  });

  return recipes;
}
