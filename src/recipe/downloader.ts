import { requestUrl, stringifyYaml } from 'obsidian';
import type { Recipe, Recipe as SchemaRecipe } from 'schema-dts';
import { Err, Ok, type Result } from 'ts-results-es';
import { ErrCtx } from '../utils/result.ts';
import { get_first_recipe, get_nutritional_information, to_recipemd } from './schema.ts';

interface DownloadedContent {
    recipeName: string;
    recipeContent: string;
    recipe: Recipe;
}

export async function Download(url: string): Promise<Result<DownloadedContent, ErrCtx>> {
    console.debug(`Downloading ${url}`);
    const dom = await requestUrl(url).text;

    const recipe: SchemaRecipe | null = get_first_recipe(dom);
    if (recipe === null) {
        console.error(`Couldn't find a recipe in ${url}`);
        return Err(new ErrCtx(`Couldn't find a recipe in ${url}`, ''));
    }

    if (recipe.name === undefined) {
        console.error(`Recipe found but no name found: ${url}`);
        return Err(new ErrCtx(`Recipe found but no name found: ${url}`, ''));
    }

    const name = recipe.name.toString();
    const sanitized = name.replace(/[:?/<>"|*-]/gi, ' ').trim();

    const formatted = to_recipemd(recipe);
    return Ok({ recipeName: sanitized, recipeContent: formatted, recipe: recipe });
}

export function generateFrontmatter(includeNutritionalInformation: boolean, url: string, recipe: Recipe) {
    let content = '---\n';

    const frontmatter: any = { source: url };

    if (recipe.recipeYield !== null) {
        frontmatter.servings = recipe.recipeYield;
    }

    if (includeNutritionalInformation) {
        const nutrition = get_nutritional_information(recipe);
        if (nutrition != null) {
            if (nutrition.calories) frontmatter.calories = nutrition.calories;
            if (nutrition.fatContent) frontmatter.fat = nutrition.fatContent;
            if (nutrition.saturatedFatContent) frontmatter.saturatedFat = nutrition.saturatedFatContent;
            if (nutrition.carbohydrateContent) frontmatter.carbohydrate = nutrition.carbohydrateContent;
            if (nutrition.sugarContent) frontmatter.sugar = nutrition.sugarContent;
            if (nutrition.fiberContent) frontmatter.fiber = nutrition.fiberContent;
            if (nutrition.proteinContent) frontmatter.protein = nutrition.proteinContent;
            if (nutrition.sodiumContent) frontmatter.sodium = nutrition.sodiumContent;
            if (nutrition.cholesterolContent) frontmatter.cholesterol = nutrition.cholesterolContent;
        }
    }

    content += stringifyYaml(frontmatter);
    content += '---\n';
    return content;
}

export async function DownloadRecipeFileContent(
    url: string,
    includeNutritionalInformation: boolean,
): Promise<Result<DownloadedContent, ErrCtx>> {
    const result = await Download(url);
    if (result.isErr()) {
        return Err(result.error);
    }

    const { recipeName, recipeContent, recipe } = result.unwrap();

    let file_content = generateFrontmatter(includeNutritionalInformation, url, recipe);
    file_content += recipeContent;

    return Ok({ recipeName: recipeName, recipeContent: file_content, recipe: recipe });
}
