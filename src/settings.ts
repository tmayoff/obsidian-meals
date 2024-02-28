import { writable } from 'svelte/store';

export class MealSettings {
    recipe_directory = 'Meals';
    meal_plan_note = 'Meal Plan';
    shopping_list_note = 'Shopping List';

    shopping_list_ignore: Array<string> = ['salt', 'pepper', 'olive oil', 'garlic powder'];

    advanced_ingredient_parsing = false;
}

export const settings = writable(new MealSettings());
