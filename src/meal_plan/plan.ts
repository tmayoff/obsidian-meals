import { type App, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants';
import type { Context } from '../context';
import type { Recipe } from '../recipe/recipe';
import { get_current_week } from './utils';

export async function AddRecipeToMealPlan(ctx: Context, recipe: Recipe, day: string) {
    let filePath = get(ctx.settings).meal_plan_note;
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    await fillMealPlanNote(ctx.app, filePath);

    const file = ctx.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
        file.vault.process(file, (content) => {
            const header = `Week of ${get_current_week()}`;
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
    const header = `Week of ${get_current_week()}`;
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
