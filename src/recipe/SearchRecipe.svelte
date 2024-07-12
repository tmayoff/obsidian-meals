<script lang="ts">
import { TextComponent } from 'obsidian';
import { onMount } from 'svelte';
import { derived, writable } from 'svelte/store';
import type { Context } from '../context';
import { IngredientSuggestionModal } from '../suggester/IngredientSuggest';
import RecipeButton from './RecipeButton.svelte';

export let ctx: Context;

const ingredients = ctx.ingredients;

const searchOperation = writable('any of');

const searchIngredients = writable(new Set<string>());

function addIngredient(ingredient: string) {
    searchIngredients.update((items) => {
        items.add(ingredient);
        return items;
    });
}

const foundRecipes = derived([searchIngredients, searchOperation, ctx.recipes], ([$searchIngredients, $searchOperation, $recipes]) => {
    return $recipes.filter((recipe) => {
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

let suggesterParent: HTMLElement;
onMount(async () => {
    const suggesterText = new TextComponent(suggesterParent);
    suggesterText.inputEl.addClass('w-full');

    const suggester = new IngredientSuggestionModal(ctx.app, suggesterText, [...$ingredients]);

    suggesterText.onChange(() => {
        suggester.shouldNotOpen = false;
        suggester.open();
    });

    suggester.onClose = () => {
        addIngredient(suggester.text.getValue());
        suggester.text.setValue('');
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
        <select name="filter-combination" bind:value={$searchOperation}>
          <option>all of</option>
          <option>any of</option>
        </select>
      </div>
      <div class="search-container ml-0">
        <div bind:this={suggesterParent} />
        <div class="m-2">
          <div>
            {#each $searchIngredients as ingredient}
              <div class="flex flex-row justify-between items-center">
                <div>{ingredient}</div>
                <div>
                  <button
                    on:click|preventDefault={() => {
                      searchIngredients.update((items) => {
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
        {#each $foundRecipes as recipe}
          <!-- svelte-ignore missing-declaration -->
          <RecipeButton on:close_modal {ctx} {recipe} />
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
</style>
