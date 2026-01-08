import type { App } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { MealPlanFormat } from '../settings/settings.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import { GetCurrentWeek } from '../utils/utils.ts';

export function createTableWeekSection(weekHeader: string, weekDate: string, dayHeaders: string[]): string {
    // Build table header row
    const headerRow = `| Week Start | ${dayHeaders.join(' | ')} |`;

    // Build separator row
    const separatorRow = `|${Array(dayHeaders.length + 1).fill('---').join('|')}|`;

    // Build data row with date in first column and empty cells
    const dataRow = `| ${weekDate} |${Array(dayHeaders.length).fill(' ').join('|')}|`;

    return `# ${weekHeader}\n${headerRow}\n${separatorRow}\n${dataRow}`;
}

export function addRecipeToTable(content: string, weekHeaderEnd: number, day: string, recipeName: string): string {
    const afterHeader = content.slice(weekHeaderEnd);
    const allLines = afterHeader.split('\n');

    // Find table rows (skip empty lines) and track their indices
    const tableLineIndices: number[] = [];
    for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].trim().startsWith('|')) {
            tableLineIndices.push(i);
        }
        if (tableLineIndices.length === 3) {
            break; // We only need the first 3 table rows
        }
    }

    if (tableLineIndices.length < 3) {
        // Not a valid table
        return content;
    }

    const headerRowIndex = tableLineIndices[0];
    const dataRowIndex = tableLineIndices[2]; // Skip separator row

    const headerRow = allLines[headerRowIndex];
    const dataRow = allLines[dataRowIndex];

    // Parse header to find column index
    const headers = headerRow
        .split('|')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
    const dayIndex = headers.indexOf(day);

    if (dayIndex === -1) {
        // Day not found
        return content;
    }

    // Parse data row
    const cells = dataRow
        .split('|')
        .map((c) => c.trim())
        .filter((_, i) => i > 0 && i <= headers.length);

    // Add recipe to the appropriate cell
    const recipeLink = `[[${recipeName}]]`;
    const currentCell = cells[dayIndex];

    if (currentCell.length === 0) {
        cells[dayIndex] = recipeLink;
    } else {
        cells[dayIndex] = `${currentCell}<br>${recipeLink}`;
    }

    // Reconstruct data row
    const newDataRow = `| ${cells.join(' | ')} |`;

    // Replace the data row at its position
    allLines[dataRowIndex] = newDataRow;

    // Reconstruct content
    const newAfterHeader = allLines.join('\n');
    return content.slice(0, weekHeaderEnd) + newAfterHeader;
}

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

            // Detect format: check if next non-empty line contains table marker
            const afterHeader = content.slice(headerIndex);
            const isTable = afterHeader.trimStart().startsWith('|');

            if (isTable) {
                // Table format: parse table, find correct column, insert recipe
                content = addRecipeToTable(content, headerIndex, day, recipe.name);
            } else {
                // List format: existing logic
                const dayHeader = `## ${day}`;
                const dayHeaderIndex = content.indexOf(dayHeader, headerIndex) + dayHeader.length;
                const recipeLine = `\n- [[${recipe.name}]]`;
                content = content.slice(0, dayHeaderIndex) + recipeLine + content.slice(dayHeaderIndex);
            }

            return content;
        });
    }
}

export async function OpenMealPlanNote(ctx: Context, filePath: string) {
    filePath = AppendMarkdownExt(filePath);
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
    const settings = get(ctx.settings);
    const dayOffset = settings.startOfWeek;
    const weekDate = GetCurrentWeek(dayOffset);
    const header = `Week of ${weekDate}`;

    const dayHeaders: string[] = [];

    for (let i = 0; i < DAYS_OF_WEEK.length; ++i) {
        const pos = (i + dayOffset) % DAYS_OF_WEEK.length;
        dayHeaders.push(DAYS_OF_WEEK[pos]);
    }

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        ctx.app.vault.process(file, (content) => {
            if (content.includes(header)) {
                return content;
            }

            let weekSection: string;
            if (settings.mealPlanFormat === MealPlanFormat.Table) {
                weekSection = createTableWeekSection(header, weekDate, dayHeaders);
            } else {
                // List format: add ## prefix to day headers
                weekSection = `# ${header}\n${dayHeaders.map((d) => `## ${d}`).join('\n')}`;
            }

            return `${weekSection}\n${content}`;
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
