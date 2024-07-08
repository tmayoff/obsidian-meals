# Meal Planning and Recipe Management Pluging for Obsidian.md

This plugin helps you manage your list of recipes as well as plan meals for the week.

## Features

- Search & Filter recipes based on ingredients you have
- Create/update or generate 'Meal Plan' note for each week you need to plan
- Generate shopping lists for you for the week
- Download recipes from the internet to store as markdown

## Formatting recipe notes

This plugin supports two formats of your recipes to extract be able to extract the correct information.

1. [RecipeMD](https://recipemd.org/)
2. And a simpler but to be deprecated format, based on headings, Create an h1 heading called: Ingredients and another called Directions.

e.g.
```md
# Ingredients
- 1tsbp baking soda
- ...

# Directions
1. Mix dry ingredients together
```

## Searching
Recipe's can be searched for using the 'Find a Recipe' dialog from the command palette. You can search for recipes based on ingredients.
You can add recipes to a list on the side and you can then add those reipces to particular days in the Meal Plan.

## Meal planning
When recipes are added to the meal plan they're automatically added to the Meal Plan note in the current week.

## Shopping list
Recipe ingredients can be added to the shopping list in two ways:

1. You can add them individually from the note's context menu
2. You can add the ingredients for the week from the Meal Plan using the command palette.

**Formatting**
To customize how ingredients are added to the shopping list you can modify the `Shopping list format` setting (defaulted to: {description} {quantity} {unitOfMeasure} ({altQuantity} {altUnitOfMeasure})).
The value of the setting can contain any text and to paste properties from an ingredient you can use the {property} syntax.

Properties are:
- quantity: The primary quantity (the lower quantity in a range, if applicable)
- quantity2: The secondary quantity (the upper quantity in a range, or `null` if not applicable)
- unitOfMeasureID: The unit of measure identifier
- unitOfMeasure: The unit of measure
- description: The description (usually the name of the ingredient)
- isGroupHeader: Whether the "ingredient" is actually a group header, e.g. "For icing:", rarely used
- altQuantity: Quantity taken from inside () of the ingredient line
- altUnitOfMeasure: Unit of measurement from inside () of the ingredient line
- altUnitOfMeasureID: Unit of measurement id from inside () of the ingredient line

## Developer Notes
- https://docs.obsidian.md/Home
