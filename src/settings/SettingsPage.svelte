<script lang="ts">
import { Notice } from 'obsidian';
import Toggle from '../components/Toggle.svelte';
import { DAYS_OF_WEEK } from '../constants.ts';
import { validateIgnoreBehaviour } from '../utils/utils.ts';
import Setting from './Setting.svelte';

// biome-ignore lint: doesn't actually work
import { MealPlanFormat, RecipeFormat, ShoppingListIgnoreBehaviour } from './settings.ts';

let { plugin } = $$props;
let settings = plugin.ctx.settings;

let onIgnoreBehaviourChanged = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const behaviour = <ShoppingListIgnoreBehaviour>target.value;

    const res = validateIgnoreBehaviour($settings.shoppingListIgnore, behaviour);

    if (res.isErr()) {
        new Notice(res.error.message);
        return;
    }
};

let tempIgnoreList: string = $settings.shoppingListIgnore.join('\n');

let onIgnoreListChanged = (e: Event) => {
    $settings.shoppingListIgnore = tempIgnoreList.split('\n');

    const target = e.target as HTMLSelectElement;
    const list = target.value.split('\n');
    const res = validateIgnoreBehaviour(list, $settings.shoppingListIgnoreBehaviour);

    if (res.isErr()) {
        new Notice(res.error.message);
        return;
    }
};
</script>

<Setting>
  <div slot="title">Recipe directory</div>
  <div slot="description">Parent folder where recipes are stored</div>

  <div slot="control">
    <input type="text" bind:value={$settings.recipeDirectory} />
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
    <select class="dropdown" bind:value={$settings.startOfWeek}>
      {#each DAYS_OF_WEEK as day, index}
        <option value={index}>{day}</option>
      {/each}
    </select>
  </div>
</Setting>

<Setting>
  <div slot="title">Meal plan format</div>
  <div slot="description">
    <p>Choose how the meal plan is displayed:</p>
    <ul>
      <li><strong>List:</strong> Each day shown as a heading with recipes as bullet points (default)</li>
      <li><strong>Table:</strong> Weekly grid with columns for each day, showing all days at a glance</li>
    </ul>
  </div>

  <div slot="control">
    <select class="dropdown" bind:value={$settings.mealPlanFormat}>
      <option value={MealPlanFormat.List}>List</option>
      <option value={MealPlanFormat.Table}>Table</option>
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
    <select class="dropdown" bind:value={$settings.recipeFormat}>
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
      rows="6"
      onblur={onIgnoreListChanged}
      bind:value={tempIgnoreList}
    ></textarea>
  </div>
</Setting>

<Setting>
  <div slot="title">Shopping list ignore behaviour</div>
  <div slot="description">
    <p>
      <strong>Exact:</strong> Ignore if ingredient name exactly matches any element
      in ignore list.
    </p>

    <p>
      <strong>Partial:</strong> Ignore if the ingredient name contains any element
      in ignore list (Example: "olive oil" will be ignored if "oil" exists in ignore
      list).
    </p>

    <p>
      <strong>Wildcard:</strong> Ignore if the ingredient name matches by wildcard
      (Example: both "sea salt" and "salt" will be ignored by "*salt", but "salted
      nuts" won’t be ignored).
    </p>

    <p>
      <strong>Regex:</strong> Ignore if any regex match is found in the
      ingredient name (Example: "red pepper" will be ignored if this regex
      exists in ignore list: ".{"{"}(0, 3){"}"} pepper", but "black pepper" won’t
      be ignored).
    </p>
  </div>

  <div slot="control">
    <select
      class="dropdown"
      oninput={onIgnoreBehaviourChanged}
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

  <Toggle slot="control" bind:enabled={$settings.advancedIngredientParsing} />
</Setting>

<Setting>
  <div slot="title">Include nutritional information in download</div>
  <div slot="description">
    This will add all available nutritional information to the frontmatter of
    the recipe
  </div>

  <Toggle slot="control" bind:enabled={$settings.includeNutritionalInformation } />
</Setting>

<Setting>
  <div slot="title">Show error when recipe file is invalid</div>
  <div slot="description">
    When enabled, a notification will be shown for each recipe file that fails to parse. When disabled, errors will only be logged to the console.
  </div>
  <Toggle slot="control" bind:enabled={$settings.showRecipeParseErrors} />
</Setting>

<Setting>
  <div slot="title">Debug mode</div>
  <div slot="description">
    This enables extra debugging tools: logging, menu options, etc...
  </div>
  <Toggle slot="control" bind:enabled={$settings.debugMode} />
</Setting>
