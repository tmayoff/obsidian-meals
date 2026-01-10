<script lang="ts">
import type moment from 'moment';
import type { EventRef, TFile } from 'obsidian';
import { onDestroy, onMount } from 'svelte';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import CalendarView from './CalendarView.svelte';
import { extractDailyRecipes } from './calendar_data.ts';
import { AddRecipeToMealPlanByDate } from './plan.ts';
import { RecipePreviewModal } from './RecipePreviewModal.ts';
import { RecipeSelectModal } from './RecipeSelectModal.ts';

type Props = {
    ctx: Context;
};

let { ctx }: Props = $props();

let dailyRecipes: Map<string, string[]> = $state(new Map());
let startOfWeek: number = $state(0);

let fileRef: TFile | null = null;
let eventRef: EventRef | null = null;

async function loadData() {
    const settings = get(ctx.settings);
    startOfWeek = settings.startOfWeek;

    const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);
    fileRef = ctx.app.vault.getFileByPath(mealPlanFilePath);

    if (fileRef) {
        dailyRecipes = await extractDailyRecipes(ctx, fileRef, startOfWeek);
    } else {
        dailyRecipes = new Map();
    }
}

function handleAddRecipe(date: moment.Moment, dayName: string) {
    new RecipeSelectModal(ctx, async (recipe) => {
        await AddRecipeToMealPlanByDate(ctx, recipe, date, dayName);
        await loadData();
    }).open();
}

function handleRecipeClick(recipeName: string, date: moment.Moment, dayName: string) {
    new RecipePreviewModal(ctx, recipeName, date, dayName, async () => {
        await loadData();
    }).open();
}

onMount(async () => {
    await loadData();

    // Subscribe to file changes to refresh the calendar
    eventRef = ctx.app.vault.on('modify', async (file) => {
        const settings = get(ctx.settings);
        const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);
        if (file.path === mealPlanFilePath) {
            await loadData();
        }
    });
});

onDestroy(() => {
    if (eventRef) {
        ctx.app.vault.offref(eventRef);
    }
});
</script>

<div class="meal-plan-calendar-wrapper">
    <CalendarView
        mode="meal-plan-view"
        {startOfWeek}
        {dailyRecipes}
        onAddRecipe={handleAddRecipe}
        onRecipeClick={handleRecipeClick}
    />
</div>

<style>
    .meal-plan-calendar-wrapper {
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 1rem;
    }
</style>
