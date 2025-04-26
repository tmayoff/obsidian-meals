<script lang="ts">
import { Trash2 } from 'lucide-svelte';
import { derived, type readable, writable } from 'svelte/store';
import type { Context } from '../context.ts';
import { IngredientSuggestionModal } from '../suggester/IngredientSuggest.ts';
import type { Recipe } from './recipe.ts';

type Props = {
    ctx: Context;
    onClose: () => void;
};

let { ctx, onClose }: Props = $props();

const ingredients: readable<Set<string>> = ctx.ingredients;

let filterCombinator: writable<string> = writable('any of');

const searchIngredients: writable<Set<string>> = writable(new Set<string>());
searchIngredients.subscribe((s) => {
    console.log(s);
});
const recipes: writable<Recipe[]> = ctx.recipes;

const filteredRecipes = derived(searchIngredients, ($searchIngredients) => {
    console.log('SAJDHAKJFHLAF');
});

//const filteredRecipes = derived(
//  [searchIngredients, filterCombinator, recipes],
//  ([$searchIngredients, $searchOperation, $recipes]) => {
//    console.log("Updating recipes");
//    return $recipes.filter((recipe: Recipe) => {
//      const descs = recipe.ingredients.map((i) => {
//        if (i === undefined || i.description === undefined) {
//          return "";
//        }

//        return i.description.toLocaleLowerCase();
//      });

//      if ($searchOperation === "all of") {
//        return [...$searchIngredients].every((i) => {
//          return descs.contains(i);
//        });
//      }
//      if ($searchOperation === "any of") {
//        return [...$searchIngredients].some((i) => {
//          return descs.contains(i);
//        });
//      }
//    });
//  },
//);

let suggesterText: writable<HTMLElement> = writable(null);
let suggester: IngredientSuggestionModal;
suggesterText.subscribe((textInput: HTMLInputElement) => {
    if (textInput === null) {
        return;
    }

    suggester = new IngredientSuggestionModal(ctx.app, textInput, [...$ingredients]);

    suggester.onClose = () => {
        const ingredient = suggester.text.value;
        suggester.text.value = '';
        if (ingredient === '') {
            return;
        }

        $searchIngredients.add(ingredient);

        // Hack to get svelte to react to the change
        // biome-ignore lint/correctness/noSelfAssign: Hack for svelte stores
        $searchIngredients = $searchIngredients;
    };
});
</script>

<div class="w-full">
  <h1>Search recipes</h1>
  <input
    type="text"
    bind:this={$suggesterText}
    class="w-full mb-3"
    placeholder="Search ingredients..."
    oninput={() => {
      suggester.shouldNotOpen = false;
      suggester.open();
    }}
  />

  <div>
    {#each $searchIngredients as ingredient}
      <div class="flex flex-row items-center m-2">
        <a class="text-red-600 hover:text-red-800 shadow-transparent mr-3">
          <Trash2 />
        </a>
        <p>{ingredient}</p>
      </div>
    {/each}

    <div class="flex flex-col">
      <label>
        <input
          type="radio"
          name="filterCombinator"
          value="any of"
          bind:group={$filterCombinator}
        />
        Containing any ingredients
      </label>

      <label>
        <input
          type="radio"
          name="filterCombinator"
          value="all of"
          bind:group={$filterCombinator}
        />
        Containing all ingredients
      </label>
    </div>
  </div>

  <div class="w-full mb-2 mt-2 border-t-2 border-t-solid border-gray-200"></div>

  <div>
    {#each filteredRecipes as recipe}
      {recipe.name}
    {/each}
  </div>

  <!--
  <div class="flex flex-col md:flex-row">
    <div class="basis-1/2 flex flex-col space-x-4">
      <h2>Ingredients</h2>
      <div class="w-full flex flex-row justify-evenly items-center m-1 ml-0">
        <label for="filter-combination">recipes containing</label>
        <select name="filter-combination" bind:value={$searchOperation}>
          <option>all of</option>
          <option>any of</option>
        </select>
      </div>
      <div class="search-container ml-0">
        <div bind:this={suggesterParent}></div>
        <div class="m-2">
          <div>
            {#each $searchIngredients as ingredient}
              <div class="flex flex-row justify-between items-center">
                <div>{ingredient}</div>
                <div>
                  <button
                    onclick={() => {
                      searchIngredients.update((items) => {
                        items.delete(ingredient);
                        return items;
                      });
                    }}
                    aria-label={ingredient}
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
        {#each $foundRecipes as recipe}
          <RecipeButton {onClose} {ctx} {recipe} />
        {/each}
      </div>
    </div>
  </div>-->
</div>

<style>
</style>
