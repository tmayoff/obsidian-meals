<script lang="ts">
  import { derived, writable } from "svelte/store";
  import { ingredients, recipes } from "../store";
  import { PlusCircle } from "lucide-svelte";

  const search = writable("");
  const ingredients_search_results = derived(
    [search, ingredients],
    ([$search, $ingredients]) => {
      if ($search.length == 0) return [];

      console.log("Searching ", $search);

      // Levenshtein distance
      return [...$ingredients].filter((i) => {
        return i.contains($search);
      });
    }
  );

  const search_ingredients = writable(new Set<string>());

  function add_ingredient(ingredient: string) {
    console.log("Pushing to ingredients, ", ingredient);
    search_ingredients.update((items) => {
      items.add(ingredient);
      return items;
    });
  }

  const found_recipes = derived(
    [search_ingredients, recipes],
    ([$search_ingredients, $recipes]) => {
      return $recipes.filter((recipe) => {
        let descs = recipe.ingredients.map((i) =>
          i.description.toLocaleLowerCase()
        );

        return [...$search_ingredients].every((i) => {
          return descs.contains(i);
        });
      });
    }
  );
</script>

<div>
  <h1 class="">Search Recipes</h1>
  <div class="columns">
    <div class="column flex-box">
      <h2>Ingredients</h2>
      <div>
        <!-- <label>Add all ingredients</label> -->
        <PlusCircle />
      </div>
      <div class="search-container">
        <div>
          <form
            on:submit={(e) => {
              if ($ingredients_search_results.length > 0) {
                add_ingredient($ingredients_search_results[0]);
                $search = "";
              }
              e.preventDefault();
            }}
          >
            <input
              type="text"
              placeholder="search for ingredients to add"
              bind:value={$search}
            />
          </form>
          {#if $ingredients_search_results.length > 0}
            <div class="search-results">
              {#each $ingredients_search_results as i}
                <div>
                  {i}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div>
          <ul>
            {#each $search_ingredients as ingredient}
              <li>{ingredient}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
    <div class="column">
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
  .column {
    float: left;
    width: 50%;
  }

  .columns::after {
    content: "";
    display: table;
    clear: both;
  }

  .search-results {
    position: absolute;
    background-color: var(--modal-background);

    border: var(--modal-border-width) solid var(--modal-border-color);
    border-radius: var(--modal-radius);

    padding: var(--size-4-1);
  }
</style>
