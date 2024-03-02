<script lang="ts">
  import { derived, writable } from "svelte/store";
  import { IngredientSuggestionModal } from "../suggester/IngredientSuggest";
  import { TextComponent } from "obsidian";
  import { onMount } from "svelte";
  import RecipeButton from "./RecipeButton.svelte";
    import type { Context } from "../context";

  export let ctx: Context;

  let ingredients = ctx.ingredients;
  
  let search_operation = writable("any of");

  const search_ingredients = writable(new Set<string>());

  function add_ingredient(ingredient: string) {
    search_ingredients.update((items) => {
      items.add(ingredient);
      return items;
    });
  }

  const found_recipes = derived(
    [search_ingredients, search_operation, ctx.recipes],
    ([$search_ingredients, $search_operation, $recipes]) => {
      return $recipes.filter((recipe) => {
        let descs = recipe.ingredients.map((i) => {
          if (i == undefined || i.description === undefined) {
            return "";
          }

          return i.description.toLocaleLowerCase();
        });

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
    let suggester_text = new TextComponent(suggester_parent);
    suggester_text.inputEl.addClass("w-full");

    let suggester = new IngredientSuggestionModal(ctx.app, suggester_text, [
      ...$ingredients,
    ]);

    suggester_text.onChange(() => {
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
  <h1>Search recipes</h1>
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
                    on:click|preventDefault={() => {
                      search_ingredients.update((items) => {
                        items.delete(ingredient);
                        return items;
                      });
                    }}
                    ><svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="lucide lucide-minus-circle"
                      ><circle cx="12" cy="12" r="10" /><path
                        d="M8 12h8"
                      /></svg
                    ></button
                  >
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
          <RecipeButton on:close_modal {ctx} {recipe} />
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
</style>
