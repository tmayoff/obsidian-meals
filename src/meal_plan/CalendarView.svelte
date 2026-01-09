<script lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-svelte';
import moment from 'moment';
import { DAYS_OF_WEEK } from '../constants.ts';
import { type CalendarData, type DayData, generateCalendarData } from './calendar_data.ts';

type Props = {
    recipeName: string;
    startOfWeek: number;
    dailyRecipes: Map<string, string[]>;
    onSelectDay: (date: moment.Moment, dayName: string) => void;
    onCancel: () => void;
};

let { recipeName, startOfWeek, dailyRecipes, onSelectDay, onCancel }: Props = $props();

// Current display month
let displayMonth = $state(moment().startOf('month'));

// Generate calendar data reactively
let calendarData: CalendarData = $derived(generateCalendarData(displayMonth, startOfWeek, dailyRecipes));

// Ordered day headers based on startOfWeek
let dayHeaders: string[] = $derived(Array.from({ length: 7 }, (_, i) => DAYS_OF_WEEK[(startOfWeek + i) % 7]));

function previousMonth() {
    displayMonth = displayMonth.clone().subtract(1, 'month');
}

function nextMonth() {
    displayMonth = displayMonth.clone().add(1, 'month');
}

function goToToday() {
    displayMonth = moment().startOf('month');
}

function handleDayClick(day: DayData) {
    onSelectDay(day.date, day.dayName);
}

function isToday(date: moment.Moment): boolean {
    return date.isSame(moment(), 'day');
}
</script>

<div class="calendar-container">
    <div class="calendar-header">
        <h2>Add "{recipeName}" to Meal Plan</h2>
        <p class="calendar-subtitle">Select a day to add this recipe</p>
    </div>

    <div class="calendar-nav">
        <button class="nav-btn" onclick={previousMonth} aria-label="Previous month">
            <ChevronLeft size={20} />
        </button>
        <button class="month-title" onclick={goToToday}>
            {displayMonth.format('MMMM YYYY')}
        </button>
        <button class="nav-btn" onclick={nextMonth} aria-label="Next month">
            <ChevronRight size={20} />
        </button>
    </div>

    <div class="calendar-grid">
        <!-- Day headers -->
        {#each dayHeaders as dayName}
            <div class="day-header">{dayName.slice(0, 3)}</div>
        {/each}

        <!-- Calendar days -->
        {#each calendarData.weeks as week}
            {#each week.days as day}
                <button
                    class="day-cell"
                    class:other-month={!day.isCurrentMonth}
                    class:today={isToday(day.date)}
                    class:has-recipes={day.recipes.length > 0}
                    onclick={() => handleDayClick(day)}
                >
                    <span class="day-number">{day.date.date()}</span>
                    {#if day.recipes.length > 0}
                        <div class="day-recipes">
                            {#each day.recipes.slice(0, 2) as recipe}
                                <span class="recipe-tag" title={recipe}>{recipe}</span>
                            {/each}
                            {#if day.recipes.length > 2}
                                <span class="recipe-more">+{day.recipes.length - 2} more</span>
                            {/if}
                        </div>
                    {/if}
                </button>
            {/each}
        {/each}
    </div>

    <div class="calendar-actions">
        <button onclick={onCancel}>Cancel</button>
    </div>
</div>

<style>
    .calendar-container {
        padding: 1rem;
        min-width: 400px;
        max-width: 600px;
    }

    .calendar-header {
        margin-bottom: 1rem;
    }

    .calendar-header h2 {
        margin: 0 0 0.25rem 0;
        font-size: 1.1rem;
    }

    .calendar-subtitle {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .calendar-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        gap: 0.5rem;
    }

    .nav-btn {
        background: none;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .nav-btn:hover {
        background: var(--background-modifier-hover);
    }

    .month-title {
        font-weight: 600;
        font-size: 1rem;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
    }

    .month-title:hover {
        background: var(--background-modifier-hover);
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        background: var(--background-modifier-border);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
    }

    .day-header {
        background: var(--background-secondary);
        padding: 0.5rem;
        text-align: center;
        font-weight: 600;
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .day-cell {
        background: var(--background-primary);
        min-height: 70px;
        padding: 0.25rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        cursor: pointer;
        border: none;
        text-align: left;
        transition: background-color 0.15s ease;
    }

    .day-cell:hover {
        background: var(--background-modifier-hover);
    }

    .day-cell.other-month {
        background: var(--background-secondary);
    }

    .day-cell.other-month .day-number {
        color: var(--text-muted);
    }

    .day-cell.today {
        background: var(--interactive-accent);
    }

    .day-cell.today .day-number {
        color: var(--text-on-accent);
        font-weight: bold;
    }

    .day-cell.today:hover {
        background: var(--interactive-accent-hover);
    }

    .day-cell.has-recipes {
        background: var(--background-secondary-alt);
    }

    .day-cell.has-recipes.today {
        background: var(--interactive-accent);
    }

    .day-number {
        font-size: 0.85rem;
        font-weight: 500;
        margin-bottom: 0.125rem;
    }

    .day-recipes {
        display: flex;
        flex-direction: column;
        gap: 1px;
        width: 100%;
        overflow: hidden;
    }

    .recipe-tag {
        font-size: 0.65rem;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        padding: 0.125rem 0.25rem;
        border-radius: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    .day-cell.today .recipe-tag {
        background: var(--background-primary);
        color: var(--text-normal);
    }

    .recipe-more {
        font-size: 0.6rem;
        color: var(--text-muted);
    }

    .day-cell.today .recipe-more {
        color: var(--text-on-accent);
        opacity: 0.8;
    }

    .calendar-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
        gap: 0.5rem;
    }
</style>
