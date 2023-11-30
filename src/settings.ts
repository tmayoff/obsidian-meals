import { writable } from "svelte/store";

export class MealSettings {
  recipe_directory: string = "/";
  meal_plan_note: string = "Meal Plan";
}

export const settings = writable(new MealSettings());
