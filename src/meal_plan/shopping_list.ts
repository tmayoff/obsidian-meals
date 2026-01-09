import type { HeadingCache, TFile } from "obsidian";
import { get } from "svelte/store";
import { Ok, type Result } from "ts-results-es";
import type { Context } from "../context.ts";
import { ShoppingListIgnoreBehaviour } from "../settings/settings.ts";
import type { Ingredient } from "../types.ts";
import { AppendMarkdownExt } from "../utils/filesystem.ts";
import { GetIngredientsFromList } from "../utils/parser.ts";
import type { ErrCtx } from "../utils/result.ts";
import { formatUnicorn, wildcardToRegex } from "../utils/utils.ts";
import { extractWeeksFromMealPlan } from "./week_extractor.ts";
import { WeekSelectorModal } from "./week_selector_modal.ts";

export async function ClearCheckedIngredients(ctx: Context) {
    const filePath = AppendMarkdownExt(get(ctx.settings).shoppingListNote);

    const file = ctx.app.vault.getFileByPath(filePath);
    if (file == null) {
        return;
    }

    const listItems = ctx.app.metadataCache
        .getFileCache(file)
        ?.listItems?.filter((i) => {
            return i.task !== undefined && i.task !== " ";
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

        content =
            content.substring(0, start) + content.substring(start + length);
        offset += length;
    }

    // Save the new content
    ctx.app.vault.modify(file, content);
}

export async function AddMealPlanToShoppingList(ctx: Context) {
    const settings = get(ctx.settings);
    const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);

    const mealPlanFile = ctx.app.vault.getFileByPath(mealPlanFilePath);
    if (mealPlanFile == null) {
        return;
    }

    // Extract all current/future weeks from the meal plan
    const weeks = await extractWeeksFromMealPlan(
        ctx,
        mealPlanFile,
        settings.startOfWeek
    );

    if (weeks.length === 0) {
        // No weeks found
        return;
    }

    // If only one week, process it directly without showing modal
    if (weeks.length === 1) {
        const ingredients = await getIngredientsForWeek(
            ctx,
            mealPlanFile,
            weeks[0]
        );
        const shoppingListFilePath = AppendMarkdownExt(
            settings.shoppingListNote
        );
        let file = ctx.app.vault.getFileByPath(shoppingListFilePath);
        if (file == null) {
            await ctx.app.vault.create(shoppingListFilePath, "");
            file = ctx.app.vault.getFileByPath(shoppingListFilePath);
        }
        if (file == null) {
            return;
        }
        await updateShoppingList(ctx, file, ingredients);
        return;
    }

    // Multiple weeks - open modal for week selection
    new WeekSelectorModal(ctx, weeks, async (selectedWeeks) => {
        await processSelectedWeeks(ctx, mealPlanFile, selectedWeeks);
    }).open();
}

export async function AddFileToShoppingList(ctx: Context, recipeFile: TFile) {
    const shoppingListFilePath = AppendMarkdownExt(
        get(ctx.settings).shoppingListNote
    );
    let file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    if (file == null) {
        ctx.app.vault.create(shoppingListFilePath, "");
        file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    }
    if (file == null) {
        return;
    }

    const newIngredients = getIngredientsRecipe(ctx, recipeFile);
    await updateShoppingList(ctx, file, newIngredients);
}

async function updateShoppingList(
    ctx: Context,
    file: TFile,
    newIngredients: Ingredient[]
) {
    const foodListRange = getFoodListRange(ctx, file);
    const existingIngredients = (
        await readIngredients(ctx, file, foodListRange)
    ).unwrapOr([] as Ingredient[]);
    const ingredients = mergeIngredientLists(
        existingIngredients,
        newIngredients
    ).sort((a, b) => {
        return a.description.localeCompare(b.description);
    });

    ctx.app.vault.process(file, (data) => {
        const start = foodListRange.startOffset;
        const end = foodListRange.endOffset
            ? foodListRange.endOffset
            : data.length;

        let newContent = start !== 0 ? "\n" : "";

        for (const i of ingredients) {
            let formatted = formatUnicorn(
                `${get(ctx.settings).shoppingListFormat}`,
                i
            );
            formatted = formatted.replaceAll(/\([\s-]*\)/g, "");
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
            if (header.heading === "Food") {
                console.error("Found food heading", header);
                startHeader = header;
                continue;
            }

            if (startHeader !== null && endHeader === null) {
                console.error("End header found, ", header);
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
    range: { startOffset: number; endOffset: number | undefined }
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
                    return (
                        l.position.start.offset >= range.startOffset &&
                        l.position.end.offset <= endOffset
                    );
                })
                .map((l) => {
                    return fileContent.substring(
                        l.position.start.offset,
                        l.position.end.offset
                    );
                }),
            settings.advancedIngredientParsing,
            settings.debugMode
        );
    }

    return Ok([] as Ingredient[]);
}

function mergeIngredientLists(left: Ingredient[], right: Ingredient[]) {
    //  Before adding an ingredient check if it's already in the list
    //  If it is add the quantities together otherwise add it to the list
    for (const i of right) {
        const existing = left.findIndex((existing) => {
            return (
                existing.description === i.description &&
                i.unitOfMeasure === existing.unitOfMeasure
            );
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

// ============================================================================
// Multi-week shopping list functions
// ============================================================================

interface WeekIngredients {
    week: import("./week_extractor.ts").WeekInfo;
    ingredients: Ingredient[];
}

/**
 * Process selected weeks and add to shopping list
 */
export async function processSelectedWeeks(
    ctx: Context,
    mealPlanFile: TFile,
    selectedWeeks: import("./week_extractor.ts").WeekInfo[]
) {
    const weekIngredientsGroups: WeekIngredients[] = [];

    // Extract ingredients for each selected week
    for (const week of selectedWeeks) {
        const ingredients = await getIngredientsForWeek(
            ctx,
            mealPlanFile,
            week
        );
        weekIngredientsGroups.push({
            week,
            ingredients,
        });
    }

    // Update shopping list with week-grouped ingredients
    await updateShoppingListMultiWeek(ctx, weekIngredientsGroups);
}

/**
 * Extract ingredients for a specific week
 */
async function getIngredientsForWeek(
    ctx: Context,
    file: TFile,
    week: import("./week_extractor.ts").WeekInfo
): Promise<Ingredient[]> {
    const fileCache = ctx.app.metadataCache.getFileCache(file)!;
    const links = fileCache.links || [];
    const topLevel = fileCache.headings?.filter((h) => h.level === 1) || [];

    let ingredients: Ingredient[] = [];

    if (topLevel.length > 0) {
        // List format
        ingredients = await getIngredientsForWeekListFormat(
            ctx,
            file,
            week,
            links
        );
    } else {
        // Table format
        ingredients = await getIngredientsForWeekTableFormat(
            ctx,
            file,
            week,
            links
        );
    }

    return ingredients;
}

/**
 * Extract ingredients for a week in list format
 */
async function getIngredientsForWeekListFormat(
    ctx: Context,
    file: TFile,
    week: import("./week_extractor.ts").WeekInfo,
    links: any[]
): Promise<Ingredient[]> {
    let ingredients: Ingredient[] = [];

    for (const link of links) {
        // Filter by character offset range for this week
        if (link.position.start.offset < week.startOffset) {
            continue;
        }

        if (link.position.start.offset >= week.endOffset) {
            continue;
        }

        const recipeFile = ctx.app.metadataCache.getFirstLinkpathDest(
            link.link,
            file.path
        );
        if (recipeFile != null) {
            ingredients = mergeIngredientLists(
                ingredients,
                getIngredientsRecipe(ctx, recipeFile)
            );
        }
    }

    return ingredients;
}

/**
 * Extract ingredients for a week in table format
 */
async function getIngredientsForWeekTableFormat(
    ctx: Context,
    file: TFile,
    week: import("./week_extractor.ts").WeekInfo,
    links: any[]
): Promise<Ingredient[]> {
    let ingredients: Ingredient[] = [];

    for (const link of links) {
        const linkStart = link.position.start.offset;
        const linkEnd = link.position.end.offset;

        // Check if link is within this week's row range
        if (linkStart >= week.startOffset && linkEnd <= week.endOffset) {
            const recipeFile = ctx.app.metadataCache.getFirstLinkpathDest(
                link.link,
                file.path
            );
            if (recipeFile != null) {
                ingredients = mergeIngredientLists(
                    ingredients,
                    getIngredientsRecipe(ctx, recipeFile)
                );
            }
        }
    }

    return ingredients;
}

/**
 * Update shopping list with ingredients grouped by week
 */
async function updateShoppingListMultiWeek(
    ctx: Context,
    weekGroups: WeekIngredients[]
) {
    const settings = get(ctx.settings);
    const shoppingListFilePath = AppendMarkdownExt(settings.shoppingListNote);

    let file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    if (file == null) {
        await ctx.app.vault.create(shoppingListFilePath, "");
        file = ctx.app.vault.getFileByPath(shoppingListFilePath);
    }

    if (file == null) {
        return;
    }

    await ctx.app.vault.process(file, (data) => {
        const foodListRange = getFoodListRange(ctx, file);
        const start = foodListRange.startOffset;
        const end = foodListRange.endOffset
            ? foodListRange.endOffset
            : data.length;

        let newContent = start !== 0 ? "\n" : "";

        // Add each week as a section
        for (const weekGroup of weekGroups) {
            // Week header
            newContent += `## ${weekGroup.week.displayName}\n\n`;

            // Sort and format ingredients for this week
            const sortedIngredients = weekGroup.ingredients.sort((a, b) => {
                return a.description.localeCompare(b.description);
            });

            for (const ingredient of sortedIngredients) {
                let formatted = formatUnicorn(
                    settings.shoppingListFormat,
                    ingredient
                );
                formatted = formatted.replaceAll(/\([\s-]*\)/g, "");
                formatted = formatted.trim();
                newContent += `- [ ] ${formatted}\n`;
            }

            newContent += "\n"; // Extra line between weeks
        }

        return data.substring(0, start) + newContent + data.substring(end);
    });
}
