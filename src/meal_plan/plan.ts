import { type App, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { GetCurrentWeek } from './utils.ts';

export async function AddRecipeToMealPlan(ctx: Context, recipe: Recipe, day: string) {
    let filePath = get(ctx.settings).mealPlanNote;
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    await fillMealPlanNote(ctx.app, filePath);

    const file = ctx.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
        file.vault.process(file, (content) => {
            const header = `Week of ${GetCurrentWeek()}`;
            const headerIndex = content.indexOf(header) + header.length;
            const dayHeader = `## ${day}`;
            const dayHeaderIndex = content.indexOf(dayHeader, headerIndex) + dayHeader.length;

            const recipeLine = `\n- [[${recipe.name}]]`;

            content = content.slice(0, dayHeaderIndex) + recipeLine + content.slice(dayHeaderIndex);

            return content;
        });
    }
}

export async function OpenMealPlanNote(app: App, filePath: string) {
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }
    await createMealPlanNote(app, filePath);

    let found = false;
    app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.getDisplayText() === filePath.substring(0, filePath.length - 3)) {
            // console.log(leaf.getDisplayText());
            app.workspace.setActiveLeaf(leaf);
            found = true;
        }
    });

    if (!found) {
        await app.workspace.openLinkText(filePath, '', true);
    }

    fillMealPlanNote(app, filePath);
}

async function fillMealPlanNote(app: App, filePath: string) {
    const header = `Week of ${GetCurrentWeek()}`;
    const dayHeaders = DAYS_OF_WEEK.map((day) => {
        return `## ${day}`;
    });

    const file = app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
        app.vault.process(file, (content) => {
            if (content.contains(header)) {
                return content;
            }

            return `# ${header}\n${dayHeaders.join('\n\n')}\n${content}`;
        });
    }
}

async function createMealPlanNote(app: App, filePath: string) {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (file === undefined) {
        await app.vault.create(filePath, '');
    } else if (!(file instanceof TFile)) {
        console.error('Meal plan note is not a file');
    }
}
