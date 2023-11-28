<script lang="ts">
  import { derived, writable } from "svelte/store";
  import { ingredients, recipes } from "../store";
  import { PlusCircle, MinusCircle } from "lucide-svelte";
  import { IngredientSuggestionModal } from "../suggester/IngredientSuggest";
  import { TextComponent, type FuzzyMatch } from "obsidian";
  import { onMount } from "svelte";

  let search_operation = writable("OR");

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

        if ($search_operation == "AND") {
          return [...$search_ingredients].every((i) => {
            return descs.contains(i);
          });
        } else if ($search_operation == "OR") {
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
  <div class="flex flex-row">
    <div class="basis-1/2 flex flex-col space-x-4">
      <h2>Ingredients</h2>
      <div class="w-full flex flex-row justify-evenly items-center m-4">
        <!-- <p>Add all ingredients</p>
        <button
          on:click={(e) => {
            // TODO Add all ingredients
          }}
        >
          <PlusCircle />
        </button> -->
        <select bind:value={$search_operation}>
          <option>AND</option>
          <option>OR</option>
        </select>
      </div>
      <div class="search-container m-1">
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
      <ul>
        {#each $found_recipes as recipe}
          <li>
            {recipe.name}
          </li>
        {/each}
      </ul>
    </div>
  </div>
</div>

<style>
</style>
