import { writable } from 'svelte/store';

export class MealSettings {
    recipe_directory = 'Meals';
    meal_plan_note = 'Meal Plan';
    shopping_list_note = 'Shopping List';

    recipe_format = 'Meal Plan';

    shopping_list_ignore: Array<string> = ['salt', 'pepper', 'olive oil', 'garlic powder'];
}

export const settings = writable(new MealSettings());
