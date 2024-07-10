export enum RecipeFormat {
    MealPlan = 'Meal Plan',
    RecipeMD = 'RecipeMD',
}

export class MealSettings {
    recipeDirectory = 'Meals';
    mealPlanNote = 'Meal Plan';
    shoppingListNote = 'Shopping List';
    recipeFormat: RecipeFormat = RecipeFormat.MealPlan;
    shoppingListIgnore: string[] = ['salt', 'pepper', 'olive oil', 'garlic powder'];
    advancedIngredientParsing = false;
    shoppingListFormat = '{description} {quantity} {unitOfMeasure}';
    debugMode = false;
}
