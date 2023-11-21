<script lang="ts">
  import { TFolder, type App } from "obsidian";
  import type { MealSettings } from "../main";
  import { Recipe, get_recipes } from "./recipe";
  import { get_ingredient_set } from "./ingredients";

  export let settings: MealSettings;
  export let app: App;

  let recipes = new Array<Recipe>();
  let ingredients: Promise<Set<string>>;

  console.log(
    "Searching directory (%s) for recipes",
    settings.recipe_directory
  );
  let recipes_dir = app.vault.getAbstractFileByPath(settings.recipe_directory);
  if (recipes_dir instanceof TFolder) {
    recipes = get_recipes(recipes_dir);
    ingredients = get_ingredient_set(recipes.map((r) => r.path));
  }
</script>

<div>
  <h1>Search Recipes</h1>
  <div class="columns">
    <div>
      {#await ingredients}
        <li>Loading...</li>
      {:then ingredients}
        <h2>Ingredients</h2>
        <ul>
          {#each ingredients as ingredient}
            <li>
              {ingredient}
            </li>
          {/each}
        </ul>
      {/await}
    </div>
    <div>
      <h2>Recipes</h2>
      <ul>
        {#each recipes as recipe}
          <li>
            {recipe.name}
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>

<style>
  .columns {
    columns: 2 auto;
  }
</style>
