import { writable } from 'svelte/store';
import { Err, Ok } from 'ts-results-es';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '../context.ts';
import * as IngredientsModule from '../recipe/ingredients.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealSettings } from '../settings/settings.ts';
import { ErrCtx } from '../utils/result.ts';

import { noticeCalls } from './__mocks__/obsidian.ts';

describe('Recipe.fillIngredients', () => {
    let mockContext: Context;
    let mockFile: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        noticeCalls.length = 0; // Clear the array

        // Spy on console.error
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Create a mock TFile
        mockFile = {
            path: 'test-recipe.md',
            basename: 'test-recipe',
        };

        // Create a mock Context with settings
        const settings = new MealSettings();
        mockContext = {
            settings: writable(settings),
            app: {} as any,
            plugin: {} as any,
            recipes: writable([]),
            ingredients: {} as any,
            getRecipeFolder: vi.fn(),
            isInRecipeFolder: vi.fn(),
            loadRecipes: vi.fn(),
            debugMode: vi.fn().mockReturnValue(false),
        };
    });

    test('should call console.error when parsing fails, regardless of showRecipeParseErrors setting', async () => {
        // Mock GetIngredients to return an error
        const mockError = new ErrCtx('test-recipe.md', 'MISSING_INGREDIENT_HEADING');
        vi.spyOn(IngredientsModule, 'GetIngredients').mockResolvedValue(Err(mockError));

        const recipe = new Recipe(mockFile);
        await recipe.fillIngredients(mockContext);

        // console.error should always be called
        expect(consoleErrorSpy).toHaveBeenCalledWith(`Failed to parse ingredients: ${mockError}`);
    });

    test('should show Notice when there is a parsing error', async () => {
        // Mock GetIngredients to return an error
        const mockError = new ErrCtx('test-recipe.md', 'MISSING_INGREDIENT_HEADING');
        vi.spyOn(IngredientsModule, 'GetIngredients').mockResolvedValue(Err(mockError));

        const recipe = new Recipe(mockFile);
        await recipe.fillIngredients(mockContext);

        // Notice should be called with the error message
        expect(noticeCalls).toHaveLength(1);
        expect(noticeCalls[0]).toBe(`Failed to parse ingredients: ${mockError}`);
        // console.error should also be called
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should populate ingredients when parsing succeeds', async () => {
        // Mock GetIngredients to return success
        const mockIngredients = [
            {
                quantity: 2,
                quantity2: null,
                unitOfMeasureID: 'cup',
                unitOfMeasure: 'cup',
                description: 'flour',
                isGroupHeader: false,
                altQuantity: null,
                altUnitOfMeasure: null,
                altUnitOfMeasureID: null,
            },
        ];
        vi.spyOn(IngredientsModule, 'GetIngredients').mockResolvedValue(Ok(mockIngredients));

        const recipe = new Recipe(mockFile);
        await recipe.fillIngredients(mockContext);

        // Ingredients should be populated
        expect(recipe.ingredients).toEqual(mockIngredients);
        // No errors should be logged or shown
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(noticeCalls).toHaveLength(0);
    });
});
