<script lang="ts">
    import type { App } from "obsidian";
    import { DAYS_OF_WEEK } from "../constants";
    import { add_recipe_to_meal_plan } from "../meal_plan/plan";
    import { open_note_file } from "../utils/filesystem";
    import type { Recipe } from "./recipe";
    import { createEventDispatcher } from "svelte";
    
    export let app: App;
    export let recipe: Recipe;

    let open = false;

    let dispatch = createEventDispatcher();
</script>

<div class="realtive inline-block text-left">
    <div>
        <button
            on:click={() => (open = !open)}
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
        class:hidden={!open}
        class:flex={open}
        aria-orientation="vertical"
        aria-labelledby="menu-button"
        tabindex="-1"
    >
        <button
            on:click={async () => {
                await open_note_file(app, recipe.path);
                open = false;
                dispatch('close_modal');
            }}>Go to recipe</button
        >
        {#each DAYS_OF_WEEK as day}
            <button
                class="rounded-none"
                on:click={async () => {
                    await add_recipe_to_meal_plan(recipe, day);
                    open = false;
                }}>{day}</button
            >
        {/each}
    </div>
</div>
