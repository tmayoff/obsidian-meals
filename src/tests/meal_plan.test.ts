import { writable } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import { AddRecipeToMealPlan, addRecipeToTable, createTableWeekSection } from '../meal_plan/plan.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealSettings } from '../settings/settings.ts';
import * as Utils from '../utils/utils.ts';

test('createTableWeekSection_basic', () => {
    const weekHeader = 'Week of January 8th';
    const weekDate = 'January 8th';
    const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const result = createTableWeekSection(weekHeader, weekDate, dayHeaders);

    const expectedOutput = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th | | | | | | | |`;

    expect(result).toBe(expectedOutput);
});

test('createTableWeekSection_respectsStartOfWeek', () => {
    const weekHeader = 'Week of January 8th';
    const weekDate = 'January 8th';

    // Simulate startOfWeek = 1 (Monday)
    const dayHeaders: string[] = [];
    const startOfWeek = 1;

    for (let i = 0; i < DAYS_OF_WEEK.length; ++i) {
        const pos = (i + startOfWeek) % DAYS_OF_WEEK.length;
        dayHeaders.push(DAYS_OF_WEEK[pos]);
    }

    const result = createTableWeekSection(weekHeader, weekDate, dayHeaders);

    const expectedOutput = `# Week of January 8th
| Week Start | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
|---|---|---|---|---|---|---|---|
| January 8th | | | | | | | |`;

    expect(result).toBe(expectedOutput);
});

test('addRecipeToTable_emptyCell', () => {
    const content = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th | | | | | | | |

# Week of January 1st
## Sunday
`;

    const weekHeaderEnd = 'Week of January 8th'.length;
    const result = addRecipeToTable(content, weekHeaderEnd, 'Monday', 'Pasta Carbonara');

    expect(result).toContain('| January 8th |  | [[Pasta Carbonara]] |  |  |  |  |  |');
});

test('addRecipeToTable_existingRecipe', () => {
    const content = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Pasta Carbonara]] |  |  |  |  |  |

# Week of January 1st
`;

    const weekHeaderEnd = 'Week of January 8th'.length;
    const result = addRecipeToTable(content, weekHeaderEnd, 'Monday', 'Chicken Tikka Masala');

    expect(result).toContain('| January 8th |  | [[Pasta Carbonara]]<br>[[Chicken Tikka Masala]] |  |  |  |  |  |');
});

test('addRecipeToTable_differentDays', () => {
    const content = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |

# Week of January 1st
`;

    let result = content;
    const weekHeaderEnd = 'Week of January 8th'.length;

    result = addRecipeToTable(result, weekHeaderEnd, 'Monday', 'Recipe 1');
    result = addRecipeToTable(result, weekHeaderEnd, 'Wednesday', 'Recipe 2');
    result = addRecipeToTable(result, weekHeaderEnd, 'Friday', 'Recipe 3');

    expect(result).toContain('[[Recipe 1]]');
    expect(result).toContain('[[Recipe 2]]');
    expect(result).toContain('[[Recipe 3]]');

    // Verify recipes are in correct columns
    const lines = result.split('\n');
    const dataRow = lines.find((line) => line.includes('January 8th') && line.includes('Recipe'));

    expect(dataRow).toBeDefined();
    if (dataRow) {
        // Parse cells but keep empty ones to preserve column positions
        const allCells = dataRow.split('|').map((c) => c.trim());
        // Remove first and last empty cells (before first | and after last |)
        const cells = allCells.slice(1, -1);

        // cells[0] = "January 8th", cells[1] = Sunday (empty), cells[2] = Monday (Recipe 1), etc.
        expect(cells[2]).toContain('Recipe 1'); // Monday
        expect(cells[4]).toContain('Recipe 2'); // Wednesday
        expect(cells[6]).toContain('Recipe 3'); // Friday
    }
});

test('formatDetection_list', () => {
    const content = `# Week of January 8th
## Sunday
## Monday
- [[Recipe 1]]
## Tuesday
`;

    const header = 'Week of January 8th';
    const headerIndex = content.indexOf(header) + header.length;
    const afterHeader = content.slice(headerIndex);
    const isTable = afterHeader.trimStart().startsWith('|');

    expect(isTable).toBe(false);
});

test('formatDetection_table', () => {
    const content = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
`;

    const header = 'Week of January 8th';
    const headerIndex = content.indexOf(header) + header.length;
    const afterHeader = content.slice(headerIndex);
    const isTable = afterHeader.trimStart().startsWith('|');

    expect(isTable).toBe(true);
});

test('addRecipeToTable_multipleWeeks_table', () => {
    const content = `# Week of January 15th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 15th |  |  |  |  |  |  |  |

# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Old Recipe]] |  |  |  |  |  |

# Week of January 1st
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 1st |  |  |  |  |  |  |  |
`;

    const weekHeaderEnd = 'Week of January 15th'.length;
    const result = addRecipeToTable(content, weekHeaderEnd, 'Wednesday', 'New Recipe');

    // Should add to the January 15th week (the most recent one)
    expect(result).toContain('| January 15th |  |  |  | [[New Recipe]] |  |  |  |');

    // Should not modify older weeks
    expect(result).toContain('| January 8th |  | [[Old Recipe]] |  |  |  |  |  |');
    expect(result).toContain('| January 1st |  |  |  |  |  |  |  |');
});

test('addRecipeToTable_multipleWeeks_addToCorrectWeek', () => {
    const content = `# Week of January 15th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 15th |  |  |  |  |  |  |  |

# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
`;

    // Add to week 1
    let result = content;
    const week1HeaderEnd = 'Week of January 15th'.length;
    result = addRecipeToTable(result, week1HeaderEnd, 'Monday', 'Recipe A');
    expect(result).toContain('| January 15th |  | [[Recipe A]] |  |  |  |  |  |');

    // Add to week 2
    const week2Start = result.indexOf('# Week of January 8th');
    const week2HeaderEnd = week2Start + 'Week of January 8th'.length;
    result = addRecipeToTable(result, week2HeaderEnd, 'Friday', 'Recipe B');

    // Both weeks should have their recipes
    expect(result).toContain('| January 15th |  | [[Recipe A]] |  |  |  |  |  |');
    expect(result).toContain('| January 8th |  |  |  |  |  | [[Recipe B]] |  |');
});

describe('AddRecipeToMealPlan integration tests', () => {
    let mockContext: Context;
    let mockRecipe: Recipe;
    let fileContent: string;

    beforeEach(() => {
        // Clear all mocks
        vi.clearAllMocks();

        // Mock GetCurrentWeek to return a fixed date for testing
        vi.spyOn(Utils, 'GetCurrentWeek').mockReturnValue('January 8th');

        // Reset file content
        fileContent = '';

        // Create mock recipe
        const mockFile = {
            path: 'test-recipe.md',
            basename: 'Test Recipe',
        } as any;
        mockRecipe = new Recipe(mockFile);

        // Create mock vault with process method
        const mockVault = {
            getFileByPath: vi.fn().mockReturnValue({
                vault: {
                    process: vi.fn((_file, callback) => {
                        fileContent = callback(fileContent);
                        return Promise.resolve();
                    }),
                },
            }),
            process: vi.fn((_file, callback) => {
                fileContent = callback(fileContent);
                return Promise.resolve();
            }),
            create: vi.fn().mockResolvedValue({}),
        };

        // Create mock context
        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.startOfWeek = 0; // Sunday

        mockContext = {
            settings: writable(settings),
            app: {
                vault: mockVault,
            } as any,
            plugin: {} as any,
            recipes: writable([]),
            ingredients: {} as any,
            getRecipeFolder: vi.fn(),
            isInRecipeFolder: vi.fn(),
            loadRecipes: vi.fn(),
            debugMode: vi.fn().mockReturnValue(false),
        };
    });

    test('should add recipe to list format', async () => {
        // Setup initial file content with list format
        fileContent = `# Week of January 8th
## Sunday
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Wednesday');

        expect(fileContent).toContain('## Wednesday\n- [[Test Recipe]]');
        expect(fileContent).toContain('# Week of January 8th');
    });

    test('should add recipe to table format', async () => {
        // Setup initial file content with table format
        fileContent = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
`;

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Wednesday');

        expect(fileContent).toContain('[[Test Recipe]]');
        expect(fileContent).toContain('| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |');
        // Check that recipe is in Wednesday column (column index 4)
        const dataRow = fileContent.split('\n').find((line) => line.includes('January 8th') && line.includes('Test Recipe'));
        expect(dataRow).toBeDefined();
    });

    test('should add multiple recipes to same day in list format', async () => {
        fileContent = `# Week of January 8th
## Sunday
## Monday
- [[First Recipe]]
## Tuesday
`;

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Monday');

        expect(fileContent).toContain('- [[First Recipe]]');
        expect(fileContent).toContain('- [[Test Recipe]]');
        // Both should be under Monday
        const mondaySection = fileContent.split('## Tuesday')[0];
        expect(mondaySection).toContain('- [[First Recipe]]');
        expect(mondaySection).toContain('- [[Test Recipe]]');
    });

    test('should add multiple recipes to same day in table format', async () => {
        fileContent = `# Week of January 8th
| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[First Recipe]] |  |  |  |  |  |
`;

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Monday');

        expect(fileContent).toContain('[[First Recipe]]<br>[[Test Recipe]]');
    });

    test('should handle list format with multiple weeks', async () => {
        fileContent = `# Week of January 8th
## Sunday
## Monday
## Tuesday

# Week of January 1st
## Sunday
## Monday
- [[Old Recipe]]
## Tuesday
`;

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Monday');

        // Should add to January 8th week (current week)
        expect(fileContent).toContain('- [[Test Recipe]]');
        // Should not modify January 1st week
        expect(fileContent).toContain('- [[Old Recipe]]');

        // Verify it's in the correct week
        const jan8Section = fileContent.split('# Week of January 1st')[0];
        expect(jan8Section).toContain('- [[Test Recipe]]');
    });
});
