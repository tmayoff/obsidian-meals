<script lang="ts">
import { DAYS_OF_WEEK } from '../constants.ts';
import Setting from './Setting.svelte';
import { RecipeFormat, ShoppingListIgnoreBehaviour } from './settings';

let { plugin } = $props();
let settings = plugin.ctx.settings;

let updateDebugMode = async () => {
    const enabled: boolean = !$settings.debugMode;
    $settings.debugMode = enabled;

    if (enabled) {
        plugin.addCommand({
            id: 'reload-recipes',
            name: 'Reload all recipes',
            callback: async () => {
                await plugin.ctx.loadRecipes(undefined);
            },
        });
    } else {
        plugin.removeCommand('reload-recipes');
    }

    await plugin.saveSettings();
    await plugin.ctx.loadRecipes(undefined);
};

let validateIgnoreBehaviour = (ignoreList: string[], behaviour: ShoppingListIgnoreBehaviour) => {
    if ([ShoppingListIgnoreBehaviour.Exact, ShoppingListIgnoreBehaviour.Partial].contains(behaviour)) {
        return true;
    }

    for (const item of ignoreList) {
        try {
            if (behaviour === ShoppingListIgnoreBehaviour.Wildcard) {
                new RegExp(wildcardToRegex(item));
            } else {
                new RegExp(item);
            }
        } catch (e) {
            new Notice(`Shopping list's ignore items are invalid: ${(<Error>e).message}.`);
            return false;
        }
    }
    return true;
};

let onIgnoreBehaviourChanged = async (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const behaviour = <ShoppingListIgnoreBehaviour>target.value;
    if (!validateIgnoreBehaviour(behaviour)) {
        target.value = $settings.shoppingListIgnoreBehaviour;
        return;
    }

    await plugin.saveSettings();
};
</script>

<Setting>
  <div slot="title">Recipe directory</div>
  <div slot="description">Parent folder where recipes are stored</div>

  <div slot="control">
    <input
      type="text"
      bind:value={$settings.recipeDirectory}
      onchange={() => plugin.saveSettings()}
    />
  </div>
</Setting>

<Setting>
  <div slot="title">Meal plan note</div>
  <div slot="description">Note to store the weekly meal plans</div>

  <div slot="control">
    <input
      type="text"
      placeholder="Meal Plan"
      bind:value={$settings.mealPlanNote}
      onchange={() => plugin.saveSettings()}
    />
  </div>
</Setting>

<Setting>
  <div slot="title">Shopping List note</div>
  <div slot="description">Note for storing your shopping list</div>

  <div slot="control">
    <input
      type="text"
      placeholder="Shopping List"
      bind:value={$settings.shoppingListNote}
      onchange={() => plugin.saveSettings()}
    />
  </div>
</Setting>

<Setting>
  <div slot="title">Start of the week</div>
  <div slot="description">
    What day to consider as the start of the week (mainly affects the meal
    planning)
  </div>

  <div slot="control">
    <select
      class="dropdown"
      bind:value={$settings.startOfWeek}
      onchange={() => {
        plugin.saveSettings();
      }}
    >
      {#each DAYS_OF_WEEK as day, index}
        <option value={index}>{day}</option>
      {/each}
    </select>
  </div>
</Setting>

<Setting>
  <div slot="title">Recipe format</div>
  <div slot="description">
    What format to use for reading the recipes
    <ul>
      <li>
        RecipeMD: <a href="https://recipemd.org/">Follows this standard</a>
      </li>
      <li>
        Meal Plan: a custom but now deprecated format, <a
          href="https://github.com/tmayoff/obsidian-meals?tab=readme-ov-file#formatting-recipe-notes"
          >more details here</a
        >
      </li>
    </ul>
  </div>

  <div slot="control">
    <select
      class="dropdown"
      bind:value={$settings.recipeFormat}
      onchange={() => {
        plugin.saveSettings();
      }}
    >
      <option value={RecipeFormat.RecipeMD}>RecipeMD</option>
      <option value={RecipeFormat.MealPlan}>MealPlan</option>
    </select>
  </div>
</Setting>

<Setting>
  <div slot="title">Shopping list format</div>
  <div slot="description">
    <p>
      How to format the ingredients added to the shopping list.<br />
      Add the properties of the ingredient object in {"{"}{"}"}<br />

      The reference for properties are
      <a href="https://www.npmjs.com/package/parse-ingredient">here</a>.
    </p>
  </div>

  <div slot="control">
    <input
      type="text"
      placeholder="&lbrace;description&rbrace; &lbrace;quantity&rbrace; &lbrace;unitOfMeasure&rbrace;"
      bind:value={$settings.shoppingListFormat}
      onchange={() => plugin.saveSettings()}
    />
  </div>
</Setting>

<Setting>
  <div slot="title">Shopping list ignore</div>
  <div slot="description">
    <p>
      List of ingredients to skip when adding to the shopping list, one item per
      line
    </p>
  </div>

  <div slot="control">
    <textarea
      placeholder="salt&#13;pepper"
      bind:value={$settings.shoppingListIgnore}
    />
  </div>
</Setting>

<Setting>
  <div slot="title">Shopping list ignore behaviour</div>
  <div slot="description"></div>

  <div slot="control">
    <select
      class="dropdown"
      oninput={async (e) => {
        await onIgnoreBehaviourChanged(e);
      }}
      bind:value={$settings.shoppingListIgnoreBehaviour}
    >
      <option value={ShoppingListIgnoreBehaviour.Exact}>Exact</option>
      <option value={ShoppingListIgnoreBehaviour.Partial}>Partial</option>
      <option value={ShoppingListIgnoreBehaviour.Wildcard}>Wildcard</option>
      <option value={ShoppingListIgnoreBehaviour.Regex}>Regex</option>
    </select>
  </div>
</Setting>

<Setting>
  <div slot="title">Advanced ingredient parsing</div>
  <div slot="description">
    This will add some extra rules to parsing an ingredient's name, ignoring
    text after the first comma and turning the name singular
  </div>

  <div
    slot="control"
    class={[
      "checkbox-container",
      $settings.advancedIngredientParsing ? "is-enabled" : "",
    ]}
  >
    <input
      type="checkbox"
      bind:checked={$settings.advancedIngredientParsing}
      onchange={() => plugin.saveSettings()}
    />
  </div>
</Setting>

<Setting>
  <div slot="title">Debug mode</div>
  <div slot="desciption">
    This enables extra debugging tools: logging, menu options, etc...
  </div>
  <div
    slot="control"
    class={["checkbox-container", $settings.debugMode ? "is-enabled" : ""]}
  >
    <input type="checkbox" onchange={() => updateDebugMode()} />
  </div>
</Setting>
