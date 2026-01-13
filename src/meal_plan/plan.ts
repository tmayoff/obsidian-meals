import type moment from 'moment';
import momentLib from 'moment';
import { type App, Notice } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import type { Recipe } from '../recipe/recipe.ts';
import { MealPlanFormat } from '../settings/settings.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import { GetCurrentWeek, GetWeekDateFromMoment } from '../utils/utils.ts';

export function createTableWeekSection(weekDate: string, dayHeaders: string[]): string {
    // Build table header row
    const headerRow = `| Week Start | ${dayHeaders.join(' | ')} |`;

    // Build separator row
    const separatorRow = `|${Array(dayHeaders.length + 1)
        .fill('---')
        .join('|')}|`;

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

/**
 * Insert a recipe into meal plan content at the specified week and day
 */
function insertRecipeIntoContent(content: string, weekDate: string, day: string, recipeName: string): string {
    const header = `Week of ${weekDate}`;

    // Detect format: check if content starts with table marker or has list headers
    const isTable = content.trimStart().startsWith('|');

    if (isTable) {
        // Table format: parse table, find correct column, insert recipe
        return addRecipeToTable(content, weekDate, day, recipeName);
    }
    // List format: existing logic
    const headerIndex = content.indexOf(header) + header.length;
    const dayHeader = `## ${day}`;
    const dayHeaderIndex = content.indexOf(dayHeader, headerIndex) + dayHeader.length;
    const recipeLine = `\n- [[${recipeName}]]`;
    return content.slice(0, dayHeaderIndex) + recipeLine + content.slice(dayHeaderIndex);
}

export async function AddRecipeToMealPlan(ctx: Context, recipe: Recipe, day: string) {
    let filePath = get(ctx.settings).mealPlanNote;
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    await fillMealPlanNote(ctx, filePath);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        const weekDate = GetCurrentWeek(get(ctx.settings).startOfWeek);
        file.vault.process(file, (content) => insertRecipeIntoContent(content, weekDate, day, recipe.name));
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

/**
 * Add a recipe to the meal plan for a specific date
 */
export async function AddRecipeToMealPlanByDate(ctx: Context, recipe: Recipe, date: moment.Moment, day: string) {
    let filePath = get(ctx.settings).mealPlanNote;
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    const settings = get(ctx.settings);
    const weekDate = GetWeekDateFromMoment(date, settings.startOfWeek);

    // Ensure the meal plan file exists and has the week section
    await fillMealPlanNoteForDate(ctx, filePath, date);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        file.vault.process(file, (content) => insertRecipeIntoContent(content, weekDate, day, recipe.name));
    }
}

/**
 * Ensure the meal plan note has a section for the specified date's week
 */
async function fillMealPlanNoteForDate(ctx: Context, filePath: string, date: moment.Moment) {
    const settings = get(ctx.settings);
    const dayOffset = settings.startOfWeek;
    const weekDate = GetWeekDateFromMoment(date, dayOffset);
    const header = `Week of ${weekDate}`;

    const dayHeaders: string[] = [];
    for (let i = 0; i < DAYS_OF_WEEK.length; ++i) {
        const pos = (i + dayOffset) % DAYS_OF_WEEK.length;
        dayHeaders.push(DAYS_OF_WEEK[pos]);
    }

    // Create file if it doesn't exist
    await createMealPlanNote(ctx.app, filePath);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        await ctx.app.vault.process(file, (content) => {
            // Check if this week already exists
            if (content.includes(weekDate)) {
                return content;
            }

            if (settings.mealPlanFormat === MealPlanFormat.Table) {
                // Check if a table already exists
                if (content.trimStart().startsWith('|')) {
                    // Add a new row to existing table at the appropriate position
                    content = addWeekRowToTable(content, weekDate, dayHeaders, date, dayOffset);
                } else {
                    // Create new table
                    const weekSection = createTableWeekSection(weekDate, dayHeaders);
                    return `${weekSection}\n${content}`;
                }
            } else {
                // List format: insert at appropriate position based on date
                content = addWeekSectionToList(content, header, dayHeaders, date, dayOffset);
            }

            return content;
        });
    }
}

/**
 * Add a week row to the table at the appropriate chronological position
 */
function addWeekRowToTable(content: string, weekDate: string, dayHeaders: string[], date: moment.Moment, startOfWeek: number): string {
    const lines = content.split('\n');
    const newRow = `| ${weekDate} |${Array(dayHeaders.length).fill(' ').join('|')}|`;

    // Find the appropriate position to insert based on date order
    // Table rows should be in chronological order (newest first or oldest first)
    let insertIndex = 2; // Default: after header and separator

    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|')) continue;

        const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
        if (cells.length === 0) continue;

        const rowDateStr = cells[0];
        const rowDate = parseWeekDateString(rowDateStr);

        if (rowDate) {
            // Determine if the new week should come before this row
            const newWeekStart = date.clone().weekday(startOfWeek);
            if (newWeekStart.isAfter(rowDate)) {
                insertIndex = i;
                break;
            }
        }
        insertIndex = i + 1;
    }

    lines.splice(insertIndex, 0, newRow);
    return lines.join('\n');
}

/**
 * Add a week section to list format at the appropriate chronological position
 */
function addWeekSectionToList(content: string, header: string, dayHeaders: string[], date: moment.Moment, startOfWeek: number): string {
    const weekSection = `# ${header}\n${dayHeaders.map((d) => `## ${d}`).join('\n')}\n`;
    const newWeekStart = date.clone().weekday(startOfWeek);

    // Find all existing week headers and their positions
    const weekPattern = /^# Week of (.+)$/gm;
    let insertPosition = 0;
    let foundPosition = false;

    // Reset lastIndex to start from the beginning
    weekPattern.lastIndex = 0;

    let match = weekPattern.exec(content);
    while (match !== null) {
        const existingDateStr = match[1];
        const existingDate = parseWeekDateString(existingDateStr);

        if (existingDate && newWeekStart.isAfter(existingDate)) {
            // Insert before this week (newer weeks first)
            insertPosition = match.index;
            foundPosition = true;
            break;
        }

        // Update insert position to after this match
        insertPosition = match.index + match[0].length;
        match = weekPattern.exec(content);
    }

    if (foundPosition) {
        return content.slice(0, insertPosition) + weekSection + content.slice(insertPosition);
    }
    // Add at the beginning if no existing weeks or all existing weeks are newer
    if (content.length === 0) {
        return weekSection;
    }
    return weekSection + content;
}

/**
 * Parse a week date string like "January 5th" into a moment object
 */
function parseWeekDateString(dateStr: string): moment.Moment | null {
    const currentYear = momentLib().year();
    let date = momentLib(`${dateStr} ${currentYear}`, 'MMMM Do YYYY');

    if (!date.isValid()) {
        return null;
    }

    // Handle year boundary
    const now = momentLib();
    if (date.isBefore(now, 'day') && now.month() === 11 && date.month() === 0) {
        date = momentLib(`${dateStr} ${currentYear + 1}`, 'MMMM Do YYYY');
    }

    return date;
}

/**
 * Remove a recipe from the meal plan for a specific date
 */
export async function RemoveRecipeFromMealPlan(ctx: Context, recipeName: string, date: moment.Moment) {
    const settings = get(ctx.settings);
    let filePath = settings.mealPlanNote;
    if (!filePath.endsWith('.md')) {
        filePath += '.md';
    }

    const weekDate = GetWeekDateFromMoment(date, settings.startOfWeek);
    const dayName = date.format('dddd');

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file != null) {
        await file.vault.process(file, (content) => {
            const isTable = content.trimStart().startsWith('|');

            if (isTable) {
                content = removeRecipeFromTable(content, weekDate, dayName, recipeName);
            } else {
                content = removeRecipeFromList(content, weekDate, dayName, recipeName);
            }

            return content;
        });
    }
}

/**
 * Remove a recipe from a table-formatted meal plan
 */
function removeRecipeFromTable(content: string, weekDate: string, day: string, recipeName: string): string {
    const allLines = content.split('\n');

    // Find the table header row
    let headerRowIndex = -1;
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i].trim();
        if (line.startsWith('|') && line.includes('Week Start')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
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
        return content;
    }

    // Find the data row with the matching weekDate
    let dataRowIndex = -1;
    for (let i = headerRowIndex + 2; i < allLines.length; i++) {
        const line = allLines[i].trim();
        if (line.startsWith('|') && line.includes(weekDate)) {
            dataRowIndex = i;
            break;
        }
    }

    if (dataRowIndex === -1) {
        return content;
    }

    const dataRow = allLines[dataRowIndex];

    // Parse data row
    const rawCells = dataRow.split('|');
    const cells: string[] = [];
    for (let i = 1; i < rawCells.length - 1; i++) {
        cells.push(rawCells[i].trim());
    }

    // Remove recipe from the cell
    const recipeLink = `[[${recipeName}]]`;
    const currentCell = cells[dayIndex];

    if (currentCell.includes(recipeLink)) {
        // Handle both standalone and <br>-separated recipes
        const newCell = currentCell.replace(`<br>${recipeLink}`, '').replace(`${recipeLink}<br>`, '').replace(recipeLink, '');
        cells[dayIndex] = newCell.trim();
    }

    // Reconstruct data row
    const newDataRow = `| ${cells.join(' | ')} |`;
    allLines[dataRowIndex] = newDataRow;

    return allLines.join('\n');
}

/**
 * Remove a recipe from a list-formatted meal plan
 */
function removeRecipeFromList(content: string, weekDate: string, day: string, recipeName: string): string {
    const header = `Week of ${weekDate}`;
    const headerIndex = content.indexOf(header);

    if (headerIndex === -1) {
        return content;
    }

    const dayHeader = `## ${day}`;
    const dayHeaderIndex = content.indexOf(dayHeader, headerIndex);

    if (dayHeaderIndex === -1) {
        return content;
    }

    // Find the end of this day's section (next ## header or # header or end of file)
    const nextDayMatch = content.slice(dayHeaderIndex + dayHeader.length).match(/\n## |\n# /);
    const sectionEnd = nextDayMatch ? dayHeaderIndex + dayHeader.length + (nextDayMatch.index ?? 0) : content.length;

    // Get the section content
    const sectionStart = dayHeaderIndex + dayHeader.length;
    const sectionContent = content.slice(sectionStart, sectionEnd);

    // Remove the recipe line (handles both - [[Recipe]] and - [ ] [[Recipe]] formats)
    const recipePattern = new RegExp(`\\n- (?:\\[[ x]\\] )?\\[\\[${escapeRegExp(recipeName)}\\]\\]`, 'g');
    const newSectionContent = sectionContent.replace(recipePattern, '');

    return content.slice(0, sectionStart) + newSectionContent + content.slice(sectionEnd);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert meal plan content from list format to table format
 * @param content The list-formatted meal plan content
 * @param dayHeaders Array of day names in the correct order for the table
 * @returns The converted table-formatted content
 */
export function convertListToTable(content: string, dayHeaders: string[]): string {
    // Parse all weeks from the list format
    const weeks: { weekDate: string; days: Map<string, string[]> }[] = [];

    // Match week headers (# Week of ...)
    const weekPattern = /^# Week of (.+)$/gm;
    const dayPattern = /^## (.+)$/gm;

    weekPattern.lastIndex = 0;

    let weekMatch = weekPattern.exec(content);
    while (weekMatch !== null) {
        const weekDate = weekMatch[1];
        const weekStart = weekMatch.index + weekMatch[0].length;

        // Find the next week header to determine this week's section
        weekPattern.lastIndex = weekStart;
        const nextWeekMatch = weekPattern.exec(content);
        const weekEnd = nextWeekMatch ? nextWeekMatch.index : content.length;
        weekPattern.lastIndex = weekStart; // Reset for outer loop

        const weekSection = content.slice(weekStart, weekEnd);
        const days = new Map<string, string[]>();

        // Find all day sections within this week
        dayPattern.lastIndex = 0;
        const dayMatches: { day: string; start: number; index: number }[] = [];

        let dayMatch = dayPattern.exec(weekSection);
        while (dayMatch !== null) {
            const dayName = dayMatch[1];
            if (dayHeaders.includes(dayName)) {
                dayMatches.push({
                    day: dayName,
                    start: dayMatch.index + dayMatch[0].length,
                    index: dayMatch.index,
                });
            }
            dayMatch = dayPattern.exec(weekSection);
        }

        // Extract items for each day
        for (let i = 0; i < dayMatches.length; i++) {
            const { day, start } = dayMatches[i];
            const end = i < dayMatches.length - 1 ? dayMatches[i + 1].index : weekSection.length;

            const dayContent = weekSection.slice(start, end);
            const items = extractItemsFromListDay(dayContent);
            days.set(day, items);
        }

        weeks.push({ weekDate, days });
        weekMatch = weekPattern.exec(content);
    }

    // Build the table
    const headerRow = `| Week Start | ${dayHeaders.join(' | ')} |`;
    const separatorRow = `|${Array(dayHeaders.length + 1)
        .fill('---')
        .join('|')}|`;

    const dataRows = weeks.map((week) => {
        const cells = dayHeaders.map((day) => {
            const items = week.days.get(day) || [];
            return items.join('<br>');
        });
        return `| ${week.weekDate} | ${cells.join(' | ')} |`;
    });

    return `${headerRow}\n${separatorRow}\n${dataRows.join('\n')}\n`;
}

/**
 * Extract items from a day section in list format
 */
function extractItemsFromListDay(dayContent: string): string[] {
    const items: string[] = [];
    const lines = dayContent.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this is a list item
        if (trimmedLine.startsWith('- ')) {
            let item = trimmedLine.slice(2);

            // Handle checkbox items
            if (item.startsWith('[ ] ') || item.startsWith('[x] ')) {
                item = item.slice(4);
            }

            item = item.trim();
            if (item.length > 0) {
                items.push(item);
            }
        }
    }

    return items;
}

/**
 * Convert meal plan content from table format to list format
 * @param content The table-formatted meal plan content
 * @param dayHeaders Array of day names in the correct order for the list
 * @returns The converted list-formatted content
 */
export function convertTableToList(content: string, dayHeaders: string[]): string {
    const lines = content.split('\n');

    // Find header row to get column positions
    let headerRowIndex = -1;
    let headerColumns: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.includes('Week Start')) {
            headerRowIndex = i;
            headerColumns = line
                .split('|')
                .map((c) => c.trim())
                .filter((c) => c.length > 0);
            break;
        }
    }

    if (headerRowIndex === -1) {
        return content; // Not a valid table format, return as-is
    }

    // Parse all data rows
    const weeks: { weekDate: string; days: Map<string, string[]> }[] = [];

    for (let rowIndex = headerRowIndex + 2; rowIndex < lines.length; rowIndex++) {
        const trimmedLine = lines[rowIndex].trim();
        if (!trimmedLine.startsWith('|')) continue;

        const cells = trimmedLine.split('|').filter((_c, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.length === 0) continue;

        const weekDate = cells[0].trim();
        if (!weekDate) continue;

        const days = new Map<string, string[]>();

        // Extract items from each day column
        for (let colIndex = 1; colIndex < headerColumns.length; colIndex++) {
            const dayName = headerColumns[colIndex];

            if (colIndex >= cells.length + 1) continue;

            const cellContent = (cells[colIndex] || '').trim();
            const items = extractItemsFromTableCell(cellContent);

            if (items.length > 0) {
                days.set(dayName, items);
            }
        }

        weeks.push({ weekDate, days });
    }

    // Build the list format
    const listSections = weeks.map((week) => {
        const weekHeader = `# Week of ${week.weekDate}`;

        const daySections = dayHeaders.map((day) => {
            const items = week.days.get(day) || [];
            const dayHeader = `## ${day}`;

            if (items.length === 0) {
                return dayHeader;
            }
            return `${dayHeader}\n${items.map((item) => `- ${item}`).join('\n')}`;
        });

        return `${weekHeader}\n${daySections.join('\n')}`;
    });

    return `${listSections.join('\n\n')}\n`;
}

/**
 * Extract items from a table cell
 */
function extractItemsFromTableCell(cellContent: string): string[] {
    if (!cellContent || cellContent.length === 0) {
        return [];
    }

    // Split by <br> tag
    const parts = cellContent.split(/<br\s*\/?>/i);
    const items: string[] = [];

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
            items.push(trimmed);
        }
    }

    return items;
}

/**
 * Detect the format of a meal plan file content
 * @returns 'table' if the content is in table format, 'list' if in list format, or null if no meal plan content is detected
 */
export function detectMealPlanFormat(content: string): 'table' | 'list' | null {
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
        return null;
    }

    // Check for table format (starts with | and has Week Start header)
    if (trimmedContent.startsWith('|') && trimmedContent.includes('Week Start')) {
        return 'table';
    }

    // Check for list format (has # Week of header)
    if (/^# Week of /m.test(trimmedContent)) {
        return 'list';
    }

    return null;
}

/**
 * Convert an existing meal plan file to the specified format
 * @param ctx The plugin context
 * @param targetFormat The format to convert to
 */
export async function convertMealPlanFormat(ctx: Context, targetFormat: MealPlanFormat): Promise<void> {
    const settings = get(ctx.settings);
    const filePath = AppendMarkdownExt(settings.mealPlanNote);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file == null) {
        // No meal plan file exists, nothing to convert
        return;
    }

    // Build day headers based on start of week
    const dayHeaders: string[] = [];
    for (let i = 0; i < DAYS_OF_WEEK.length; ++i) {
        const pos = (i + settings.startOfWeek) % DAYS_OF_WEEK.length;
        dayHeaders.push(DAYS_OF_WEEK[pos]);
    }

    await ctx.app.vault.process(file, (content) => {
        const currentFormat = detectMealPlanFormat(content);

        if (currentFormat === null) {
            // No meal plan content detected, nothing to convert
            return content;
        }

        if (targetFormat === MealPlanFormat.Table && currentFormat === 'list') {
            new Notice('Converting meal plan from list to table format');
            return convertListToTable(content, dayHeaders);
        }
        if (targetFormat === MealPlanFormat.List && currentFormat === 'table') {
            new Notice('Converting meal plan from table to list format');
            return convertTableToList(content, dayHeaders);
        }
        // Format already matches, no conversion needed
        return content;
    });
}
