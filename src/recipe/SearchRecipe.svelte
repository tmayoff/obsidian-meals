<script lang="ts">
import { Eye, Menu, Trash2 } from 'lucide-svelte';
import { type Writable, derived, readonly, writable } from 'svelte/store';
import type { Context } from '../context.ts';
import { AddToPlanModal } from '../meal_plan/add_to_plan.ts';
import { IngredientSuggestionModal } from '../suggester/IngredientSuggest.ts';
import { OpenNoteFile } from '../utils/filesystem.ts';
import type { Recipe } from './recipe.ts';

type Props = {
    ctx: Context;
    onClose: () => void;
};

let { ctx, onClose }: Props = $props();

const ingredients = readonly(ctx.ingredients);

let filterCombinator = writable('any of');

const searchIngredients = writable(new Set<string>());
const recipes = ctx.recipes;

const filteredRecipes = derived([searchIngredients, filterCombinator, recipes], ([$searchIngredients, $searchOperation, $recipes]) => {
    return $recipes.filter((recipe: Recipe) => {
        const descs = recipe.ingredients.map((i) => {
            if (i === undefined || i.description === undefined) {
                return '';
            }

            return i.description.toLocaleLowerCase();
        });

        if ($searchOperation === 'all of') {
            return [...$searchIngredients].every((i) => {
                return descs.contains(i);
            });
        }
        if ($searchOperation === 'any of') {
            return [...$searchIngredients].some((i) => {
                return descs.contains(i);
            });
        }
    });
});

let suggesterText: Writable<HTMLInputElement | null> = writable(null);
let suggester: IngredientSuggestionModal;
suggesterText.subscribe((textInput: HTMLInputElement | null) => {
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
    <div class="p-3">
      {#each $searchIngredients as ingredient}
        <div class="align-middle m-0">
          <a
            class="inline-block text-red-600 hover:text-red-800 shadow-transparent mr-3"
            onclick={() => {
              $searchIngredients.delete(ingredient);
              $searchIngredients = $searchIngredients;
            }}
          >
            <Trash2 />
          </a>
          <p class="inline-block">{ingredient}</p>
        </div>
      {/each}
    </div>

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

  {#if $filteredRecipes.length > 0}
    <div class="bg-slate-300 p-3 rounded-md">
      {#each $filteredRecipes as recipe, i}
        <div>
          <h5>
            {recipe.name}
          </h5>
          <div class="align-middle">
            <a
              class="mr-3"
              onclick={async () => {
                await OpenNoteFile(ctx.app, recipe.path);
                onClose();
              }}
            >
              <Eye class="inline-block mr-1" />View recipe</a
            >
            <a
              class="mr-3"
              onclick={() => {
                const m = new AddToPlanModal(ctx, recipe);
                m.onClose = () => {
                  onClose();
                };
                m.open();
              }}
            >
              <Menu class="inline-block mr-1" />Add to meal plan</a
            >
          </div>
        </div>

        {#if i < $filteredRecipes.length - 1}
          <div
            class="w-full mb-2 mt-2 border-t-2 border-t-solid border-gray-200"
          ></div>
        {/if}
      {/each}
    </div>
  {/if}

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
