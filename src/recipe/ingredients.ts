import type { CachedMetadata, Loc, TFile } from 'obsidian';
import { getFrontMatterInfo, Notice } from 'obsidian';
import { type Ingredient as TIngredient, parseIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import { get } from 'svelte/store';
import type { Context } from '../context.ts';
import { RecipeFormat } from '../settings.js';
import type { Recipe } from './recipe.ts';
import { ErrCtx } from '../utils/result.ts';
import { Ok, Err, type Result } from 'ts-results-es';

interface AltIngredient {
    altQuantity: number | null;
    altUnitOfMeasure: string | null;
    altUnitOfMeasureID: string | null;
}

type Ingredient = TIngredient & AltIngredient;

type ParseErrors =
    | 'INGREDIENT_FAILED_TO_PARSE'
    | 'INGREDIENT_EMPTY'
    | 'NOT_RECIPE_MD_FORMAT'
    | 'INGREDIENT_SECTION_DOESNT_END'
    | 'MISSING_INGREDIENT_HEADING';

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

export async function GetIngredients(ctx: Context, recipeFile: TFile): Promise<Result<Ingredient[], ErrCtx>> {
    if (recipeFile === undefined) {
        return Err(new ErrCtx(recipeFile, 'File is undefined'));
    }

    const fileContent = await ctx.app.vault.read(recipeFile);
    const fileMetadata = ctx.app.metadataCache.getFileCache(recipeFile);
    if (fileMetadata == null) {
        // console.error('Failed to load recipe metadata');
        return Err(new ErrCtx(recipeFile.path, 'Failed to load recipe metadata'));
    }

    let res: Result<string[], ParseErrors>;

    if (get(ctx.settings).recipeFormat === RecipeFormat.RecipeMD) {
        res = GetRecipeMDFormatBoundedList(fileContent);
    } else {
        res = GetMealPlanFormatBoundedList(fileContent, fileMetadata);
    }

    if (res.isErr()) {
        return Err(new ErrCtx(recipeFile.path, res.error));
    }

    const rawIngredient = res.value;

    if (ctx.debugMode()) {
        console.debug(rawIngredient);
    }

    const ingredients: Ingredient[] = [];
    for (const rawIngredient of res) {
        const ingredient = ParseIngredient(ctx, rawIngredient);
        if (ingredient.isOk()) {
            ingredients.push(ingredient.value);
        } else {
            return Err(new ErrCtx(rawIngredient, ingredient.error));
        }
    }

    return Ok(ingredients);
}

function GetRecipeMDFormatBoundedList(fileContent: string): Result<string[], ParseErrors> {
    // Ingredient content is between --- & ---
    const frontmatter = getFrontMatterInfo(fileContent);
    const contentStart = frontmatter.contentStart;
    let content = fileContent.substring(contentStart);

    const start = content.indexOf('---') + '---'.length;
    if (start < 0) {
        // console.error('Not a RecipeMD recipe');
        return Err('NOT_RECIPE_MD_FORMAT');
    }
    content = content.substring(start).trim();

    const end = content.indexOf('---') - '---'.length;
    if (end < 0) {
        // console.error('No end to ingredient list');
        return Err('INGREDIENT_SECTION_DOESNT_END');
    }
    content = content.substring(0, end).trim();

    return Ok(
        content.split('\n').filter((line) => {
            return line.length > 0;
        }),
    );
}

function GetMealPlanFormatBoundedList(fileContent: string, fileMetadata: CachedMetadata): Result<string[], ParseErrors> {
    // Ingredient content is between Ingredients heading and the next heading
    let start: Loc | null = null;
    let end: Loc | null = null;
    let ingredientHeadingLevel = 0;
    if (fileMetadata.headings != null) {
        for (const heading of fileMetadata.headings) {
            if (start != null && heading.level === ingredientHeadingLevel) {
                end = heading.position.start;
                break;
            }

            if (heading.heading.contains('Ingredient') || heading.heading.contains('ingredient')) {
                start = heading.position.end;
                ingredientHeadingLevel = heading.level;
            }
        }
    }

    if (start == null) {
        return Err('MISSING_INGREDIENT_HEADING');
    }

    if (end == null) {
        end = { offset: fileContent.length, line: 0, col: 0 }; // this is kind of a hack to be able to use the Loc type, might not be entirely necessary though
    }

    const content = fileContent.substring(start.offset, end.offset);
    return Ok(
        content.split('\n').filter((line) => {
            return line.length > 0;
        }),
    );
}

function ParseIngredient(ctx: Context, content: string): Result<Ingredient, ParseErrors> {
    // Parse the ingredient line
    const linePrefix = '-';
    const prefixIndex = content.indexOf(linePrefix);
    let ingredientContent = content;
    if (prefixIndex >= 0) {
        ingredientContent = ingredientContent.substring(prefixIndex + 1).trim();
    }

    if (ingredientContent === '') {
        return Err('INGREDIENT_EMPTY');
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
        if (candidate.isGroupHeader) {
            return Err('INGREDIENT_EMPTY');
        }
        tingredient = candidate;
    }

    if (tingredient == null) {
        // console.error('Failed to parse ingredient', ingredientContent);
        new Notice(`Failed to parse ingredient '${ingredientContent}'`); // TODO improve the message
        return Err('INGREDIENT_FAILED_TO_PARSE');
    }

    if (doAdvancedParse) {
        tingredient.description = singular(tingredient.description);
    }

    if (ctx.debugMode()) {
        console.debug('Final ingredient output', tingredient, altIngredients);
    }

    return Ok({
        ...tingredient,
        ...altIngredients,
    });
}

const regex = /\((.*?)\)/;

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
