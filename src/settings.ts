import { writable } from 'svelte/store';

export const enum RecipeFormat {
    Meal_Plan = 'Meal Plan',
    RecipeMD = 'RecipeMD',
}

export class MealSettings {
    recipe_directory = 'Meals';
    meal_plan_note = 'Meal Plan';
    shopping_list_note = 'Shopping List';

    recipe_format: RecipeFormat = RecipeFormat.Meal_Plan;

    shopping_list_ignore: Array<string> = ['salt', 'pepper', 'olive oil', 'garlic powder'];
}

export const settings = writable(new MealSettings());
