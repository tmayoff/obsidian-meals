import { App, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { settings } from '../settings';
import { get_current_week } from './utils';
import { recipes } from '../store';
import type { Ingredient } from 'parse-ingredient';

export async function generate_shopping_list(app: App) {
    const this_week = get_current_week();
    console.log(this_week);

    let file_path = get(settings).meal_plan_note;
    if (!file_path.endsWith('.md')) {
        file_path += '.md';
    }

    const file = app.vault.getAbstractFileByPath(file_path);
    if (file instanceof TFile) {
        const fileCache = app.metadataCache.getFileCache(file)!;
        console.log(fileCache);

        const topLevel = fileCache.headings!.filter((h) => {
            return h.level === 1;
        });
        let end = topLevel.findIndex((h) => {
            return h.level === 1 && h.heading.contains(this_week);
        });
        if (end < topLevel.length - 1) {
            end += 1;
        }

        const startPos = topLevel[0].position!;
        const endPos = topLevel[end]?.position!;

        const links = fileCache.links!;
        const ingredients: Array<Ingredient> = [];
        for (const i of links) {
            // Skip links outside the bounds of the date range
            if (i.position.start.offset < startPos.end.offset || i.position.end.offset > endPos.start.offset) {
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
                            return existing.description === i.description;
                        });

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
    
        // TODO Dump ingredients into shopping list file
    }
}
