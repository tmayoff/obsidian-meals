import { TextComponent, type CachedMetadata, App, type FuzzyMatch } from 'obsidian';
import { SuggestionModal } from './suggester';

export class IngredientSuggestionModal extends SuggestionModal<string> {
    text: TextComponent;
    cache!: CachedMetadata;
    constructor(app: App, input: TextComponent, items: string[]) {
        super(app, input.inputEl, items);
        this.text = input;
    }

    getItemText(item: string) {
        return item;
    }
    onChooseItem(item: string) {
        this.item = item;
        this.text.setValue(item);
    }
    selectSuggestion({ item }: FuzzyMatch<string>) {
        const link = item;
        this.item = item;
        this.text.setValue(link);
        this.onClose();

        this.close();
    }
    renderSuggestion(result: FuzzyMatch<string>, el: HTMLElement) {
        const { item, match: matches } = result || {};
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
