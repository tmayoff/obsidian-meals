import type { App } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { GetCurrentWeek } from '../utils/utils.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';

export async function AddRecipeToMealPlan(ctx: Context, recipe: Recipe, day: string) {
    let filePath = get(ctx.settings).mealPlanNote;
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    await fillMealPlanNote(ctx, filePath);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        file.vault.process(file, (content) => {
            const header = `Week of ${GetCurrentWeek(get(ctx.settings).startOfWeek)}`;
            const headerIndex = content.indexOf(header) + header.length;
            const dayHeader = `## ${day}`;
            const dayHeaderIndex = content.indexOf(dayHeader, headerIndex) + dayHeader.length;

            const recipeLine = `\n- [[${recipe.name}]]`;

            content = content.slice(0, dayHeaderIndex) + recipeLine + content.slice(dayHeaderIndex);

            return content;
        });
    }
}

export async function OpenMealPlanNote(ctx: Context, filePath: string) {
    AppendMarkdownExt(filePath);
    await createMealPlanNote(ctx.app, filePath);

    let found = false;
    ctx.app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.getDisplayText() === filePath.substring(0, filePath.length - 3)) {
            ctx.app.workspace.setActiveLeaf(leaf);
            found = true;
        }
    });

    if (!found) {
        await ctx.app.workspace.openLinkText(filePath, '', true);
    }

    fillMealPlanNote(ctx, filePath);
}

async function fillMealPlanNote(ctx: Context, filePath: string) {
    const dayOffset = get(ctx.settings).startOfWeek;
    const header = `Week of ${GetCurrentWeek(dayOffset)}`;

    const dayHeaders: string[] = [];

    for (let i = 0; i < DAYS_OF_WEEK.length; ++i) {
        const pos = (i + dayOffset) % DAYS_OF_WEEK.length;
        dayHeaders.push(`## ${DAYS_OF_WEEK[pos]}`);
    }

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        ctx.app.vault.process(file, (content) => {
            if (content.contains(header)) {
                return content;
            }

            return `# ${header}\n${dayHeaders.join('\n')}\n${content}`;
        });
    }
}

async function createMealPlanNote(app: App, filePath: string) {
    const file = app.vault.getFileByPath(filePath);
    if (file == null) {
        await app.vault.create(filePath, '');
    } else {
        console.error('Meal plan note is not a file');
    }
}
