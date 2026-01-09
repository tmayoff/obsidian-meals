import moment from 'moment';
import type { HeadingCache, TFile } from 'obsidian';
import type { Context } from '../context.ts';

export interface WeekInfo {
    dateString: string; // "January 5th"
    displayName: string; // "Week of January 5th"
    momentDate: moment.Moment; // For date comparison
    startOffset: number; // Character offset (for filtering links)
    endOffset: number; // Character offset
    selected: boolean; // UI state
}

/**
 * Extracts all weeks from meal plan file, filters to current/future only
 * Handles both list and table formats
 */
export async function extractWeeksFromMealPlan(ctx: Context, file: TFile, startOfWeek: number): Promise<WeekInfo[]> {
    const fileCache = ctx.app.metadataCache.getFileCache(file);
    const topLevel = fileCache?.headings?.filter((h) => h.level === 1) || [];

    if (topLevel.length > 0) {
        return extractWeeksFromListFormat(ctx, file, topLevel, startOfWeek);
    }
    return extractWeeksFromTableFormat(ctx, file, startOfWeek);
}

/**
 * Extract weeks from list format (H1 headings like "# Week of January 5th")
 */
function extractWeeksFromListFormat(ctx: Context, file: TFile, headings: HeadingCache[], startOfWeek: number): WeekInfo[] {
    const weeks: WeekInfo[] = [];
    const currentWeekStart = moment().weekday(startOfWeek).startOf('day');

    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const match = heading.heading.match(/Week of (.+)/);

        if (match) {
            const dateString = match[1]; // "January 5th"
            const weekDate = parseDateString(dateString, currentWeekStart.year());

            // Skip past weeks
            if (weekDate.isBefore(currentWeekStart)) {
                continue;
            }

            weeks.push({
                dateString,
                displayName: heading.heading,
                momentDate: weekDate,
                startOffset: heading.position.end.offset,
                endOffset: i < headings.length - 1 ? headings[i + 1].position.start.offset : Number.MAX_SAFE_INTEGER,
                selected: true, // Default all selected
            });
        }
    }

    return weeks.sort((a, b) => a.momentDate.valueOf() - b.momentDate.valueOf());
}

/**
 * Extract weeks from table format
 */
async function extractWeeksFromTableFormat(ctx: Context, file: TFile, startOfWeek: number): Promise<WeekInfo[]> {
    const content = await ctx.app.vault.read(file);
    const lines = content.split('\n');
    const weeks: WeekInfo[] = [];
    const currentWeekStart = moment().weekday(startOfWeek).startOf('day');

    let currentOffset = 0;
    let foundHeader = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip header row
        if (trimmed.startsWith('|') && trimmed.includes('Week Start')) {
            foundHeader = true;
            currentOffset += line.length + 1;
            continue;
        }

        // Skip separator row (the row with |---|---|...)
        if (foundHeader && trimmed.startsWith('|') && trimmed.includes('---')) {
            currentOffset += line.length + 1;
            continue;
        }

        // Parse data rows
        if (trimmed.startsWith('|') && foundHeader) {
            const cells = trimmed
                .split('|')
                .map((c) => c.trim())
                .filter((c) => c);
            const dateString = cells[0]; // First column is date

            if (dateString && dateString !== 'Week Start') {
                const weekDate = parseDateString(dateString, currentWeekStart.year());

                if (!weekDate.isBefore(currentWeekStart)) {
                    weeks.push({
                        dateString,
                        displayName: `Week of ${dateString}`,
                        momentDate: weekDate,
                        startOffset: currentOffset,
                        endOffset: currentOffset + line.length,
                        selected: true,
                    });
                }
            }
        }

        currentOffset += line.length + 1;
    }

    return weeks.sort((a, b) => a.momentDate.valueOf() - b.momentDate.valueOf());
}

/**
 * Parse date string like "January 5th" to moment object
 * Handles year boundary (December dates in current year vs January dates might be next year)
 */
function parseDateString(dateString: string, currentYear: number): moment.Moment {
    // Try current year first
    let date = moment(`${dateString} ${currentYear}`, 'MMMM Do YYYY');

    if (!date.isValid()) {
        return moment(); // Fallback
    }

    // If parsed date is in the past and it's December/January boundary, try next year
    const now = moment();
    if (date.isBefore(now, 'day') && now.month() === 11 && date.month() === 0) {
        // Current month is December, parsed month is January -> use next year
        date = moment(`${dateString} ${currentYear + 1}`, 'MMMM Do YYYY');
    }

    return date;
}
