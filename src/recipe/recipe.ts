import * as fs from "fs";
import { TFile, type TFolder } from "obsidian";

export class Recipe {
  name: string;
  path: TFile;

  constructor(path: TFile, name: string = path.basename) {
    this.path = path;
    this.name = name;
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
