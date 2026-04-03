import * as cheerio from 'cheerio';
import type { Graph, Recipe, Thing } from 'schema-dts';

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

export function to_recipemd(recipe: Recipe): string {
    return '';
}
