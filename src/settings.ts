import { writable } from 'svelte/store';

export class MealSettings {
    recipe_directory = 'Meals';
    meal_plan_note = 'Meal Plan';
}

export const settings = writable(new MealSettings());
