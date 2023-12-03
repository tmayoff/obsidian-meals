<script lang="ts">
  import { derived, writable } from "svelte/store";
  import { ingredients, recipes } from "../store";
  import { MinusCircle } from "lucide-svelte";
  import { IngredientSuggestionModal } from "../suggester/IngredientSuggest";
  import { TextComponent } from "obsidian";
  import { onMount } from "svelte";
  import { DAYS_OF_WEEK } from "../constants";
  import { add_recipe_to_meal_plan } from "../meal_plan/plan";
  import Dropdown from "../utils/Dropdown.svelte";

  let search_operation = writable("any of");

  const search_ingredients = writable(new Set<string>());

  function add_ingredient(ingredient: string) {
    console.log("Pushing to ingredients, ", ingredient);
    search_ingredients.update((items) => {
      items.add(ingredient);
      return items;
    });
  }

  const found_recipes = derived(
    [search_ingredients, search_operation, recipes],
    ([$search_ingredients, $search_operation, $recipes]) => {
      return $recipes.filter((recipe) => {
        let descs = recipe.ingredients.map((i) =>
          i.description.toLocaleLowerCase()
        );

        if ($search_operation == "all of") {
          return [...$search_ingredients].every((i) => {
            return descs.contains(i);
          });
        } else if ($search_operation == "any of") {
          return [...$search_ingredients].some((i) => {
            return descs.contains(i);
          });
        }
      });
    }
  );

  let suggester_parent: HTMLElement;
  onMount(() => {
    console.log("Loaded suggester parent");
    let suggester_text = new TextComponent(suggester_parent);
    suggester_text.inputEl.addClass("w-full");

    let suggester = new IngredientSuggestionModal(app, suggester_text, [
      ...$ingredients,
    ]);

    suggester_text.onChange((text) => {
      suggester.shouldNotOpen = false;
      suggester.open();
    });

    suggester.onClose = () => {
      add_ingredient(suggester.text.getValue());
      suggester.text.setValue("");
    };
  });
</script>

<div>
  <h1>Search Recipes</h1>
  <div class="flex flex-col md:flex-row">
    <div class="basis-1/2 flex flex-col space-x-4">
      <h2>Ingredients</h2>
      <div class="w-full flex flex-row justify-evenly items-center m-1 ml-0">
        <label for="filter-combination">recipes containing</label>
        <select name="filter-combination" bind:value={$search_operation}>
          <option>all of</option>
          <option>any of</option>
        </select>
      </div>
      <div class="search-container ml-0">
        <div bind:this={suggester_parent} />
        <div class="m-2">
          <div>
            {#each $search_ingredients as ingredient}
              <div class="flex flex-row justify-between items-center">
                <div>{ingredient}</div>
                <div>
                  <button
                    on:click|preventDefault={(e) => {
                      search_ingredients.update((items) => {
                        items.delete(ingredient);
                        return items;
                      });
                    }}
                  >
                    <MinusCircle />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="basis-1/2">
      <h2>Recipes</h2>
      <div class="flex flex-col p-3">
        {#each $found_recipes as recipe}
          <Dropdown text={recipe.name}>
            {#each DAYS_OF_WEEK as day}
              <button
                class="rounded-none"
                on:click={async () => {
                  await add_recipe_to_meal_plan(recipe, day);
                }}>{day}</button
              >
            {/each}
          </Dropdown>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
</style>
