# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin for recipe management and meal planning. It allows users to store recipes as markdown files, search/filter by ingredients, create weekly meal plans, and generate shopping lists from planned meals.

## Development Commands

```bash
# Development build with watch mode (outputs to test_vault/.obsidian/plugins/tmayoff-meals)
yarn dev

# Production build (outputs to ./build)
yarn build

# Type checking (Svelte components)
yarn check

# Run all tests
yarn test

# Run tests with coverage
yarn coverage

# Linting and formatting (Biome)
npx biome check --write .
```

## Recipe Format Support

The plugin supports two recipe formats (configured via settings):

1. **RecipeMD** (recommended): Uses YAML frontmatter with ingredients between `---` delimiters
2. **Legacy format**: Uses H1 headings (`# Ingredients` and `# Directions`)

Ingredients are parsed from markdown lists (`- ` or `- [ ] ` prefixes) using the `parse-ingredient` library.

## Architecture

### Core Plugin Structure

-   **main.ts**: Plugin entry point (`MealPlugin` class)

    -   Registers commands (find recipe, open meal plan, shopping list operations)
    -   Sets up file watchers for recipe changes (create/modify events)
    -   Initializes WASM module (`recipe-rs`) for recipe parsing
    -   Manages settings and debug mode

-   **context.ts**: Central state management (`Context` class)
    -   Holds Svelte stores for recipes, ingredients, and settings
    -   Provides utility methods for recipe folder access and validation
    -   Acts as dependency injection container passed to all components

### Recipe Management

-   **recipe/recipe.ts**: Core `Recipe` class and loading logic

    -   Recursively loads recipes from configured directory
    -   Lazy-loads ingredients only when needed (`fillIngredients`)

-   **recipe/ingredients.ts**: Ingredient parsing from markdown files

    -   Supports both RecipeMD and legacy formats
    -   Returns `Result<Ingredient[], ParseErrors>` for error handling

-   **utils/parser.ts**: Low-level parsing utilities
    -   `ParseIngredient`: Parses individual ingredient lines
    -   `AdvancedParse`: Handles alternate quantities (e.g., "17 oz (200g)"), removes descriptions after commas, singularizes ingredient names
    -   Uses `parse-ingredient` library for quantity/unit extraction

### Meal Planning

-   **meal_plan/plan.ts**: Opens/creates meal plan notes
-   **meal_plan/add_to_plan.ts**: Modal for adding recipes to specific days
-   **meal_plan/shopping_list.ts**: Shopping list generation and management
    -   `AddMealPlanToShoppingList`: Extracts all recipe links from current week's meal plan
    -   `mergeIngredientLists`: Combines ingredients with same description/unit
    -   Respects ignore list (salt, pepper, etc.) with multiple matching behaviors (exact, partial, wildcard, regex)
    -   `ClearCheckedIngredients`: Removes completed items from shopping list

### UI Components (Svelte 5)

-   **SearchRecipe.svelte**: Recipe search modal with ingredient filtering
-   **SettingsPage.svelte**: Plugin settings interface
-   Uses UnoCSS for styling (Uno preset configured in vite.config.ts)

### Settings

Settings stored in `MealSettings` class (settings/settings.ts):

-   `recipeDirectory`: Where recipes are stored (default: "Meals")
-   `mealPlanNote`: Meal plan note name (default: "Meal Plan")
-   `shoppingListNote`: Shopping list note name (default: "Shopping List")
-   `recipeFormat`: RecipeMD or legacy format
-   `shoppingListIgnore`: Ingredients to exclude from shopping list
-   `shoppingListFormat`: Template string for formatting ingredients (e.g., `{description} {quantity} {unitOfMeasure}`)
-   `advancedIngredientParsing`: Enables comma removal, singularization, and alt quantity parsing

## Build Configuration

-   **Vite** for bundling (vite.config.ts)

    -   Development mode outputs to `test_vault/.obsidian/plugins/tmayoff-meals` for hot reload testing
    -   Production outputs to `./build`
    -   Uses CommonJS format (required by Obsidian)
    -   Externalizes Obsidian API and CodeMirror

-   **TypeScript** with strict mode and Svelte support
-   **Biome** for linting/formatting (replaces ESLint/Prettier)
    -   140 character line width
    -   4 space indentation
    -   Single quotes for JS/TS
    -   Relaxed rules for Svelte files (no unused import/variable checking)

## Testing

Tests in `src/tests/` using Vitest:

-   `parser.test.ts`: Ingredient parsing validation
-   `utils.test.ts`: Utility function tests

Development must be done using Test-Driven Development (TDD) best practices. Always write tests for new features and bug fixes.

## Key Dependencies

-   **obsidian**: Obsidian API (TFile, TFolder, Plugin, Modal, etc.)
-   **svelte**: UI framework (using Svelte 5 with `mount`/`unmount`)
-   **parse-ingredient**: Ingredient quantity/unit parsing
-   **recipe-rs**: WASM module for recipe parsing (must be initialized in onload)
-   **pluralize**: Singularize ingredient names in advanced parsing
-   **moment**: Date handling for meal planning
-   **ts-results-es**: Result types for error handling

## Development Notes

-   The plugin uses Svelte stores (`writable`, `derived`) for reactive state management
-   File watchers automatically reload recipes when files change in the recipe directory
-   Debug mode adds extra commands and logging (enable in settings)
-   Shopping list uses Obsidian's metadata cache (`listItems`, `headings`, `links`) for parsing
-   Development builds include inline sourcemaps for debugging
-   You should always use Test-Driven Development (TDD) practices when adding features or fixing bugs.
    -   Write tests first, then implement the functionality to make the tests pass.

## Important Constraints

### NO Dynamic Imports

**NEVER use dynamic imports (`await import()` or `import()`)** in this codebase. They break Obsidian's plugin bundler and cause module resolution errors at runtime.

❌ **BAD - Do not do this:**

```typescript
const { SomeModule } = await import("./some-module.ts");
```

✅ **GOOD - Always use static imports:**

```typescript
import { SomeModule } from "./some-module.ts";
```

**Why:** Vite's bundling process for Obsidian plugins requires all imports to be statically analyzable at build time. Dynamic imports create separate chunks that cannot be properly resolved by Obsidian's module loader.
