import type { App, CachedMetadata, FuzzyMatch } from 'obsidian';
import { SuggestionModal } from './suggester.ts';

export class IngredientSuggestionModal extends SuggestionModal<string> {
    text: HTMLInputElement;
    cache!: CachedMetadata;
    constructor(app: App, input: HTMLInputElement, items: string[]) {
        super(app, input, items);
        this.text = input;
    }

    getItemText(item: string) {
        return item;
    }
    onChooseItem(item: string) {
        this.item = item;
        this.text.value = item;
    }
    selectSuggestion({ item }: FuzzyMatch<string>) {
        const link = item;
        this.item = item;
        this.text.value = link;
        this.onClose();

        this.close();
    }
    renderSuggestion(result: FuzzyMatch<string>, el: HTMLElement) {
        const { item } = result || {};
        const content = el.createDiv({
            cls: 'suggestion-content',
        });
        if (!item) {
            content.setText(this.emptyStateText);
            content.parentElement?.addClass('is-selected');
            return;
        }

        el.createDiv({
            cls: 'suggestion-note',
            text: item,
        });
    }
}
