import { Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import type { Context } from '../context.ts';
import WeekSelector from './WeekSelector.svelte';
import type { WeekInfo } from './week_extractor.ts';

export class WeekSelectorModal extends Modal {
    private component: Record<string, any> | null = null;
    private weeks: WeekInfo[];
    private onConfirm: (selectedWeeks: WeekInfo[]) => void;

    constructor(ctx: Context, weeks: WeekInfo[], onConfirm: (selectedWeeks: WeekInfo[]) => void) {
        super(ctx.app);
        this.weeks = weeks;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.component = mount(WeekSelector, {
            target: contentEl,
            props: {
                weeks: this.weeks,
                onConfirm: (selectedWeeks: WeekInfo[]) => {
                    this.onConfirm(selectedWeeks);
                    this.close();
                },
                onCancel: () => {
                    this.close();
                },
            },
        });
    }

    onClose() {
        if (this.component) {
            unmount(this.component);
        }
        this.contentEl.empty();
    }
}
