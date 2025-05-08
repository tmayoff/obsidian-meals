import { format, scrape } from 'recipe-rs';
import init from 'recipe-rs';
import wasmData from 'recipe-rs/recipe_rs_bg.wasm?url';
import { expect, test } from 'vitest';

test('RecipeDownload', async () => {
    console.log(wasmData);
    await init(
        'file://../../.local/share/yarn/berry/cache/recipe-rs-npm-0.1.11-3dec133994-10c0.zip/node_modules/recipe-rs/recipe_rs_bg.wasm',
    );

    const url = 'https://amateurprochef.com/2025/01/30/butter-chicken-20-minutes-2';

    const dom = await (await fetch(url)).text();

    console.log(scrape, url);

    const recipe = scrape(url, dom);
    const formatted = format(recipe);

    const expected = `
        # Ingredients
        ---
        ---
    `;

    expect(formatted).toStrictEqual(expected);
});
