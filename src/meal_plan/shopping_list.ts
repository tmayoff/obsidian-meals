import { App, TFile, type Pos } from 'obsidian';
import { get } from 'svelte/store';
import { settings } from '../settings';
import { get_current_week } from './utils';
import { recipes } from '../store';
import type { Ingredient } from 'parse-ingredient';

export async function generate_shopping_list(app: App) {
    let file_path = get(settings).meal_plan_note;
    if (!file_path.endsWith('.md')) {
        file_path += '.md';
    }

    let ingredients: Array<Ingredient> = [];
    const meal_plan_file = app.vault.getAbstractFileByPath(file_path);
    if (meal_plan_file instanceof TFile) {
        ingredients = get_ingredients(app, meal_plan_file);
    }

    file_path = get(settings).shopping_list_note;
    if (!file_path.endsWith('.md')) {
        file_path += '.md';
    }

    let file = app.vault.getAbstractFileByPath(file_path);
    if (file == null) {
        app.vault.create(file_path, '');
        file = app.vault.getAbstractFileByPath(file_path);
    }

    if (file instanceof TFile) {
        app.vault.process(file, (data) => {
            for (const i of ingredients) {
                let line = '';
                if (i.quantity != null) line += `${i.quantity} `;
                if (i.unitOfMeasure != null) line += `${i.unitOfMeasure}`;
                if (line.length !== 0) line += ' ';

                data += `- [ ] ${line}${i.description}\n`;
            }

            return data;
        });
    }
}

function get_ingredients(app: App, file: TFile) {
    const this_week = get_current_week();
    const fileCache = app.metadataCache.getFileCache(file)!;

    const topLevel = fileCache.headings!.filter((h) => {
        return h.level === 1;
    });

    let end = -1;
    if (topLevel.length > 1) {
        let end = topLevel.findIndex((h) => {
            return h.level === 1 && h.heading.contains(this_week);
        });
        if (end < topLevel.length - 1) {
            end += 1;
        }
    }

    const startPos = topLevel[0].position!;
    const endPos = end != -1 ? topLevel[end]?.position! : null;

    const links = fileCache.links!;
    const ignore_list = get(settings).shopping_list_ignore;
    const ingredients: Array<Ingredient> = [];
    for (const i of links) {
        // Skip links outside the bounds of the date range
        if (i.position.start.offset < startPos.end.offset) {
            continue;
        }

        if (endPos != null && i.position.end.offset > endPos.start.offset) {
            continue;
        }

        const recipeFile = app.metadataCache.getFirstLinkpathDest(i.link, file.path);
        if (recipeFile != null) {
            const r = get(recipes).find((r) => {
                return r.path.path === recipeFile.path;
            });
            if (r !== undefined) {
                //  Before adding an ingredient check if it's already in the list
                //  If it is add the quanities together otherwise add it to the list
                for (const i of r.ingredients) {
                    const existing = ingredients.findIndex((existing) => {
                        return existing.description === i.description && i.unitOfMeasure === existing.unitOfMeasure;
                    });

                    if (
                        ignore_list.find((ignored) => {
                            return i.description.toLowerCase() === ignored.toLowerCase();
                        }) != null
                    ) {
                        continue;
                    }

                    if (existing === -1) {
                        ingredients.push(i);
                    } else {
                        let raw = ingredients[existing].quantity ?? 0;
                        raw += i.quantity ?? 0;
                        ingredients[existing].quantity = raw;
                    }
                }
            }
        }
    }

    return ingredients;
}
