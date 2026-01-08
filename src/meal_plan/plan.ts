import type { App } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { MealPlanFormat } from '../settings/settings.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import { GetCurrentWeek } from '../utils/utils.ts';

export function createTableWeekSection(weekDate: string, dayHeaders: string[]): string {
    // Build table header row
    const headerRow = `| Week Start | ${dayHeaders.join(' | ')} |`;

    // Build separator row
    const separatorRow = `|${Array(dayHeaders.length + 1).fill('---').join('|')}|`;

    // Build data row with date in first column and empty cells
    const dataRow = `| ${weekDate} |${Array(dayHeaders.length).fill(' ').join('|')}|`;

    return `${headerRow}\n${separatorRow}\n${dataRow}`;
}

export function addRecipeToTable(content: string, weekDate: string, day: string, recipeName: string): string {
    const allLines = content.split('\n');

    // Find the table header row (should be the first row starting with | and containing "Week Start")
    let headerRowIndex = -1;
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i].trim();
        if (line.startsWith('|') && line.includes('Week Start')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        // No table found
        return content;
    }

    const headerRow = allLines[headerRowIndex];

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

    // Find the data row with the matching weekDate
    let dataRowIndex = -1;
    for (let i = headerRowIndex + 2; i < allLines.length; i++) {
        // Skip separator row (+1) and start checking data rows (+2)
        const line = allLines[i].trim();
        if (line.startsWith('|') && line.includes(weekDate)) {
            dataRowIndex = i;
            break;
        }
    }

    if (dataRowIndex === -1) {
        // Row for this week not found
        return content;
    }

    const dataRow = allLines[dataRowIndex];

    // Parse data row - keep all parts including empty leading/trailing
    const rawCells = dataRow.split('|');
    // Extract actual cells (skip first empty and last empty)
    const cells: string[] = [];
    for (let i = 1; i < rawCells.length - 1; i++) {
        cells.push(rawCells[i].trim());
    }

    // Add recipe to the appropriate cell
    const recipeLink = `[[${recipeName}]]`;
    const currentCell = cells[dayIndex];

    if (currentCell.length === 0) {
        cells[dayIndex] = recipeLink;
    } else {
        cells[dayIndex] = `${currentCell}<br>${recipeLink}`;
    }

    // Reconstruct data row with proper spacing
    const newDataRow = `| ${cells.join(' | ')} |`;

    // Replace the data row at its position
    allLines[dataRowIndex] = newDataRow;

    // Reconstruct content
    return allLines.join('\n');
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
            const weekDate = GetCurrentWeek(get(ctx.settings).startOfWeek);
            const header = `Week of ${weekDate}`;

            // Detect format: check if content starts with table marker or has list headers
            const isTable = content.trimStart().startsWith('|');

            if (isTable) {
                // Table format: parse table, find correct column, insert recipe
                content = addRecipeToTable(content, weekDate, day, recipe.name);
            } else {
                // List format: existing logic
                const headerIndex = content.indexOf(header) + header.length;
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
            // Check if this week already exists
            if (content.includes(weekDate)) {
                return content;
            }

            if (settings.mealPlanFormat === MealPlanFormat.Table) {
                // Check if a table already exists
                if (content.trimStart().startsWith('|')) {
                    // Add a new row to existing table
                    const lines = content.split('\n');
                    // Find where to insert (after separator row, which is line 1)
                    // Insert at line 2 (after header and separator)
                    const newRow = `| ${weekDate} |${Array(dayHeaders.length).fill(' ').join('|')}|`;
                    lines.splice(2, 0, newRow);
                    return lines.join('\n');
                } else {
                    // Create new table
                    const weekSection = createTableWeekSection(weekDate, dayHeaders);
                    return `${weekSection}\n${content}`;
                }
            } else {
                // List format: add ## prefix to day headers
                const weekSection = `# ${header}\n${dayHeaders.map((d) => `## ${d}`).join('\n')}`;
                return `${weekSection}\n${content}`;
            }
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
