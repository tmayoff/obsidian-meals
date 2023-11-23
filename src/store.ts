import { derived, readable, writable } from "svelte/store";
import { get_recipes, type Recipe } from "./recipe/recipe";
import { TFolder, type App } from "obsidian";
import type { MealSettings } from "./main";
import type MealPlugin from "./main";
import { get_ingredient_set } from "./recipe/ingredients";

const recipes_setter = writable(new Array<Recipe>(), () => {});

export let recipes = derived(recipes_setter, (r) => {
  return r;
});

export let ingredients = derived(
  recipes,
  ($recipes, set) => {
    get_ingredient_set($recipes).then((i) => set(i));
  },
  new Set<string>()
);

export async function initialize_store(plugin: MealPlugin) {
  console.log("Reloading recipes");

  const settings = plugin.settings;

  let recipe_folder = plugin.app.vault.getAbstractFileByPath(
    settings.recipe_directory
  );

  if (recipe_folder instanceof TFolder) {
    let recipes = get_recipes(recipe_folder);
    recipes_setter.set(recipes);
  }
}
