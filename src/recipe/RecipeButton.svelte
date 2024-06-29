<script lang="ts">
  import { SuggestModal } from "obsidian";
  import type { Context } from "../context";
  import type { Recipe } from "./recipe";
  import { createEventDispatcher, onMount } from "svelte";
  import { open_note_file } from "../utils/filesystem";
  import { add_recipe_to_meal_plan } from "../meal_plan/plan";
  import { DAYS_OF_WEEK } from "../constants";

  export let ctx: Context;
  export let recipe: Recipe;

  let open = false;

  let dispatch = createEventDispatcher();

  type Callback = () => Promise<void>;

  class ButtonTarget {
    name: string = "";
    cb: Callback | undefined;
  }

  let button_targets: Array<ButtonTarget> = [
    {
      name: "Go to recipe",
      cb: async () => {
        await open_note_file(ctx.app, recipe.path);
        dispatch("close_modal");
      },
    },
  ];

  for (const d of DAYS_OF_WEEK) {
    button_targets.push({
      name: d,
      cb: async () => {
        await add_recipe_to_meal_plan(ctx, recipe, d);
      },
    });
  }

  class ButtonModal extends SuggestModal<ButtonTarget> {
    getSuggestions(_query: string): ButtonTarget[] | Promise<ButtonTarget[]> {
      // TODO search actions
      return button_targets;
    }
    onChooseSuggestion(item: ButtonTarget, _evt: KeyboardEvent | MouseEvent) {
      if (item.cb) {
        item.cb();
      }
      this.close();
    }
    renderSuggestion(item: ButtonTarget, el: HTMLElement): void {
      el.createEl("div", { text: item.name });
    }
  }

  let modal: ButtonModal;
  let open_recipe_dropdown = function () {
    modal.open();
  };

  onMount(() => {
    modal = new ButtonModal(ctx.app);
  });
</script>

<div class="realtive inline-block text-left">
  <div>
    <button
      on:click={open_recipe_dropdown}
      type="button"
      class="inline-flex w-full justify-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300"
      id="menu-button"
      aria-expanded={open}
      aria-haspopup="true"
      >{recipe.name}
      <svg
        class="-mr-1 h-5 w-5 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </button>
  </div>
  <div
    class="flex-col fixed z-10 w-56 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 bg-[--background-primary] border-[--background-modifier-border] border-2"
    role="menu"
    aria-orientation="vertical"
    aria-labelledby="menu-button"
    tabindex="-1"
  ></div>
</div>
