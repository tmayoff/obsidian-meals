<script lang="ts">
import { Eye, Menu, Trash2 } from 'lucide-svelte';
import { derived, readonly, type Writable, writable } from 'svelte/store';
import type { Context } from '../context.ts';
import { AddToPlanModal } from '../meal_plan/add_to_plan.ts';
import { OpenMealPlanNote } from '../meal_plan/plan.ts';
import { IngredientSuggestionModal } from '../suggester/IngredientSuggest.ts';
import { OpenNoteFile } from '../utils/filesystem.ts';
import type { Recipe } from './recipe.ts';

type Props = {
    ctx: Context;
    onClose: () => void;
};

let { ctx, onClose }: Props = $props();

const settings = ctx.settings;

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

        return false;
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
    <div class="pt-3 pb-3">
      {#each $searchIngredients as ingredient}
        <div class="align-middle m-0">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_missing_attribute -->
          <a
            class="inline-block text-red-600 hover:text-red-800 shadow-transparent mr-3"
            onclick={() => {
              $searchIngredients.delete(ingredient);
              $searchIngredients = $searchIngredients;
            }}
          >
            <Trash2 />
          </a>
          <span class="inline-block">{ingredient}</span>
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
    <div class="p-3 rounded-md" style="background:var(--color-base-30)">
      {#each $filteredRecipes as recipe, i}
        <div>
          <h5>
            {recipe.name}
          </h5>
          <div class="align-middle">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a
              class="mr-3"
              onclick={async () => {
                await OpenNoteFile(ctx.app, recipe.path);
                onClose();
              }}
            >
              <Eye class="inline-block mr-1" />View recipe</a
            >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              class="mr-3"
              onclick={() => {
                const m = new AddToPlanModal(ctx, recipe);
                m.onClose = async () => {
                  await OpenMealPlanNote(ctx, $settings.mealPlanNote);
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
</div>

<style>
</style>
