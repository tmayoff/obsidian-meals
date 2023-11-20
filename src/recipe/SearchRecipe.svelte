<script lang="ts">
  import { TFolder, type App } from "obsidian";
  import type { MealSettings } from "../main";
  import { get_recipes } from "./recipe";
  import { get_ingredients } from "./ingredients";

  export let settings: MealSettings;
  export let app: App;

  console.log(
    "Searching directory (%s) for recipes",
    settings.recipe_directory
  );
  let recipes_dir = app.vault.getAbstractFileByPath(settings.recipe_directory);
  if (recipes_dir instanceof TFolder) {
    console.log(recipes_dir.path);
    let recipes = get_recipes(recipes_dir);
    console.log(recipes);
    recipes.forEach((recipe) => {
      console.log(get_ingredients(app, recipe.path));
    });
  } else {
    console.error("Failed to get recipes");
  }
</script>

<div>
  <h1>Search Recipes</h1>
  <div>
    <div>
      <h2>Ingredients</h2>
    </div>
    <div>
      <h2>Filter</h2>
    </div>
  </div>
</div>

<style>
</style>
