# Meal Planning and Recipe Management Pluging for Obsidian.md

This plugin helps you manage your list of recipes as well as plan meals for the week.

## Features

- Search & Filter recipes based on ingredients you have
- Create/update or generate 'Meal Plan' note for each week you need to plan
- Generate shopping lists for you for the week

## Usage
To be able to search through recipes, recipes must be in the same folder (defaults to Meals), and in the following format

```md
# Ingredients
- 1 tsp salt
- ...
```


## Shopping list

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
