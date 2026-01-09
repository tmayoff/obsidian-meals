import moment from 'moment';
import { describe, expect, test } from 'vitest';
import { generateCalendarData } from '../meal_plan/calendar_data.ts';

describe('generateCalendarData', () => {
    test('should generate 6 weeks of calendar data by default', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0; // Sunday
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        expect(result.weeks).toHaveLength(6);
        expect(result.currentMonth.month()).toBe(0); // January
    });

    test('should generate correct number of days per week', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0;
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        for (const week of result.weeks) {
            expect(week.days).toHaveLength(7);
        }
    });

    test('should respect startOfWeek setting (Sunday)', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0; // Sunday
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        // First day of each week should be Sunday
        for (const week of result.weeks) {
            expect(week.days[0].dayName).toBe('Sunday');
            expect(week.days[6].dayName).toBe('Saturday');
        }
    });

    test('should respect startOfWeek setting (Monday)', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 1; // Monday
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        // First day of each week should be Monday
        for (const week of result.weeks) {
            expect(week.days[0].dayName).toBe('Monday');
            expect(week.days[6].dayName).toBe('Sunday');
        }
    });

    test('should mark days in current month correctly', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0;
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        // Find a day that should be in January
        const jan15 = result.weeks.flatMap((w) => w.days).find((d) => d.date.date() === 15 && d.date.month() === 0);
        expect(jan15?.isCurrentMonth).toBe(true);

        // December 31st (if included) should not be current month
        const dec31 = result.weeks.flatMap((w) => w.days).find((d) => d.date.date() === 31 && d.date.month() === 11);
        if (dec31) {
            expect(dec31.isCurrentMonth).toBe(false);
        }
    });

    test('should include recipes from dailyRecipes map', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0;
        const dailyRecipes = new Map<string, string[]>();
        dailyRecipes.set('2024-01-15', ['Recipe A', 'Recipe B']);
        dailyRecipes.set('2024-01-20', ['Recipe C']);

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        const jan15 = result.weeks.flatMap((w) => w.days).find((d) => d.date.format('YYYY-MM-DD') === '2024-01-15');
        expect(jan15?.recipes).toEqual(['Recipe A', 'Recipe B']);

        const jan20 = result.weeks.flatMap((w) => w.days).find((d) => d.date.format('YYYY-MM-DD') === '2024-01-20');
        expect(jan20?.recipes).toEqual(['Recipe C']);
    });

    test('should return empty recipes array for days without recipes', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0;
        const dailyRecipes = new Map<string, string[]>();
        dailyRecipes.set('2024-01-15', ['Recipe A']);

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        const jan16 = result.weeks.flatMap((w) => w.days).find((d) => d.date.format('YYYY-MM-DD') === '2024-01-16');
        expect(jan16?.recipes).toEqual([]);
    });

    test('should handle custom weeksToShow parameter', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0;
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes, 4);

        expect(result.weeks).toHaveLength(4);
    });

    test('should start calendar from correct week start before month', () => {
        // January 2024 starts on Monday
        const displayMonth = moment('2024-01-01');
        const startOfWeek = 0; // Sunday
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        // First week should start with December 31, 2023 (Sunday before Jan 1)
        const firstDay = result.weeks[0].days[0];
        expect(firstDay.date.date()).toBe(31);
        expect(firstDay.date.month()).toBe(11); // December
        expect(firstDay.date.year()).toBe(2023);
    });

    test('should have consecutive dates across weeks', () => {
        const displayMonth = moment('2024-01-15');
        const startOfWeek = 0;
        const dailyRecipes = new Map<string, string[]>();

        const result = generateCalendarData(displayMonth, startOfWeek, dailyRecipes);

        const allDays = result.weeks.flatMap((w) => w.days);

        for (let i = 1; i < allDays.length; i++) {
            const prevDay = allDays[i - 1].date;
            const currDay = allDays[i].date;
            const diff = currDay.diff(prevDay, 'days');
            expect(diff).toBe(1);
        }
    });
});
