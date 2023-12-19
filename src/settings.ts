import { writable } from "svelte/store";

export class MealSettings {
  recipe_directory: string = "/";
  meal_plan_note: string = "Meal Plan";
  shopping_list_note: string = "Shooping List";

  shopping_list_ignore: Array<string> = [
    "garlic powder",
  ];
}

export const settings = writable(new MealSettings());
