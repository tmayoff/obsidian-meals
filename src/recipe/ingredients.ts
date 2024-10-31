import type { CachedMetadata, Loc, TFile } from 'obsidian';
import { getFrontMatterInfo } from 'obsidian';
import { get } from 'svelte/store';
import { Err, Ok, type Result } from 'ts-results-es';
import type { Context } from '../context.ts';
import { RecipeFormat } from '../settings.js';
import { ErrCtx } from '../utils/result.ts';
import type { Recipe } from './recipe.ts';
import type { Ingredient, ParseErrors } from '../types.ts';
import { ParseIngredient } from '../utils/parser.ts';

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

    const settings = get(ctx.settings);

    const fileContent = await ctx.app.vault.read(recipeFile);
    const fileMetadata = ctx.app.metadataCache.getFileCache(recipeFile);
    if (fileMetadata == null) {
        // console.error('Failed to load recipe metadata');
        return Err(new ErrCtx(recipeFile.path, 'Failed to load recipe metadata'));
    }

    let res: Result<string[], ParseErrors>;

    if (settings.recipeFormat === RecipeFormat.RecipeMD) {
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
        if (ctx.debugMode()) {
            console.debug('Parsing ingredient, raw line: ', rawIngredient);
        }

        const advancedParsing = settings.advancedIngredientParsing;

        const ingredient = ParseIngredient(rawIngredient, advancedParsing);
        if (ingredient.isOk()) {
            if (ctx.debugMode()) {
                console.debug('Final ingredient output', ingredient.value);
            }
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
        return Err('NOT_RECIPE_MD_FORMAT');
    }

    const end = content.indexOf('---', start);
    if (end < 0) {
        return Err('INGREDIENT_SECTION_DOESNT_END');
    }
    content = content.substring(start, end).trim();

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
