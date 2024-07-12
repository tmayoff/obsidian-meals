import type { CachedMetadata, Loc, TFile } from 'obsidian';
import { getFrontMatterInfo } from 'obsidian';
import { type Ingredient as TIngredient, parseIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import { get } from 'svelte/store';
import type { Context } from '../context';
import { RecipeFormat } from '../settings';
import type { Recipe } from './recipe';

interface AltIngredient {
    altQuantity: number | null;
    altUnitOfMeasure: string | null;
    altUnitOfMeasureID: string | null;
}

type Ingredient = TIngredient & AltIngredient;

export async function GetIngredientSet(ctx: Context, recipes: Recipe[]) {
    const recipesFiles = recipes.map((r) => r.path);

    return Promise.all(
        recipesFiles.map(async (dir) => {
            return await GetIngredients(ctx, dir);
        }),
    ).then((ingredients) => {
        const allIngredients: Set<string> = new Set();
        for (const ingredient of ingredients) {
            if (ingredient !== undefined) {
                for (const i of ingredient) {
                    allIngredients.add(i.description.toLocaleLowerCase());
                }
            }
        }
        return allIngredients;
    });
}

export async function GetIngredients(ctx: Context, recipeFile: TFile) {
    if (recipeFile === undefined) {
        console.error('Failed to get ingredients', recipeFile);
    }

    const fileContent = await ctx.app.vault.read(recipeFile);
    const fileMetadata = ctx.app.metadataCache.getFileCache(recipeFile);
    if (fileMetadata == null) {
        console.error('Failed to load recipe metadata');
        return;
    }

    let rawIngredientLists: string[] = [];

    if (get(ctx.settings).recipeFormat === RecipeFormat.RecipeMD) {
        rawIngredientLists = GetRecipeMDFormatBoundedList(fileContent);
    } else {
        rawIngredientLists = GetMealPlanFormatBoundedList(fileContent, fileMetadata);
    }

    if (ctx.debugMode()) {
        console.debug(rawIngredientLists);
    }

    const ingredients: Ingredient[] = [];
    for (const rawIngredient of rawIngredientLists) {
        ingredients.push(ParseIngredient(ctx, rawIngredient));
    }

    return ingredients;
}

function GetRecipeMDFormatBoundedList(fileContent: string): string[] {
    // Ingredient content is between --- & ---
    const frontmatter = getFrontMatterInfo(fileContent);
    const contentStart = frontmatter.contentStart;
    let content = fileContent.substring(contentStart);

    const start = content.indexOf('---') + '---'.length;
    if (start < 0) {
        console.error('Not a RecipeMD recipe');
        return [];
    }
    content = content.substring(start).trim();

    const end = content.indexOf('---') - '---'.length;
    if (end < 0) {
        console.error('No end to ingredient list');
        return [];
    }
    content = content.substring(0, end).trim();

    return content.split('\n').filter((line) => {
        return line.length > 0;
    });
}

function GetMealPlanFormatBoundedList(fileContent: string, fileMetadata: CachedMetadata): string[] {
    // Ingredient content is between Ingredients heading and the next heading
    let start: Loc | null = null;
    let end: Loc | null = null;
    if (fileMetadata.headings != null) {
        for (const heading of fileMetadata.headings) {
            if (start != null) {
                end = heading.position.start;
                break;
            }

            if (heading.heading.localeCompare('Ingredients', undefined, { sensitivity: 'base' })) {
                start = heading.position.end;
            }
        }
    }

    if (start == null || end == null) {
        console.error('Recipe is missing the Ingredients heading\n', fileContent);
        return [];
    }

    const content = fileContent.substring(start.offset, end.offset);
    return content.split('\n').filter((line) => {
        return line.length > 0;
    });
}

function ParseIngredient(ctx: Context, content: string): Ingredient {
    // Parse the ingredient line
    const linePrefix = '-';
    const prefixIndex = content.indexOf(linePrefix);
    let ingredientContent = content;
    if (prefixIndex >= 0) {
        ingredientContent = ingredientContent.substring(prefixIndex).trim();
    }

    if (ctx.debugMode()) {
        console.debug('Parsing; original line:', content);
    }

    const doAdvancedParse = get(ctx.settings).advancedIngredientParsing;

    let altIngredients: AltIngredient = {
        altQuantity: null,
        altUnitOfMeasure: null,
        altUnitOfMeasureID: null,
    };
    if (doAdvancedParse) {
        const obj = AdvancedParse(ingredientContent);
        ingredientContent = obj.ingredientContent;
        altIngredients = obj.altIngredients;
    }

    let tingredient: TIngredient | null = null;
    for (const candidate of parseIngredient(ingredientContent)) {
        if (!candidate.isGroupHeader) {
            tingredient = candidate;
            break;
        }
    }

    if (tingredient == null) {
        console.error('Failed to parse ingredient', ingredientContent);
        return new Ingredient();
    }

    if (doAdvancedParse) {
        tingredient.description = singular(tingredient.description);
    }

    if (ctx.debugMode()) {
        console.debug('Final ingredient output', tingredient, altIngredients);
    }

    return {
        ...tingredient,
        ...altIngredients,
    };
}

function AdvancedParse(ingredientContent: string) {
    // ============================
    // Special ingredient parsing
    // =============================

    let altIngredients: AltIngredient = {
        altQuantity: null,
        altUnitOfMeasure: null,
        altUnitOfMeasureID: null,
    };

    // Ingredients with (...) will be parsed as follows: if it contains another alternate quantity: 17 oz (200g), it will be added as an alternate quantity otherwise it'll be ignored
    const regex = /\((.*?)\)/;
    if (regex.test(ingredientContent)) {
        // Regex match all '(...)'
        const match = regex.exec(ingredientContent);
        if (match != null) {
            // This hack is required due to the parseIngredient function expected a description, without it 200g is parsed into: {quantity: 200, description: 'g'}
            const extraQuantity = `DUMMY_INGREDIENT ${match[0]}`;
            const ingredients = parseIngredient(extraQuantity);
            if (ingredients.length > 0) {
                altIngredients = {
                    altQuantity: ingredients[0].quantity,
                    altUnitOfMeasure: ingredients[0].unitOfMeasure,
                    altUnitOfMeasureID: ingredients[0].unitOfMeasureID,
                };
            }
            ingredientContent = ingredientContent.replace(regex, '');
        }
    }

    // Ingredient name ignores everything after the first comma
    // 200g onions, chopped
    // ~~~~~~~~~~~
    // 200g onion

    const firstComma = ingredientContent.indexOf(',');

    if (firstComma >= 0) {
        ingredientContent = ingredientContent.substring(0, firstComma);
    }

    return { ingredientContent, altIngredients };
}
