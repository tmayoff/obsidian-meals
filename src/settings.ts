import { writable } from 'svelte/store';

export class MealSettings {
  recipe_directory = 'Meals';
  meal_plan_note = 'Meal Plan';
  shopping_list_note: string = "Shooping List";

  shopping_list_ignore: Array<string> = [
    "garlic powder",
  ];
}

export const settings = writable(new MealSettings());
