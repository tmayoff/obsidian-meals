<script lang="ts">
import { ChevronLeft, ChevronRight, Plus } from 'lucide-svelte';
import moment from 'moment';
import { DAYS_OF_WEEK } from '../constants.ts';
import { type CalendarData, type CalendarItem, type DayData, generateCalendarData } from './calendar_data.ts';

type Props = {
    mode?: 'add-recipe' | 'meal-plan-view';
    recipeName?: string;
    startOfWeek: number;
    dailyItems: Map<string, CalendarItem[]>;
    onSelectDay?: (date: moment.Moment, dayName: string) => void;
    onCancel?: () => void;
    onAddRecipe?: (date: moment.Moment, dayName: string) => void;
    onItemClick?: (item: CalendarItem, date: moment.Moment, dayName: string) => void;
    onDayClick?: (date: moment.Moment, dayName: string, items: CalendarItem[]) => void;
};

let {
    mode = 'add-recipe',
    recipeName,
    startOfWeek,
    dailyItems,
    onSelectDay,
    onCancel,
    onAddRecipe,
    onItemClick,
    onDayClick,
}: Props = $props();

// Current display month
let displayMonth = $state(moment().startOf('month'));

// Generate calendar data reactively
let calendarData: CalendarData = $derived(generateCalendarData(displayMonth, startOfWeek, dailyItems));

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
    if (mode === 'add-recipe' && onSelectDay) {
        onSelectDay(day.date, day.dayName);
    }
}

function handleAddClick(e: Event, day: DayData) {
    e.stopPropagation();
    if (onAddRecipe) {
        onAddRecipe(day.date, day.dayName);
    }
}

function handleItemClick(e: Event, item: CalendarItem, day: DayData) {
    e.stopPropagation();
    if (mode === 'meal-plan-view' && onItemClick) {
        onItemClick(item, day.date, day.dayName);
    }
}

function handleDayClickInViewMode(day: DayData) {
    if (mode === 'meal-plan-view' && onDayClick) {
        onDayClick(day.date, day.dayName, day.items);
    }
}

function isToday(date: moment.Moment): boolean {
    return date.isSame(moment(), 'day');
}
</script>

<div class="calendar-container" class:embedded={mode === 'meal-plan-view'}>
    {#if mode === 'add-recipe' && recipeName}
        <div class="calendar-header">
            <h2>Add "{recipeName}" to Meal Plan</h2>
            <p class="calendar-subtitle">Select a day to add this recipe</p>
        </div>
    {/if}

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
                {#if mode === 'add-recipe'}
                    <button
                        class="day-cell clickable"
                        class:other-month={!day.isCurrentMonth}
                        class:today={isToday(day.date)}
                        class:has-items={day.items.length > 0}
                        onclick={() => handleDayClick(day)}
                    >
                        <span class="day-number">{day.date.date()}</span>
                        {#if day.items.length > 0}
                            <div class="day-items">
                                {#each day.items.slice(0, 2) as item}
                                    <span class="item-tag" class:non-recipe={!item.isRecipe} title={item.name}>{item.name}</span>
                                {/each}
                                {#if day.items.length > 2}
                                    <span class="item-more">+{day.items.length - 2} more</span>
                                {/if}
                            </div>
                        {/if}
                    </button>
                {:else}
                    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                    <div
                        class="day-cell clickable"
                        class:other-month={!day.isCurrentMonth}
                        class:today={isToday(day.date)}
                        class:has-items={day.items.length > 0}
                        role="button"
                        tabindex="0"
                        onclick={() => handleDayClickInViewMode(day)}
                        onkeydown={(e) => e.key === 'Enter' && handleDayClickInViewMode(day)}
                    >
                        <span class="day-number">{day.date.date()}</span>
                        {#if day.items.length > 0}
                            <div class="day-items">
                                {#each day.items.slice(0, 2) as item}
                                    <button
                                        class="item-tag clickable"
                                        class:non-recipe={!item.isRecipe}
                                        title={item.name}
                                        onclick={(e) => handleItemClick(e, item, day)}
                                    >
                                        {item.name}
                                    </button>
                                {/each}
                                {#if day.items.length > 2}
                                    <span class="item-more">+{day.items.length - 2} more</span>
                                {/if}
                            </div>
                        {/if}
                        <button
                            class="add-recipe-btn"
                            onclick={(e) => handleAddClick(e, day)}
                            aria-label="Add recipe to {day.dayName}"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                {/if}
            {/each}
        {/each}
    </div>

    {#if mode === 'add-recipe' && onCancel}
        <div class="calendar-actions">
            <button onclick={onCancel}>Cancel</button>
        </div>
    {/if}
</div>

<style>
    .calendar-container {
        padding: 1rem;
        width: 500px;
        max-width: 100%;
        box-sizing: border-box;
    }

    .calendar-container.embedded {
        width: 100%;
        padding: 0 0 1rem 0;
    }

    .calendar-header {
        margin-bottom: 1rem;
    }

    .calendar-header h2 {
        margin: 0 0 0.25rem 0;
        font-size: 1.1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        flex-shrink: 0;
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
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 2px;
        background: var(--background-modifier-border);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
        width: 100%;
    }

    .day-header {
        background: var(--background-secondary);
        padding: 0.5rem;
        text-align: center;
        font-weight: 600;
        font-size: 0.75rem;
        color: var(--text-muted);
        min-width: 0;
    }

    .day-cell {
        background: var(--background-primary);
        height: 70px;
        padding: 0.25rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        cursor: default;
        border: none;
        text-align: left;
        transition: background-color 0.15s ease;
        overflow: hidden;
        min-width: 0;
        position: relative;
    }

    .day-cell.clickable {
        cursor: pointer;
    }

    .day-cell.clickable:hover {
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

    .day-cell.has-items {
        background: var(--background-secondary-alt);
    }

    .day-cell.has-items.today {
        background: var(--interactive-accent);
    }

    .day-number {
        font-size: 0.85rem;
        font-weight: 500;
        margin-bottom: 0.125rem;
    }

    .day-items {
        display: flex;
        flex-direction: column;
        gap: 1px;
        width: 100%;
        min-width: 0;
        overflow: hidden;
        flex: 1;
    }

    .item-tag {
        font-size: 0.65rem;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        padding: 0.125rem 0.25rem;
        border-radius: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        cursor: help;
        border: none;
        width: 100%;
        text-align: left;
    }

    .item-tag.non-recipe {
        background: var(--background-modifier-border);
        color: var(--text-normal);
    }

    .item-tag.clickable {
        cursor: pointer;
    }

    .item-tag.clickable:hover {
        background: var(--interactive-accent-hover);
    }

    .item-tag.non-recipe.clickable:hover {
        background: var(--background-modifier-hover);
    }

    .day-cell.today .item-tag {
        background: var(--background-primary);
        color: var(--text-normal);
    }

    .day-cell.today .item-tag.non-recipe {
        background: var(--background-modifier-border);
        color: var(--text-normal);
    }

    .day-cell.today .item-tag.clickable:hover {
        background: var(--background-modifier-hover);
    }

    .item-more {
        font-size: 0.6rem;
        color: var(--text-muted);
    }

    .day-cell.today .item-more {
        color: var(--text-on-accent);
        opacity: 0.8;
    }

    .calendar-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
        gap: 0.5rem;
    }

    .add-recipe-btn {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 18px;
        height: 18px;
        padding: 0;
        border: none;
        border-radius: 3px;
        background: var(--background-modifier-border);
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.15s ease, background-color 0.15s ease;
    }

    .day-cell:hover .add-recipe-btn {
        opacity: 1;
    }

    .add-recipe-btn:hover {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
    }

    .day-cell.today .add-recipe-btn {
        background: var(--background-primary);
        color: var(--text-normal);
    }

    .day-cell.today .add-recipe-btn:hover {
        background: var(--background-modifier-hover);
    }
</style>
