import type moment from 'moment';
import { Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import CalendarView from './CalendarView.svelte';
import { type CalendarItem, extractDailyRecipes } from './calendar_data.ts';
import { AddRecipeToMealPlanByDate } from './plan.ts';

export class CalendarModal extends Modal {
    private component: Record<string, any> | null = null;
    private ctx: Context;
    private recipe: Recipe;
    private dailyItems: Map<string, CalendarItem[]> = new Map();

    constructor(ctx: Context, recipe: Recipe) {
        super(ctx.app);
        this.ctx = ctx;
        this.recipe = recipe;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Load existing meal plan data
        await this.loadMealPlanData();

        const settings = get(this.ctx.settings);

        this.component = mount(CalendarView, {
            target: contentEl,
            props: {
                recipeName: this.recipe.name,
                startOfWeek: settings.startOfWeek,
                dailyItems: this.dailyItems,
                onSelectDay: async (date: moment.Moment, dayName: string) => {
                    await AddRecipeToMealPlanByDate(this.ctx, this.recipe, date, dayName);
                    this.close();
                },
                onCancel: () => {
                    this.close();
                },
            },
        });
    }

    private async loadMealPlanData() {
        const settings = get(this.ctx.settings);
        const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);
        const mealPlanFile = this.ctx.app.vault.getFileByPath(mealPlanFilePath);

        if (mealPlanFile) {
            this.dailyItems = await extractDailyRecipes(this.ctx, mealPlanFile, settings.startOfWeek);
        }
    }

    onClose() {
        if (this.component) {
            unmount(this.component);
        }
        this.contentEl.empty();
    }
}
