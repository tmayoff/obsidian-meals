export enum RecipeFormat {
    MealPlan = 'Meal Plan',
    RecipeMD = 'RecipeMD',
}

export enum ShoppingListIgnoreBehaviour {
    Exact = 'Exact',
    Partial = 'Partial',
    Wildcard = 'Wildcard',
    Regex = 'Regex',
}

export class MealSettings {
    recipeDirectory = 'Meals';
    mealPlanNote = 'Meal Plan';
    shoppingListNote = 'Shopping List';
    recipeFormat: RecipeFormat = RecipeFormat.RecipeMD;
    shoppingListIgnore: string[] = ['salt', 'pepper', 'olive oil', 'garlic powder'];
    shoppingListIgnoreBehaviour: ShoppingListIgnoreBehaviour = ShoppingListIgnoreBehaviour.Exact;
    advancedIngredientParsing = false;
    shoppingListFormat = '{description} {quantity} {unitOfMeasure}';
    debugMode = false;
    startOfWeek = 0;
    includeNutritionalInformation = true;
}
