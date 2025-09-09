import { expect, test } from 'vitest';
import type { Ingredient } from '../types.ts';
import { AdvancedParse, GetIngredientsFromList, GetRecipeMDFormatBoundedList } from '../utils/parser.ts';

test('GetRecipeMDFormatBoundedList', () => {
    interface Test {
        input: string;
        expected: Ingredient[];
    }

    const tests: Test[] = [
        {
            input: `
                ---
                ---
            `,
            expected: [],
        },
        {
            input: `
                # Ingredients
                ---
                ---
            `,
            expected: [],
        },
        {
            input: `
                # Ingredients 
                ---
                - Chicken Thighs 6-8
                ## Chicken Marinade
                - *1 tsp* ground cumin
                - *1 tsp* ground coriander
                - *1/2 tsp* turmeric powder
                - *1 tbsp* garam masala
                - *1 tsp* Kashmiri red chili powder
                - *1 tsp* salt
                - *3 tbsp* yogurt
                - 1/2 Lemon
                ## Base
                ### Whole Spices
                - 1 cinnamon stick
                - 3 cloves
                - 3 green cardamom pod
                - 1 black cardamom pod
                - 1 bay leaf

                - 2 tbsp oil
                - 2 medium onions, chopped
                - 5 garlic cloves
                - 2 green chillies, (optional) chopped
                - 3 tbsp tomato paste
                - 1/2 cup heavy cream
                - 3/4 cup water
                ### Spices for the base
                - 2 tbsp butter
                - 1 tsp ground cumin
                - 1 tsp ground coriander
                - 1/2 tsp tumeric powder, 1 tbsp garam masala
                - 1 tsp Kashmiri red chilli powder
                - 1 tbsp sugar
                - salt to taste
                - black pepper to taste
                - 2 tbsp kasoori menthi
                - Fresh cilantro, chopped
                ---
            `,
            expected: [
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'Chicken Thigh',
                    isGroupHeader: false,
                    quantity: 6,
                    quantity2: 8,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'ground cumin',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'ground coriander',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'turmeric powder',
                    isGroupHeader: false,
                    quantity: 0.5,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'garam masala',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },

                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'Kashmiri red chili powder',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'salt',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'yogurt',
                    isGroupHeader: false,
                    quantity: 3,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'Lemon',
                    isGroupHeader: false,
                    quantity: 0.5,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'cinnamon stick',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'clove',
                    isGroupHeader: false,
                    quantity: 3,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'green cardamom pod',
                    isGroupHeader: false,
                    quantity: 3,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'black cardamom pod',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'bay leaf',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'oil',
                    isGroupHeader: false,
                    quantity: 2,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'onion',
                    isGroupHeader: false,
                    quantity: 2,
                    quantity2: null,
                    unitOfMeasure: 'medium',
                    unitOfMeasureID: 'medium',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'garlic clove',
                    isGroupHeader: false,
                    quantity: 5,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'green chilly',
                    isGroupHeader: false,
                    quantity: 2,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'tomato paste',
                    isGroupHeader: false,
                    quantity: 3,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'heavy cream',
                    isGroupHeader: false,
                    quantity: 0.5,
                    quantity2: null,
                    unitOfMeasure: 'cup',
                    unitOfMeasureID: 'cup',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'water',
                    isGroupHeader: false,
                    quantity: 0.75,
                    quantity2: null,
                    unitOfMeasure: 'cup',
                    unitOfMeasureID: 'cup',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'butter',
                    isGroupHeader: false,
                    quantity: 2,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'ground cumin',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'ground coriander',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'tumeric powder',
                    isGroupHeader: false,
                    quantity: 0.5,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'Kashmiri red chilli powder',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tsp',
                    unitOfMeasureID: 'teaspoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'sugar',
                    isGroupHeader: false,
                    quantity: 1,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'salt to taste',
                    isGroupHeader: false,
                    quantity: null,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'black pepper to taste',
                    isGroupHeader: false,
                    quantity: null,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'kasoori menthi',
                    isGroupHeader: false,
                    quantity: 2,
                    quantity2: null,
                    unitOfMeasure: 'tbsp',
                    unitOfMeasureID: 'tablespoon',
                },
                {
                    altQuantity: null,
                    altUnitOfMeasure: null,
                    altUnitOfMeasureID: null,
                    description: 'Fresh cilantro',
                    isGroupHeader: false,
                    quantity: null,
                    quantity2: null,
                    unitOfMeasure: null,
                    unitOfMeasureID: null,
                },
            ],
        },
    ];

    for (const test of tests) {
        const actual = GetIngredientsFromList(GetRecipeMDFormatBoundedList(test.input).expect('Got ingredients'), true, true).expect(
            'Parsed ingredients',
        );

        expect(actual).toStrictEqual(test.expected);
    }
});

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
