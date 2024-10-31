import { expect, test } from 'vitest';
import { AdvancedParse } from '../utils/parser.ts';

test('AdvancedParsing', () => {
    const tests = [
        {
            input: '2 chicken breasts',
            output: {
                ingredientContent: '2 chicken breasts',
                altIngredients: {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                },
            },
        },
    ];

    for (const test of tests) {
        const ingredient = AdvancedParse(test.input);

        expect(ingredient).toStrictEqual(test.output);
    }
});
