<script lang="ts">
  import { derived, writable } from "svelte/store";
  import { ingredients, recipes } from "../store";
  import { PlusCircle, MinusCircle } from "lucide-svelte";

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
    <div class="column">
      <h2>Ingredients</h2>
      <div class="flex filter-toolbox">
        <p>Add all ingredients</p>
        <button
          on:click={(e) => {
            // TODO Add all ingredients
          }}
        >
          <PlusCircle />
        </button>
      </div>
      <div class="search-container">
        <div bind:this={suggester_parent} />
        <div>
          <div>
            {#each $search_ingredients as ingredient}
              <div>
                <div>{ingredient}</div>
                <div>
                  <button
                    on:click={(e) => {
                      console.log("Remove ingredient");
                    }}
                  >
                    <MinusCircle /></button
                  >
                </div>
              </div>
            {/each}
          </div>
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
  .flex {
    display: flex;
  }

  .filter-toolbox {
    padding-left: var(--size-4-1);
    padding-right: var(--size-4-1);
    justify-content: space-around;
    align-items: center;
  }

  .column {
    float: left;
    width: 50%;
  }

  .columns::after {
    content: "";
    display: table;
    clear: both;
  }
</style>
