import { describe, expect, test } from 'vitest';
import { MealSettings, RecipeFormat, ShoppingListIgnoreBehaviour } from '../settings/settings.ts';

describe('MealSettings', () => {
    test('has all required properties', () => {
        const settings = new MealSettings();

        expect(settings).toHaveProperty('recipeDirectory');
        expect(settings).toHaveProperty('mealPlanNote');
        expect(settings).toHaveProperty('shoppingListNote');
        expect(settings).toHaveProperty('recipeFormat');
        expect(settings).toHaveProperty('shoppingListIgnore');
        expect(settings).toHaveProperty('shoppingListIgnoreBehaviour');
        expect(settings).toHaveProperty('advancedIngredientParsing');
        expect(settings).toHaveProperty('shoppingListFormat');
        expect(settings).toHaveProperty('debugMode');
        expect(settings).toHaveProperty('startOfWeek');
        expect(settings).toHaveProperty('includeNutritionalInformation');
    });

    test('has correct default values', () => {
        const settings = new MealSettings();

        expect(settings.recipeDirectory).toBe('Meals');
        expect(settings.mealPlanNote).toBe('Meal Plan');
        expect(settings.shoppingListNote).toBe('Shopping List');
        expect(settings.recipeFormat).toBe(RecipeFormat.RecipeMD);
        expect(settings.shoppingListIgnore).toEqual(['salt', 'pepper', 'olive oil', 'garlic powder']);
        expect(settings.shoppingListIgnoreBehaviour).toBe(ShoppingListIgnoreBehaviour.Exact);
        expect(settings.advancedIngredientParsing).toBe(false);
        expect(settings.shoppingListFormat).toBe('{description} {quantity} {unitOfMeasure}');
        expect(settings.debugMode).toBe(false);
        expect(settings.startOfWeek).toBe(0);
        expect(settings.includeNutritionalInformation).toBe(true);
    });

    test('properties can be modified', () => {
        const settings = new MealSettings();

        settings.recipeDirectory = 'Recipes';
        settings.mealPlanNote = 'Weekly Plan';
        settings.shoppingListNote = 'Grocery List';
        settings.recipeFormat = RecipeFormat.MealPlan;
        settings.shoppingListIgnore = ['salt'];
        settings.shoppingListIgnoreBehaviour = ShoppingListIgnoreBehaviour.Partial;
        settings.advancedIngredientParsing = true;
        settings.shoppingListFormat = '{quantity} {unitOfMeasure} {description}';
        settings.debugMode = true;
        settings.startOfWeek = 1;
        settings.includeNutritionalInformation = false;

        expect(settings.recipeDirectory).toBe('Recipes');
        expect(settings.mealPlanNote).toBe('Weekly Plan');
        expect(settings.shoppingListNote).toBe('Grocery List');
        expect(settings.recipeFormat).toBe(RecipeFormat.MealPlan);
        expect(settings.shoppingListIgnore).toEqual(['salt']);
        expect(settings.shoppingListIgnoreBehaviour).toBe(ShoppingListIgnoreBehaviour.Partial);
        expect(settings.advancedIngredientParsing).toBe(true);
        expect(settings.shoppingListFormat).toBe('{quantity} {unitOfMeasure} {description}');
        expect(settings.debugMode).toBe(true);
        expect(settings.startOfWeek).toBe(1);
        expect(settings.includeNutritionalInformation).toBe(false);
    });
});

describe('RecipeFormat enum', () => {
    test('has correct values', () => {
        expect(RecipeFormat.MealPlan).toBe('Meal Plan');
        expect(RecipeFormat.RecipeMD).toBe('RecipeMD');
    });
});

describe('ShoppingListIgnoreBehaviour enum', () => {
    test('has correct values', () => {
        expect(ShoppingListIgnoreBehaviour.Exact).toBe('Exact');
        expect(ShoppingListIgnoreBehaviour.Partial).toBe('Partial');
        expect(ShoppingListIgnoreBehaviour.Wildcard).toBe('Wildcard');
        expect(ShoppingListIgnoreBehaviour.Regex).toBe('Regex');
    });
});
