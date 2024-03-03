import { TFile } from 'obsidian';
import type { Ingredient } from 'parse-ingredient';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { append_markdown_ext } from '../utils/filesystem';
import { get_current_week } from './utils';

export async function clear_checked_ingredients(ctx: Context) {
    const file_path = append_markdown_ext(get(ctx.settings).shopping_list_note);

    const file = ctx.app.vault.getFileByPath(file_path);
    if (file == null) return;

    const list_items = ctx.app.metadataCache.getFileCache(file)?.listItems?.filter((i) => {
        return i.task !== undefined && i.task !== ' ';
    });
    if (list_items === undefined) return;

    // Get current files content
    let content = await ctx.app.vault.read(file);

    // Since we're modifying the content but keeping the original content's metadata we need to keep track of
    // how much we remove and offset all removals by that amount
    let offset = 0;

    for (const item of list_items) {
        const pos = item.position;
        const start = pos.start.offset - offset;
        const length = pos.end.offset - pos.start.offset + 1;

        content = content.substring(0, start) + content.substring(start + length);
        offset += length;
    }

    // Save the new content
    ctx.app.vault.modify(file, content);
}

export async function generate_shopping_list(ctx: Context) {
    const meal_plan_file_path = append_markdown_ext(get(ctx.settings).meal_plan_note);

    const meal_plan_file = ctx.app.vault.getFileByPath(meal_plan_file_path);
    if (meal_plan_file == null) return;
    const ingredients = get_ingredients(ctx, meal_plan_file);

    const shopping_list_file_path = append_markdown_ext(get(ctx.settings).shopping_list_note);

    let file = ctx.app.vault.getFileByPath(shopping_list_file_path);
    if (file == null) {
        ctx.app.vault.create(shopping_list_file_path, '');
        file = ctx.app.vault.getFileByPath(shopping_list_file_path);
    }

    if (file instanceof TFile) {
        ctx.app.vault.process(file, (data) => {
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

function get_ingredients(ctx: Context, file: TFile) {
    const this_week = get_current_week();
    const fileCache = ctx.app.metadataCache.getFileCache(file)!;

    const topLevel = fileCache.headings!.filter((h) => {
        return h.level === 1;
    });

    let end = -1;
    if (topLevel.length > 1) {
        end = topLevel.findIndex((h) => {
            return h.level === 1 && h.heading.contains(this_week);
        });
        if (end < topLevel.length - 1) {
            end += 1;
        }
    }

    const startPos = topLevel[0].position!;
    const endPos = end !== -1 ? topLevel[end]?.position! : null;

    const links = fileCache.links!;
    const ignore_list = get(ctx.settings).shopping_list_ignore;
    const ingredients: Array<Ingredient> = [];
    for (const i of links) {
        // Skip links outside the bounds of the date range
        if (i.position.start.offset < startPos.end.offset) {
            continue;
        }

        if (endPos != null && i.position.end.offset > endPos.start.offset) {
            continue;
        }

        const recipeFile = ctx.app.metadataCache.getFirstLinkpathDest(i.link, file.path);
        if (recipeFile != null) {
            const r = get(ctx.recipes).find((r) => {
                return r.path.path === recipeFile.path;
            });
            if (r === undefined) continue;

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

    return ingredients;
}
