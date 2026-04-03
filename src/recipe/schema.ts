import * as cheerio from 'cheerio';
import type { Graph, HowToSection, HowToStep, NutritionInformation, Recipe, Text, Thing } from 'schema-dts';

export function get_first_recipe(html: string): Recipe | null {
    const $ = cheerio.load(html);

    for (const el of $('script[type="application/ld+json"]').toArray()) {
        try {
            const parsed = JSON.parse($(el).html() ?? '');

            // Handle @graph (multiple items in one block)
            if (parsed['@graph']) {
                const graph = parsed as Graph;
                const recipe = (graph['@graph'] as Thing[]).find((item) => item['@type'] === 'Recipe');
                if (recipe) return recipe as Recipe;
            }

            // Handle single object
            if (parsed['@type'] === 'Recipe') {
                return parsed as Recipe;
            }
        } catch {}
    }

    return null;
}

function toArray<T>(value: T | readonly T[] | null | undefined): T[] {
    if (value == null) return [];
    return Array.isArray(value) ? [...value] : [value as T];
}

export function to_recipemd(recipe: Recipe): string {
    let formatted = `# ${recipe.name ?? ''}\n`;
    if (recipe.description !== null) {
        formatted += `${recipe.description}\n\n`;
    }

    if (recipe.recipeYield !== null) {
        formatted += `**${recipe.recipeYield} servings**\n\n`;
    }

    formatted += '---\n';

    const ingredients = toArray(recipe.recipeIngredient).filter((item): item is Text => typeof item === 'string');
    ingredients.forEach((ingredient) => {
        const suffix = ingredient.toString().startsWith('-') ? '' : '- ';
        formatted += `${suffix}${ingredient}\n`;
    });

    formatted += '---\n\n';

    const steps = toArray(recipe.recipeInstructions)
        .flatMap((step) => {
            if (typeof step === 'string') return [step];
            if ((step as HowToSection).itemListElement !== undefined)
                return toArray((step as HowToSection).itemListElement).map((s) =>
                    typeof s === 'string' ? s : ((s as HowToStep).text?.toString() ?? ''),
                );
            return [(step as HowToStep).text?.toString() ?? ''];
        })
        .filter((text) => text.trim() !== '');
    steps.forEach((text, i) => {
        formatted += `${i + 1}. ${text}\n`;
    });

    return formatted;
}

export function get_nutritional_information(recipe: Recipe) {
    return toArray(recipe.nutrition).find((item): item is NutritionInformation => typeof item === 'object' && !('@id' in item));
}
