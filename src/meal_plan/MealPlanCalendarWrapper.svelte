<script lang="ts">
import type moment from 'moment';
import type { EventRef, TFile } from 'obsidian';
import { onDestroy, onMount } from 'svelte';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import CalendarView from './CalendarView.svelte';
import { type CalendarItem, extractDailyRecipes } from './calendar_data.ts';
import { DayDetailModal } from './DayDetailModal.ts';
import { AddRecipeToMealPlanByDate } from './plan.ts';
import { RecipePreviewModal } from './RecipePreviewModal.ts';
import { RecipeSelectModal } from './RecipeSelectModal.ts';

type Props = {
    ctx: Context;
};

let { ctx }: Props = $props();

let dailyItems: Map<string, CalendarItem[]> = $state(new Map());
let startOfWeek: number = $state(0);

let fileRef: TFile | null = null;
let eventRef: EventRef | null = null;

async function loadData() {
    const settings = get(ctx.settings);
    startOfWeek = settings.startOfWeek;

    const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);
    fileRef = ctx.app.vault.getFileByPath(mealPlanFilePath);

    if (fileRef) {
        dailyItems = await extractDailyRecipes(ctx, fileRef, startOfWeek);
    } else {
        dailyItems = new Map();
    }
}

function handleAddRecipe(date: moment.Moment, dayName: string) {
    new RecipeSelectModal(ctx, async (recipe) => {
        await AddRecipeToMealPlanByDate(ctx, recipe, date, dayName);
        // Don't call loadData() here - the metadataCache 'changed' event will trigger it
        // after the cache is updated with the new link positions
    }).open();
}

function handleItemClick(item: CalendarItem, date: moment.Moment, dayName: string) {
    // Only open the recipe preview modal for actual recipes
    if (item.isRecipe) {
        new RecipePreviewModal(ctx, item.name, date, dayName, async () => {
            // Don't call loadData() here - the metadataCache 'changed' event will trigger it
            // after the cache is updated with the new link positions
        }).open();
    }
}

function handleDayClick(date: moment.Moment, dayName: string, items: CalendarItem[]) {
    new DayDetailModal(ctx, date, dayName, items, async () => {
        // Don't call loadData() here - the metadataCache 'changed' event will trigger it
        // after the cache is updated with the new link positions
    }).open();
}

onMount(async () => {
    await loadData();

    // Subscribe to metadata cache changes instead of vault modify events
    // This ensures we refresh AFTER the metadata cache has updated with new link positions
    eventRef = ctx.app.metadataCache.on('changed', async (file) => {
        const settings = get(ctx.settings);
        const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);
        if (file.path === mealPlanFilePath) {
            await loadData();
        }
    });
});

onDestroy(() => {
    if (eventRef) {
        ctx.app.metadataCache.offref(eventRef);
    }
});
</script>

<div class="meal-plan-calendar-wrapper">
    <CalendarView
        mode="meal-plan-view"
        {startOfWeek}
        {dailyItems}
        onAddRecipe={handleAddRecipe}
        onItemClick={handleItemClick}
        onDayClick={handleDayClick}
    />
</div>

<style>
    .meal-plan-calendar-wrapper {
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 1rem;
    }
</style>
