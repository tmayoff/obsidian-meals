import type moment from 'moment';
import { Modal } from 'obsidian';
import type { Context } from '../context.ts';
import type { CalendarItem } from './calendar_data.ts';
import { RecipePreviewModal } from './RecipePreviewModal.ts';

export class DayDetailModal extends Modal {
    private ctx: Context;
    private date: moment.Moment;
    private dayName: string;
    private items: CalendarItem[];
    private onChanged: () => void;

    constructor(ctx: Context, date: moment.Moment, dayName: string, items: CalendarItem[], onChanged: () => void) {
        super(ctx.app);
        this.ctx = ctx;
        this.date = date;
        this.dayName = dayName;
        this.items = items;
        this.onChanged = onChanged;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('day-detail-modal');

        // Header with day name and date
        const header = contentEl.createDiv('day-detail-header');
        header.createEl('h2', { text: `${this.dayName}, ${this.date.format('MMMM Do')}` });

        // Content container for items list
        const itemsContainer = contentEl.createDiv('day-detail-content');

        if (this.items.length === 0) {
            itemsContainer.createEl('p', {
                text: 'No items planned for this day.',
                cls: 'day-detail-empty',
            });
        } else {
            const list = itemsContainer.createEl('ul', { cls: 'day-detail-list' });

            for (const item of this.items) {
                const listItem = list.createEl('li', { cls: 'day-detail-item' });

                if (item.isRecipe) {
                    // Recipe - make it clickable to open preview
                    const recipeLink = listItem.createEl('button', {
                        text: item.name,
                        cls: 'day-detail-recipe-link',
                    });
                    recipeLink.addEventListener('click', () => {
                        new RecipePreviewModal(this.ctx, item.name, this.date, this.dayName, () => {
                            this.onChanged();
                            // Close this modal after removing a recipe
                            this.close();
                        }).open();
                    });
                } else {
                    // Non-recipe - just display the text
                    listItem.createEl('span', {
                        text: item.name,
                        cls: 'day-detail-non-recipe',
                    });
                }
            }
        }

        // Footer with close button
        const footer = contentEl.createDiv('day-detail-footer');
        const closeBtn = footer.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        this.contentEl.empty();
    }
}
