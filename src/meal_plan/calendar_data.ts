import moment from 'moment';
import type { TFile } from 'obsidian';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';

export interface DayData {
    date: moment.Moment;
    dayName: string;
    recipes: string[]; // Recipe names for this day
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
 * Extract recipes for each day from the meal plan file
 * Returns a map of date string (YYYY-MM-DD) to array of recipe names
 */
export async function extractDailyRecipes(ctx: Context, file: TFile, startOfWeek: number): Promise<Map<string, string[]>> {
    const content = await ctx.app.vault.read(file);
    const fileCache = ctx.app.metadataCache.getFileCache(file);
    const links = fileCache?.links || [];

    // Detect format
    const isTable = content.trimStart().startsWith('|');

    if (isTable) {
        return extractDailyRecipesFromTable(content, links, startOfWeek);
    }
    return extractDailyRecipesFromList(ctx, file, content, links, startOfWeek);
}

/**
 * Extract recipes from list format
 */
function extractDailyRecipesFromList(ctx: Context, file: TFile, content: string, links: any[], startOfWeek: number): Map<string, string[]> {
    const dailyRecipes = new Map<string, string[]>();
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

            // Find recipe links within this day's range
            const dayRecipes: string[] = [];
            for (const link of links) {
                if (link.position.start.offset > dayHeading.position.end.offset && link.position.start.offset < dayEndOffset) {
                    dayRecipes.push(link.link);
                }
            }

            if (dayRecipes.length > 0) {
                dailyRecipes.set(dateKey, dayRecipes);
            }
        }
    }

    return dailyRecipes;
}

/**
 * Extract recipes from table format
 */
function extractDailyRecipesFromTable(content: string, links: any[], startOfWeek: number): Map<string, string[]> {
    const dailyRecipes = new Map<string, string[]>();
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

    // Calculate character offsets for each line
    let currentOffset = 0;
    const lineOffsets: { start: number; end: number }[] = [];

    for (const line of lines) {
        lineOffsets.push({
            start: currentOffset,
            end: currentOffset + line.length,
        });
        currentOffset += line.length + 1; // +1 for newline
    }

    // Process data rows (skip header and separator)
    for (let rowIndex = headerRowIndex + 2; rowIndex < lines.length; rowIndex++) {
        const line = lines[rowIndex].trim();
        if (!line.startsWith('|')) continue;

        const cells = line.split('|').filter((_c, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.length === 0) continue;

        const weekDateStr = cells[0].trim();
        const weekDate = parseWeekDate(weekDateStr);
        if (!weekDate) continue;

        const weekStartDate = weekDate.clone().weekday(startOfWeek);
        const rowOffset = lineOffsets[rowIndex];

        // Calculate column character positions within this row
        let colOffset = line.indexOf('|') + 1; // Start after first |
        const colPositions: { start: number; end: number }[] = [];

        for (let i = 0; i < cells.length; i++) {
            const cellStart = rowOffset.start + colOffset;
            const cellEnd = cellStart + cells[i].length;
            colPositions.push({ start: cellStart, end: cellEnd });
            colOffset += cells[i].length + 1; // +1 for |
        }

        // Find recipe links in each day column
        for (let colIndex = 1; colIndex < headerColumns.length; colIndex++) {
            const dayName = headerColumns[colIndex];
            const dayIndex = DAYS_OF_WEEK.indexOf(dayName);
            if (dayIndex === -1) continue;

            // Calculate actual date for this day
            const adjustedDayIndex = (dayIndex - startOfWeek + 7) % 7;
            const dayDate = weekStartDate.clone().add(adjustedDayIndex, 'days');
            const dateKey = dayDate.format('YYYY-MM-DD');

            // Check if we have position data for this column
            if (colIndex >= colPositions.length) continue;

            const colPos = colPositions[colIndex];
            const dayRecipes: string[] = [];

            for (const link of links) {
                if (link.position.start.offset >= colPos.start && link.position.end.offset <= colPos.end) {
                    dayRecipes.push(link.link);
                }
            }

            if (dayRecipes.length > 0) {
                const existing = dailyRecipes.get(dateKey) || [];
                dailyRecipes.set(dateKey, [...existing, ...dayRecipes]);
            }
        }
    }

    return dailyRecipes;
}

/**
 * Generate calendar data for display
 */
export function generateCalendarData(
    displayMonth: moment.Moment,
    startOfWeek: number,
    dailyRecipes: Map<string, string[]>,
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
                recipes: dailyRecipes.get(dateKey) || [],
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
