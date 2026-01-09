import type { HeadingCache, TFile } from 'obsidian';
// import type { Ingredient } from 'parse-ingredient';
import { get } from 'svelte/store';
import { Ok, type Result } from 'ts-results-es';
import type { Context } from '../context.ts';
import { ShoppingListIgnoreBehaviour } from '../settings/settings.ts';
import type { Ingredient } from '../types.ts';
import { AppendMarkdownExt } from '../utils/filesystem.ts';
import { GetIngredientsFromList } from '../utils/parser.ts';
import type { ErrCtx } from '../utils/result.ts';
import { formatUnicorn, GetCurrentWeek, wildcardToRegex } from '../utils/utils.ts';

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
    const newIngredients = await getMealPlanIngredients(ctx, mealPlanFile);

    const shoppingListFilePath = AppendMarkdownExt(get(ctx.settings).shoppingListNote);

    let file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    if (file == null) {
        ctx.app.vault.create(shoppingListFilePath, '');
        file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    }

    if (file == null) {
        return;
    }

    await updateShoppingList(ctx, file, newIngredients);
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

    const newIngredients = getIngredientsRecipe(ctx, recipeFile);
    await updateShoppingList(ctx, file, newIngredients);
}

async function updateShoppingList(ctx: Context, file: TFile, newIngredients: Ingredient[]) {
    const foodListRange = getFoodListRange(ctx, file);
    const existingIngredients = (await readIngredients(ctx, file, foodListRange)).unwrapOr([] as Ingredient[]);
    const ingredients = mergeIngredientLists(existingIngredients, newIngredients).sort((a, b) => {
        return a.description.localeCompare(b.description);
    });

    ctx.app.vault.process(file, (data) => {
        const start = foodListRange.startOffset;
        const end = foodListRange.endOffset ? foodListRange.endOffset : data.length;

        let newContent = start !== 0 ? '\n' : '';

        for (const i of ingredients) {
            let formatted = formatUnicorn(`${get(ctx.settings).shoppingListFormat}`, i);
            formatted = formatted.replaceAll(/\([\s-]*\)/g, '');
            formatted.trim();
            newContent += `- [ ] ${formatted}\n`;
        }

        return data.substring(0, start) + newContent + data.substring(end);
    });
}

function getFoodListRange(ctx: Context, file: TFile) {
    const metadata = ctx.app.metadataCache.getFileCache(file);

    let startHeader: HeadingCache | null = null;
    let endHeader: HeadingCache | null = null;
    const headings = metadata?.headings;
    if (headings) {
        for (const header of headings) {
            if (header.heading === 'Food') {
                console.error('Found food heading', header);
                startHeader = header;
                continue;
            }

            if (startHeader !== null && endHeader === null) {
                console.error('End header found, ', header);
                endHeader = header;
                break;
            }
        }
    }

    const startOffset = startHeader ? startHeader.position.end.offset : 0;
    const endOffset = endHeader?.position.start.offset;

    return { startOffset, endOffset };
}

async function readIngredients(
    ctx: Context,
    file: TFile,
    range: { startOffset: number; endOffset: number | undefined },
): Promise<Result<Ingredient[], ErrCtx>> {
    const metadata = ctx.app.metadataCache.getFileCache(file);
    const settings = get(ctx.settings);

    const fileContent = await ctx.app.vault.read(file);
    const endOffset = range.endOffset ? range.endOffset : fileContent.length;

    const list = metadata?.listItems;

    if (list !== undefined) {
        return GetIngredientsFromList(
            list
                .filter((l) => {
                    return l.position.start.offset >= range.startOffset && l.position.end.offset <= endOffset;
                })
                .map((l) => {
                    return fileContent.substring(l.position.start.offset, l.position.end.offset);
                }),
            settings.advancedIngredientParsing,
            settings.debugMode,
        );
    }

    return Ok([] as Ingredient[]);
}

async function getMealPlanIngredients(ctx: Context, file: TFile): Promise<Ingredient[]> {
    const thisWeek = GetCurrentWeek(get(ctx.settings).startOfWeek);
    const fileCache = ctx.app.metadataCache.getFileCache(file)!;
    const links = fileCache.links || [];

    // Check if we have H1 headings (list format) or no headings (table format)
    const topLevel = fileCache.headings?.filter((h) => h.level === 1) || [];

    let ingredients: Ingredient[] = [];

    if (topLevel.length > 0) {
        // List format: use H1 headings to find boundaries
        ingredients = await getMealPlanIngredientsListFormat(ctx, file, thisWeek, topLevel, links);
    } else {
        // Table format: parse table to find current week's row
        ingredients = await getMealPlanIngredientsTableFormat(ctx, file, thisWeek, links);
    }

    return ingredients;
}

async function getMealPlanIngredientsListFormat(
    ctx: Context,
    file: TFile,
    thisWeek: string,
    topLevel: HeadingCache[],
    links: any[],
): Promise<Ingredient[]> {
    let end = -1;
    if (topLevel.length > 1) {
        end = topLevel.findIndex((h) => {
            return h.level === 1 && h.heading.includes(thisWeek);
        });
        if (end < topLevel.length - 1) {
            end += 1;
        }
    }

    const startPos = topLevel[0].position!;
    const endPos = end !== -1 ? topLevel[end]?.position! : null;

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

async function getMealPlanIngredientsTableFormat(
    ctx: Context,
    file: TFile,
    thisWeek: string,
    links: any[],
): Promise<Ingredient[]> {
    // Read file content to find the row with current week
    const content = await ctx.app.vault.read(file);
    const lines = content.split('\n');

    // Find the row that contains the current week date
    let currentWeekRowStart = -1;
    let currentWeekRowEnd = -1;
    let currentOffset = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('|') && trimmedLine.includes(thisWeek)) {
            // Found the row with the current week
            currentWeekRowStart = currentOffset;
            currentWeekRowEnd = currentOffset + line.length;
            break;
        }

        // Add length of line + newline character for next iteration
        currentOffset += line.length + 1;
    }

    // If we didn't find the current week, return empty list
    if (currentWeekRowStart === -1) {
        return [];
    }

    // Extract links that fall within the current week's row
    let ingredients: Ingredient[] = [];
    for (const link of links) {
        const linkStart = link.position.start.offset;
        const linkEnd = link.position.end.offset;

        // Check if link is within the current week's row
        if (linkStart >= currentWeekRowStart && linkEnd <= currentWeekRowEnd) {
            const recipeFile = ctx.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
            if (recipeFile != null) {
                ingredients = mergeIngredientLists(ingredients, getIngredientsRecipe(ctx, recipeFile));
            }
        }
    }

    return ingredients;
}

function mergeIngredientLists(left: Ingredient[], right: Ingredient[]) {
    //  Before adding an ingredient check if it's already in the list
    //  If it is add the quantities together otherwise add it to the list
    for (const i of right) {
        const existing = left.findIndex((existing) => {
            return existing.description === i.description && i.unitOfMeasure === existing.unitOfMeasure;
        });
        if (existing === -1) {
            left.push(structuredClone(i));
        } else {
            let raw = left[existing].quantity ?? 0;
            raw += i.quantity ?? 0;
            left[existing].quantity = raw;
        }
    }

    return left;
}

function getIngredientsRecipe(ctx: Context, recipeNote: TFile) {
    const r = get(ctx.recipes).find((r) => r.path.path === recipeNote.path);
    if (r === undefined) {
        return [];
    }

    const ignoreList = get(ctx.settings).shoppingListIgnore;
    const ignoreBehaviour = get(ctx.settings).shoppingListIgnoreBehaviour;

    return r.ingredients.filter((i) => {
        const desc = i.description.toLowerCase();

        return !ignoreList.some((ignoredRaw) => {
            const ignored = ignoredRaw.toLowerCase();

            switch (ignoreBehaviour) {
                case ShoppingListIgnoreBehaviour.Exact:
                    return desc === ignored;

                case ShoppingListIgnoreBehaviour.Partial:
                    return desc.includes(ignored);

                case ShoppingListIgnoreBehaviour.Wildcard:
                    return wildcardToRegex(ignored).test(desc);

                case ShoppingListIgnoreBehaviour.Regex:
                    return new RegExp(ignored).test(desc);
                default:
                    return false;
            }
        });
    });
}
