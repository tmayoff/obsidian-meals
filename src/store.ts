import { derived, writable } from "svelte/store";
import { get_recipes, type Recipe } from "./recipe/recipe";
import { TFolder, type App } from "obsidian";
import type MealPlugin from "./main";

const recipes_setter = writable(new Array<Recipe>(), () => {});

export let recipes = derived(recipes_setter, (r) => {
  return r;
});

export let ingredients = derived(
  recipes,
  ($recipes, set) => {
    let ingredients: Set<string> = new Set();

    $recipes.forEach((r) => {
      let is = r.ingredients.map((i) => i.description.toLocaleLowerCase());
      is.forEach((i) => ingredients.add(i));
    });

    set(ingredients);
  },
  new Set<string>()
);

export async function initialize_store(plugin: MealPlugin) {
  console.debug("Reloading recipes");

  const settings = plugin.settings;

  let recipe_folder = plugin.app.vault.getAbstractFileByPath(
    settings.recipe_directory
  );

  if (recipe_folder instanceof TFolder) {
    get_recipes(recipe_folder).then((r) => recipes_setter.set(r));
  }
}
