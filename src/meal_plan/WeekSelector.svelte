<script lang="ts">
import type { WeekInfo } from './week_extractor.ts';

type Props = {
    weeks: WeekInfo[];
    onConfirm: (selectedWeeks: WeekInfo[]) => void;
    onCancel: () => void;
};

let { weeks, onConfirm, onCancel }: Props = $props();

// Track selection state
let selectedWeeks = $state([...weeks]);

function toggleWeek(index: number) {
    selectedWeeks[index] = { ...selectedWeeks[index], selected: !selectedWeeks[index].selected };
}

function selectAll() {
    selectedWeeks = selectedWeeks.map((w) => ({ ...w, selected: true }));
}

function deselectAll() {
    selectedWeeks = selectedWeeks.map((w) => ({ ...w, selected: false }));
}

function handleConfirm() {
    onConfirm(selectedWeeks.filter((w) => w.selected));
}

const hasSelection = $derived(selectedWeeks.some((w) => w.selected));
</script>

<div class="week-selector-container">
    <h2>Select weeks for shopping list</h2>

    {#if selectedWeeks.length === 0}
        <p class="no-weeks">No current or future weeks found in meal plan.</p>
    {:else}
        <div class="button-row">
            <button onclick={selectAll}>Select All</button>
            <button onclick={deselectAll}>Deselect All</button>
        </div>

        <div class="week-list">
            {#each selectedWeeks as week, i}
                <label class="week-item">
                    <input type="checkbox" checked={week.selected} onchange={() => toggleWeek(i)} />
                    <span>{week.displayName}</span>
                </label>
            {/each}
        </div>
    {/if}

    <div class="action-buttons">
        <button class="mod-cta" onclick={handleConfirm} disabled={!hasSelection}>
            Add to Shopping List
        </button>
        <button onclick={onCancel}>Cancel</button>
    </div>
</div>

<style>
    .week-selector-container {
        padding: 1rem;
    }

    .button-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .week-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
        max-height: 400px;
        overflow-y: auto;
        padding: 0.5rem;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
    }

    .week-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 4px;
        cursor: pointer;
    }

    .week-item:hover {
        background: var(--background-modifier-hover);
    }

    .week-item input[type='checkbox'] {
        cursor: pointer;
    }

    .no-weeks {
        color: var(--text-muted);
        font-style: italic;
        margin-bottom: 1rem;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }
</style>
