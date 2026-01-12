import moment from 'moment';
import type { TFile } from 'obsidian';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';

export interface CalendarItem {
    name: string;
    isRecipe: boolean;
}

export interface DayData {
    date: moment.Moment;
    dayName: string;
    items: CalendarItem[]; // Items (recipes and non-recipes) for this day
    isCurrentMonth: boolean;
}

export interface WeekData {
    weekStart: moment.Moment;
    days: DayData[];
}

export interface CalendarData {
    weeks: WeekData[];
    currentMonth: moment.Moment;
}

/**
 * Extract items for each day from the meal plan file
 * Returns a map of date string (YYYY-MM-DD) to array of CalendarItems
 */
export async function extractDailyRecipes(ctx: Context, file: TFile, startOfWeek: number): Promise<Map<string, CalendarItem[]>> {
    const content = await ctx.app.vault.read(file);
    const fileCache = ctx.app.metadataCache.getFileCache(file);
    const links = fileCache?.links || [];

    // Detect format
    const isTable = content.trimStart().startsWith('|');

    if (isTable) {
        return extractDailyRecipesFromTable(content, startOfWeek);
    }
    return extractDailyRecipesFromList(ctx, file, content, links, startOfWeek);
}

/**
 * Extract items from list format
 */
function extractDailyRecipesFromList(
    ctx: Context,
    file: TFile,
    content: string,
    links: any[],
    startOfWeek: number,
): Map<string, CalendarItem[]> {
    const dailyRecipes = new Map<string, CalendarItem[]>();
    const fileCache = ctx.app.metadataCache.getFileCache(file);
    const headings = fileCache?.headings || [];

    // Find week headings (H1) and day headings (H2)
    const weekHeadings = headings.filter((h) => h.level === 1 && h.heading.startsWith('Week of '));
    const dayHeadings = headings.filter((h) => h.level === 2 && DAYS_OF_WEEK.includes(h.heading));

    for (const weekHeading of weekHeadings) {
        // Parse week date
        const match = weekHeading.heading.match(/Week of (.+)/);
        if (!match) continue;

        const weekDateStr = match[1];
        const weekDate = parseWeekDate(weekDateStr);
        if (!weekDate) continue;

        // Get the week start date adjusted for startOfWeek setting
        const weekStartDate = weekDate.clone().weekday(startOfWeek);

        // Find day headings within this week section
        const weekEndOffset = getNextWeekOffset(weekHeading, weekHeadings) ?? content.length;

        for (const dayHeading of dayHeadings) {
            // Check if this day heading is within the week section
            if (dayHeading.position.start.offset < weekHeading.position.end.offset || dayHeading.position.start.offset >= weekEndOffset) {
                continue;
            }

            const dayIndex = DAYS_OF_WEEK.indexOf(dayHeading.heading);
            if (dayIndex === -1) continue;

            // Calculate the actual date for this day
            const dayDate = weekStartDate.clone();
            const adjustedDayIndex = (dayIndex - startOfWeek + 7) % 7;
            dayDate.add(adjustedDayIndex, 'days');

            const dateKey = dayDate.format('YYYY-MM-DD');

            // Get the range for this day's content
            const dayEndOffset = getNextDayOffset(dayHeading, dayHeadings, weekEndOffset);
            const dayContent = content.slice(dayHeading.position.end.offset, dayEndOffset);

            // Extract all entries (both links and plain text list items)
            const dayEntries = extractEntriesFromListContent(dayContent, links, dayHeading.position.end.offset, dayEndOffset);

            if (dayEntries.length > 0) {
                dailyRecipes.set(dateKey, dayEntries);
            }
        }
    }

    return dailyRecipes;
}

/**
 * Extract entries from list content, including both links and plain text items
 */
function extractEntriesFromListContent(dayContent: string, links: any[], startOffset: number, endOffset: number): CalendarItem[] {
    const entries: CalendarItem[] = [];
    const lines = dayContent.split('\n');

    // Track which character positions have links
    const linkRanges: { start: number; end: number; text: string }[] = [];
    for (const link of links) {
        if (link.position.start.offset >= startOffset && link.position.end.offset <= endOffset) {
            linkRanges.push({
                start: link.position.start.offset,
                end: link.position.end.offset,
                text: link.link,
            });
        }
    }

    let currentOffset = startOffset;
    for (const line of lines) {
        const trimmedLine = line.trim();
        const lineStart = currentOffset;
        const lineEnd = currentOffset + line.length;

        // Check if this is a list item (starts with - or - [ ])
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('- [ ]') || trimmedLine.startsWith('- [x]')) {
            // Find any links on this line
            const lineLinks = linkRanges.filter((lr) => lr.start >= lineStart && lr.end <= lineEnd);

            if (lineLinks.length > 0) {
                // Add the link text as recipes
                for (const linkRange of lineLinks) {
                    entries.push({ name: linkRange.text, isRecipe: true });
                }
            } else {
                // No links - extract plain text as non-recipe
                let text = trimmedLine;
                // Remove list marker
                if (text.startsWith('- [ ] ')) {
                    text = text.slice(6);
                } else if (text.startsWith('- [x] ')) {
                    text = text.slice(6);
                } else if (text.startsWith('- ')) {
                    text = text.slice(2);
                }
                text = text.trim();
                if (text.length > 0) {
                    entries.push({ name: text, isRecipe: false });
                }
            }
        }

        currentOffset = lineEnd + 1; // +1 for newline
    }

    return entries;
}

/**
 * Extract items from table format
 */
function extractDailyRecipesFromTable(content: string, startOfWeek: number): Map<string, CalendarItem[]> {
    const dailyRecipes = new Map<string, CalendarItem[]>();
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

    if (headerRowIndex === -1) return dailyRecipes;

    // Process data rows (skip header and separator)
    for (let rowIndex = headerRowIndex + 2; rowIndex < lines.length; rowIndex++) {
        const trimmedLine = lines[rowIndex].trim();
        if (!trimmedLine.startsWith('|')) continue;

        const cells = trimmedLine.split('|').filter((_c, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.length === 0) continue;

        const weekDateStr = cells[0].trim();
        const weekDate = parseWeekDate(weekDateStr);
        if (!weekDate) continue;

        const weekStartDate = weekDate.clone().weekday(startOfWeek);

        // Find entries in each day column
        for (let colIndex = 1; colIndex < headerColumns.length; colIndex++) {
            const dayName = headerColumns[colIndex];
            const dayIndex = DAYS_OF_WEEK.indexOf(dayName);
            if (dayIndex === -1) continue;

            // Calculate actual date for this day
            const adjustedDayIndex = (dayIndex - startOfWeek + 7) % 7;
            const dayDate = weekStartDate.clone().add(adjustedDayIndex, 'days');
            const dateKey = dayDate.format('YYYY-MM-DD');

            // Check if we have data for this column
            if (colIndex >= cells.length) continue;

            const cellContent = cells[colIndex] || '';

            // Extract entries from cell (both links and plain text)
            const dayEntries = extractEntriesFromTableCell(cellContent);

            if (dayEntries.length > 0) {
                const existing = dailyRecipes.get(dateKey) || [];
                dailyRecipes.set(dateKey, [...existing, ...dayEntries]);
            }
        }
    }

    return dailyRecipes;
}

/**
 * Extract entries from a table cell, including both links and plain text items
 */
function extractEntriesFromTableCell(cellContent: string): CalendarItem[] {
    const entries: CalendarItem[] = [];

    // Extract recipe links directly from [[...]] patterns in cell content
    // This is more reliable than position-based detection for tables
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    for (const match of cellContent.matchAll(linkPattern)) {
        // Handle display text syntax [[link|display]] - use the link part
        const linkText = match[1].split('|')[0];
        entries.push({ name: linkText, isRecipe: true });
    }

    // Extract plain text entries (not inside [[...]]) separated by <br>
    let remainingText = cellContent;
    // Remove [[...]] patterns to find remaining plain text
    remainingText = remainingText.replace(/\[\[([^\]]+)\]\]/g, '');
    // Split by <br> and extract non-empty entries as non-recipes
    const textParts = remainingText.split(/<br\s*\/?>/i);
    for (const part of textParts) {
        const trimmed = part.trim();
        if (trimmed.length > 0) {
            entries.push({ name: trimmed, isRecipe: false });
        }
    }

    return entries;
}

/**
 * Generate calendar data for display
 */
export function generateCalendarData(
    displayMonth: moment.Moment,
    startOfWeek: number,
    dailyItems: Map<string, CalendarItem[]>,
    weeksToShow = 6,
): CalendarData {
    const weeks: WeekData[] = [];

    // Start from the first day of the month, then go back to the start of that week
    const firstOfMonth = displayMonth.clone().startOf('month');
    const startDate = firstOfMonth.clone().weekday(startOfWeek);

    // If startDate is after first of month, go back a week
    if (startDate.isAfter(firstOfMonth)) {
        startDate.subtract(7, 'days');
    }

    for (let weekNum = 0; weekNum < weeksToShow; weekNum++) {
        const weekStart = startDate.clone().add(weekNum * 7, 'days');
        const days: DayData[] = [];

        for (let dayNum = 0; dayNum < 7; dayNum++) {
            const date = weekStart.clone().add(dayNum, 'days');
            const dateKey = date.format('YYYY-MM-DD');
            const dayIndex = (startOfWeek + dayNum) % 7;

            days.push({
                date,
                dayName: DAYS_OF_WEEK[dayIndex],
                items: dailyItems.get(dateKey) || [],
                isCurrentMonth: date.month() === displayMonth.month(),
            });
        }

        weeks.push({ weekStart, days });
    }

    return { weeks, currentMonth: displayMonth };
}

// Helper functions

function parseWeekDate(dateStr: string): moment.Moment | null {
    const currentYear = moment().year();
    let date = moment(`${dateStr} ${currentYear}`, 'MMMM Do YYYY');

    if (!date.isValid()) {
        return null;
    }

    // Handle year boundary
    const now = moment();
    if (date.isBefore(now, 'day') && now.month() === 11 && date.month() === 0) {
        date = moment(`${dateStr} ${currentYear + 1}`, 'MMMM Do YYYY');
    }

    return date;
}

function getNextWeekOffset(
    currentWeek: { position: { start: { offset: number } } },
    weekHeadings: { position: { start: { offset: number } } }[],
): number | null {
    for (const week of weekHeadings) {
        if (week.position.start.offset > currentWeek.position.start.offset) {
            return week.position.start.offset;
        }
    }
    return null;
}

function getNextDayOffset(
    currentDay: { position: { start: { offset: number } } },
    dayHeadings: { position: { start: { offset: number } } }[],
    weekEndOffset: number,
): number {
    for (const day of dayHeadings) {
        if (day.position.start.offset > currentDay.position.start.offset) {
            return Math.min(day.position.start.offset, weekEndOffset);
        }
    }
    return weekEndOffset;
}
