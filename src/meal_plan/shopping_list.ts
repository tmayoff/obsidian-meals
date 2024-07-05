import { TFile } from 'obsidian';
import type { Ingredient } from 'parse-ingredient';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { AppendMarkdownExt } from '../utils/filesystem';
import { GetCurrentWeek, formatUnicorn } from './utils';

export async function ClearCheckedIngredients(ctx: Context) {
    const filePath = AppendMarkdownExt(get(ctx.settings).shoppingListNote);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file == null) {
        return;
    }

    const listItems = ctx.app.metadataCache.getFileCache(file)?.listItems?.filter((i) => {
        return i.task !== undefined && i.task !== ' ';
    });
    if (listItems === undefined) {
        return;
    }

    // Get current files content
    let content = await ctx.app.vault.read(file);

    // Since we're modifying the content but keeping the original content's metadata we need to keep track of
    // how much we remove and offset all removals by that amount
    let offset = 0;

    for (const item of listItems) {
        const pos = item.position;
        const start = pos.start.offset - offset;
        const length = pos.end.offset - pos.start.offset + 1;

        content = content.substring(0, start) + content.substring(start + length);
        offset += length;
    }

    // Save the new content
    ctx.app.vault.modify(file, content);
}

export async function AddMealPlanToShoppingList(ctx: Context) {
    const mealPlanFilePath = AppendMarkdownExt(get(ctx.settings).mealPlanNote);

    const mealPlanFile = ctx.app.vault.getFileByPath(mealPlanFilePath);
    if (mealPlanFile == null) {
        return;
    }
    const ingredients = getMealPlanIngredients(ctx, mealPlanFile);

    const shoppingListFilePath = AppendMarkdownExt(get(ctx.settings).shoppingListNote);

    let file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    if (file == null) {
        ctx.app.vault.create(shoppingListFilePath, '');
        file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    }

    if (file instanceof TFile) {
        ctx.app.vault.process(file, (data) => {
            for (const i of ingredients) {
                data += formatUnicorn(`- [ ] ${get(ctx.settings).shoppingListFormat} \n`, i);
            }

            return data;
        });
    }
}

export async function AddFileToShoppingList(ctx: Context, recipeFile: TFile) {
    const shoppingListFilePath = AppendMarkdownExt(get(ctx.settings).shoppingListNote);
    let file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    if (file == null) {
        ctx.app.vault.create(shoppingListFilePath, '');
        file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    }
    if (file == null) {
        return;
    }

    ctx.app.vault.process(file, (data) => {
        const ingredients = getIngredientsRecipe(ctx, recipeFile);
        for (const i of ingredients) {
            let formatted = formatUnicorn(`${get(ctx.settings).shoppingListFormat}`, i);
            formatted = formatted.replaceAll(/\([\s-]*\)/g, '');
            formatted.trim();
            data += `- [ ] ${formatted}\n`;
        }

        return data;
    });
}

function getMealPlanIngredients(ctx: Context, file: TFile) {
    const thisWeek = GetCurrentWeek();
    const fileCache = ctx.app.metadataCache.getFileCache(file)!;

    const topLevel = fileCache.headings!.filter((h) => {
        return h.level === 1;
    });

    let end = -1;
    if (topLevel.length > 1) {
        end = topLevel.findIndex((h) => {
            return h.level === 1 && h.heading.contains(thisWeek);
        });
        if (end < topLevel.length - 1) {
            end += 1;
        }
    }

    const startPos = topLevel[0].position!;
    const endPos = end !== -1 ? topLevel[end]?.position! : null;

    const links = fileCache.links!;
    let ingredients: Ingredient[] = [];
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
            ingredients = mergeIngredientLists(ingredients, getIngredientsRecipe(ctx, recipeFile));
        }
    }

    return ingredients;
}

function mergeIngredientLists(left: Ingredient[], right: Ingredient[]) {
    //  Before adding an ingredient check if it's already in the list
    //  If it is add the quanities together otherwise add it to the list
    for (const i of right) {
        const existing = left.findIndex((existing) => {
            return existing.description === i.description && i.unitOfMeasure === existing.unitOfMeasure;
        });
        if (existing === -1) {
            left.push(i);
        } else {
            let raw = left[existing].quantity ?? 0;
            raw += i.quantity ?? 0;
            left[existing].quantity = raw;
        }
    }

    return left;
}

function getIngredientsRecipe(ctx: Context, recipeNote: TFile) {
    const r = get(ctx.recipes).find((r) => {
        return r.path.path === recipeNote.path;
    });
    if (r === undefined) {
        return [];
    }

    const ignoreList = get(ctx.settings).shoppingListIgnore;

    return r.ingredients.filter((i) => {
        const found =
            ignoreList.find((ignored) => {
                return i.description.toLowerCase() !== ignored.toLowerCase();
            }) === undefined;
        return !found;
    });
}
