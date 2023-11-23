<script lang="ts">
  import { derived, writable } from "svelte/store";
  import { ingredients, recipes } from "../store";
  import { PlusCircle } from "lucide-svelte";

  const search = writable("");
  const searched_ingredients = derived(
    [search, ingredients],
    ([$search, $ingredients]) => {
      console.log("Searching ", $search);
      if ($search.length == 0) return [];
      return [...$ingredients].filter((i) => {
        return i.contains($search);
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
        <input
          type="text"
          placeholder="search for ingredients to add"
          bind:value={$search}
        />
        <div class="search-results">
          <div>
            <ul>
              <!-- TODO Make modal -->
              {#each $searched_ingredients as i}
                <li>
                  {i}
                </li>
              {/each}
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="column">
      <h2>Recipes</h2>
      <ul>
        {#each $recipes as recipe}
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
</style>
