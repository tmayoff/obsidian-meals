import moment from 'moment';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DAYS_OF_WEEK } from '../constants.ts';
import type { Context } from '../context.ts';
import {
    AddRecipeToMealPlan,
    AddRecipeToMealPlanByDate,
    addRecipeToTable,
    convertListToTable,
    convertTableToList,
    createTableWeekSection,
    detectMealPlanFormat,
    RemoveRecipeFromMealPlan,
} from '../meal_plan/plan.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealPlanFormat, MealSettings } from '../settings/settings.ts';
import * as Utils from '../utils/utils.ts';

test('createTableWeekSection_basic', () => {
    const weekDate = 'January 8th';
    const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const result = createTableWeekSection(weekDate, dayHeaders);

    const expectedOutput = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th | | | | | | | |`;

    expect(result).toBe(expectedOutput);
});

test('createTableWeekSection_respectsStartOfWeek', () => {
    const weekDate = 'January 8th';

    // Simulate startOfWeek = 1 (Monday)
    const dayHeaders: string[] = [];
    const startOfWeek = 1;

    for (let i = 0; i < DAYS_OF_WEEK.length; ++i) {
        const pos = (i + startOfWeek) % DAYS_OF_WEEK.length;
        dayHeaders.push(DAYS_OF_WEEK[pos]);
    }

    const result = createTableWeekSection(weekDate, dayHeaders);

    const expectedOutput = `| Week Start | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
|---|---|---|---|---|---|---|---|
| January 8th | | | | | | | |`;

    expect(result).toBe(expectedOutput);
});

test('addRecipeToTable_emptyCell', () => {
    const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th | | | | | | | |
| January 1st | | | | | | | |
`;

    const result = addRecipeToTable(content, 'January 8th', 'Monday', 'Pasta Carbonara');

    expect(result).toContain('| January 8th |  | [[Pasta Carbonara]] |  |  |  |  |  |');
    // January 1st row should remain unchanged from input
    expect(result).toContain('| January 1st | | | | | | | |');
});

test('addRecipeToTable_existingRecipe', () => {
    const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Pasta Carbonara]] |  |  |  |  |  |
| January 1st |  |  |  |  |  |  |  |
`;

    const result = addRecipeToTable(content, 'January 8th', 'Monday', 'Chicken Tikka Masala');

    expect(result).toContain('| January 8th |  | [[Pasta Carbonara]]<br>[[Chicken Tikka Masala]] |  |  |  |  |  |');
    expect(result).toContain('| January 1st |  |  |  |  |  |  |  |');
});

test('addRecipeToTable_differentDays', () => {
    const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
| January 1st |  |  |  |  |  |  |  |
`;

    let result = content;

    result = addRecipeToTable(result, 'January 8th', 'Monday', 'Recipe 1');
    result = addRecipeToTable(result, 'January 8th', 'Wednesday', 'Recipe 2');
    result = addRecipeToTable(result, 'January 8th', 'Friday', 'Recipe 3');

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

    // Verify January 1st row is unchanged
    expect(result).toContain('| January 1st |  |  |  |  |  |  |  |');
});

test('addRecipeToTable_headerSpacingVariations', () => {
    // Test that header detection works with different spacing (e.g., "Week Start  |" with 2 spaces)
    const content = `| Week Start  | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
`;

    const result = addRecipeToTable(content, 'January 8th', 'Monday', 'Test Recipe');

    expect(result).toContain('[[Test Recipe]]');
    expect(result).toContain('| January 8th |  | [[Test Recipe]] |  |  |  |  |  |');
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
    const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
`;

    const isTable = content.trimStart().startsWith('|');

    expect(isTable).toBe(true);
});

test('addRecipeToTable_multipleWeeks_table', () => {
    const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 15th |  |  |  |  |  |  |  |
| January 8th |  | [[Old Recipe]] |  |  |  |  |  |
| January 1st |  |  |  |  |  |  |  |
`;

    const result = addRecipeToTable(content, 'January 15th', 'Wednesday', 'New Recipe');

    // Should add to the January 15th week
    expect(result).toContain('| January 15th |  |  |  | [[New Recipe]] |  |  |  |');

    // Should not modify older weeks
    expect(result).toContain('| January 8th |  | [[Old Recipe]] |  |  |  |  |  |');
    expect(result).toContain('| January 1st |  |  |  |  |  |  |  |');
});

test('addRecipeToTable_multipleWeeks_addToCorrectWeek', () => {
    const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 15th |  |  |  |  |  |  |  |
| January 8th |  |  |  |  |  |  |  |
`;

    // Add to week 1
    let result = content;
    result = addRecipeToTable(result, 'January 15th', 'Monday', 'Recipe A');
    expect(result).toContain('| January 15th |  | [[Recipe A]] |  |  |  |  |  |');

    // Add to week 2
    result = addRecipeToTable(result, 'January 8th', 'Friday', 'Recipe B');

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
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
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
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
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

describe('AddRecipeToMealPlanByDate integration tests', () => {
    let mockContext: Context;
    let mockRecipe: Recipe;
    let fileContent: string;

    beforeEach(() => {
        vi.clearAllMocks();

        fileContent = '';

        const mockFile = {
            path: 'test-recipe.md',
            basename: 'Test Recipe',
        } as any;
        mockRecipe = new Recipe(mockFile);

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

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.startOfWeek = 0; // Sunday
        settings.mealPlanFormat = MealPlanFormat.List;

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

    test('should add recipe to specific date in list format', async () => {
        // January 7th 2024 is a Sunday, so "Week of January 7th" is the correct week start
        fileContent = `# Week of January 7th
## Sunday
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const targetDate = moment('2024-01-08'); // A Monday in the week of January 7th
        await AddRecipeToMealPlanByDate(mockContext, mockRecipe, targetDate, 'Monday');

        expect(fileContent).toContain('## Monday\n- [[Test Recipe]]');
    });

    test('should add recipe to specific date in table format', async () => {
        // January 7th 2024 is a Sunday, so "Week of January 7th" is the correct week start
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 7th |  |  |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-10'); // Wednesday in the week of January 7th
        await AddRecipeToMealPlanByDate(mockContext, mockRecipe, targetDate, 'Wednesday');

        expect(fileContent).toContain('[[Test Recipe]]');
        // Verify the recipe was added to the table
        const dataRow = fileContent.split('\n').find((line) => line.includes('January 7th') && line.includes('Test Recipe'));
        expect(dataRow).toBeDefined();
    });

    test('should create new week section when adding to future week in list format', async () => {
        // January 7th 2024 is a Sunday
        fileContent = `# Week of January 7th
## Sunday
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        // Add to a future week (January 15th is a Monday in the week of January 14th)
        const targetDate = moment('2024-01-15');
        await AddRecipeToMealPlanByDate(mockContext, mockRecipe, targetDate, 'Monday');

        // Should create new week section
        expect(fileContent).toContain('# Week of January 14th');
        expect(fileContent).toContain('- [[Test Recipe]]');
    });

    test('should create new week row when adding to future week in table format', async () => {
        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.startOfWeek = 0;
        settings.mealPlanFormat = MealPlanFormat.Table;
        mockContext.settings = writable(settings);

        // January 7th 2024 is a Sunday
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 7th |  |  |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-15');
        await AddRecipeToMealPlanByDate(mockContext, mockRecipe, targetDate, 'Monday');

        // Should add new row for the new week
        expect(fileContent).toContain('January 14th');
        expect(fileContent).toContain('[[Test Recipe]]');
    });

    test('should not duplicate week section if it already exists', async () => {
        // January 7th 2024 is a Sunday
        fileContent = `# Week of January 7th
## Sunday
## Monday
- [[Existing Recipe]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const targetDate = moment('2024-01-08'); // Monday in week of January 7th
        await AddRecipeToMealPlanByDate(mockContext, mockRecipe, targetDate, 'Monday');

        // Should only have one "Week of January 7th" header
        const weekHeaderCount = (fileContent.match(/# Week of January 7th/g) || []).length;
        expect(weekHeaderCount).toBe(1);

        // Should have both recipes
        expect(fileContent).toContain('[[Existing Recipe]]');
        expect(fileContent).toContain('[[Test Recipe]]');
    });

    test('should handle adding to past weeks', async () => {
        // January 14th 2024 is a Sunday
        fileContent = `# Week of January 14th
## Sunday
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        // Add to a past week (January 3rd 2024 is Wednesday in week starting Dec 31st)
        const targetDate = moment('2024-01-03');
        await AddRecipeToMealPlanByDate(mockContext, mockRecipe, targetDate, 'Wednesday');

        // Should create the past week section (Dec 31st 2023 is a Sunday)
        expect(fileContent).toContain('December 31st');
        expect(fileContent).toContain('- [[Test Recipe]]');
    });
});

describe('RemoveRecipeFromMealPlan', () => {
    let mockContext: Context;
    let fileContent: string;

    beforeEach(() => {
        vi.clearAllMocks();

        fileContent = '';

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
        };

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

    test('should remove recipe from list format', async () => {
        fileContent = `# Week of January 7th
## Sunday
## Monday
- [[Test Recipe]]
- [[Another Recipe]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const targetDate = moment('2024-01-08'); // Monday in week of January 7th
        await RemoveRecipeFromMealPlan(mockContext, 'Test Recipe', targetDate);

        expect(fileContent).not.toContain('- [[Test Recipe]]');
        expect(fileContent).toContain('- [[Another Recipe]]');
    });

    test('should remove recipe from table format', async () => {
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 7th |  | [[Test Recipe]] |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-08'); // Monday in week of January 7th
        await RemoveRecipeFromMealPlan(mockContext, 'Test Recipe', targetDate);

        expect(fileContent).not.toContain('[[Test Recipe]]');
        // Table structure should be preserved
        expect(fileContent).toContain('| Week Start |');
        expect(fileContent).toContain('| January 7th |');
    });

    test('should remove recipe when multiple recipes in same day (table)', async () => {
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 7th |  | [[Recipe 1]]<br>[[Recipe 2]]<br>[[Recipe 3]] |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-08'); // Monday
        await RemoveRecipeFromMealPlan(mockContext, 'Recipe 2', targetDate);

        expect(fileContent).toContain('[[Recipe 1]]');
        expect(fileContent).not.toContain('[[Recipe 2]]');
        expect(fileContent).toContain('[[Recipe 3]]');
    });

    test('should remove first recipe from multiple in same day (table)', async () => {
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 7th |  | [[Recipe 1]]<br>[[Recipe 2]] |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-08'); // Monday
        await RemoveRecipeFromMealPlan(mockContext, 'Recipe 1', targetDate);

        expect(fileContent).not.toContain('[[Recipe 1]]');
        expect(fileContent).toContain('[[Recipe 2]]');
        expect(fileContent).not.toContain('<br>[[Recipe 2]]'); // Should clean up orphan <br>
    });

    test('should remove last recipe from multiple in same day (table)', async () => {
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 7th |  | [[Recipe 1]]<br>[[Recipe 2]] |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-08'); // Monday
        await RemoveRecipeFromMealPlan(mockContext, 'Recipe 2', targetDate);

        expect(fileContent).toContain('[[Recipe 1]]');
        expect(fileContent).not.toContain('[[Recipe 2]]');
        expect(fileContent).not.toContain('[[Recipe 1]]<br>'); // Should clean up trailing <br>
    });

    test('should handle list format with checkbox items', async () => {
        fileContent = `# Week of January 7th
## Sunday
## Monday
- [ ] [[Test Recipe]]
- [x] [[Completed Recipe]]
## Tuesday
`;

        const targetDate = moment('2024-01-08'); // Monday
        await RemoveRecipeFromMealPlan(mockContext, 'Test Recipe', targetDate);

        expect(fileContent).not.toContain('[[Test Recipe]]');
        expect(fileContent).toContain('- [x] [[Completed Recipe]]');
    });

    test('should not modify other weeks in list format', async () => {
        fileContent = `# Week of January 14th
## Sunday
## Monday
- [[Same Recipe Name]]
## Tuesday

# Week of January 7th
## Sunday
## Monday
- [[Same Recipe Name]]
## Tuesday
`;

        const targetDate = moment('2024-01-08'); // Monday in week of January 7th
        await RemoveRecipeFromMealPlan(mockContext, 'Same Recipe Name', targetDate);

        // Should remove from January 7th week only
        const jan14Section = fileContent.split('# Week of January 7th')[0];
        expect(jan14Section).toContain('[[Same Recipe Name]]');

        const jan7Section = fileContent.split('# Week of January 7th')[1];
        expect(jan7Section).not.toContain('[[Same Recipe Name]]');
    });

    test('should not modify other weeks in table format', async () => {
        fileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 14th |  | [[Same Recipe]] |  |  |  |  |  |
| January 7th |  | [[Same Recipe]] |  |  |  |  |  |
`;

        const targetDate = moment('2024-01-08'); // Monday in week of January 7th
        await RemoveRecipeFromMealPlan(mockContext, 'Same Recipe', targetDate);

        // Should still have recipe in January 14th
        expect(fileContent).toContain('| January 14th |  | [[Same Recipe]] |');
        // Should be removed from January 7th
        expect(fileContent).toMatch(/\| January 7th \|[^|]*\|[^[]*\|/);
    });

    test('should handle recipes with special characters', async () => {
        fileContent = `# Week of January 7th
## Sunday
## Monday
- [[Recipe (with) Parens]]
- [[Another Recipe]]
## Tuesday
`;

        const targetDate = moment('2024-01-08'); // Monday
        await RemoveRecipeFromMealPlan(mockContext, 'Recipe (with) Parens', targetDate);

        expect(fileContent).not.toContain('[[Recipe (with) Parens]]');
        expect(fileContent).toContain('[[Another Recipe]]');
    });
});

describe('convertListToTable', () => {
    const defaultDayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    test('should convert empty list format to table format', () => {
        const listContent = `# Week of January 8th
## Sunday
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const result = convertListToTable(listContent, defaultDayHeaders);

        expect(result).toContain('| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |');
        expect(result).toContain('|---|---|---|---|---|---|---|---|');
        expect(result).toContain('| January 8th |');
    });

    test('should convert list format with recipes to table format', () => {
        const listContent = `# Week of January 8th
## Sunday
## Monday
- [[Pasta Carbonara]]
## Tuesday
## Wednesday
- [[Chicken Tikka Masala]]
- [[Garlic Bread]]
## Thursday
## Friday
## Saturday
`;

        const result = convertListToTable(listContent, defaultDayHeaders);

        expect(result).toContain('| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |');
        expect(result).toContain('[[Pasta Carbonara]]');
        expect(result).toContain('[[Chicken Tikka Masala]]<br>[[Garlic Bread]]');
    });

    test('should convert multiple weeks from list to table', () => {
        const listContent = `# Week of January 15th
## Sunday
## Monday
- [[Recipe A]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday

# Week of January 8th
## Sunday
## Monday
- [[Recipe B]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const result = convertListToTable(listContent, defaultDayHeaders);

        expect(result).toContain('| January 15th |');
        expect(result).toContain('| January 8th |');
        expect(result).toContain('[[Recipe A]]');
        expect(result).toContain('[[Recipe B]]');
    });

    test('should handle list format with checkbox items', () => {
        const listContent = `# Week of January 8th
## Sunday
## Monday
- [ ] [[Unchecked Recipe]]
- [x] [[Checked Recipe]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const result = convertListToTable(listContent, defaultDayHeaders);

        expect(result).toContain('[[Unchecked Recipe]]');
        expect(result).toContain('[[Checked Recipe]]');
    });

    test('should handle list format with plain text items', () => {
        const listContent = `# Week of January 8th
## Sunday
## Monday
- [[Recipe Link]]
- Plain text item
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`;

        const result = convertListToTable(listContent, defaultDayHeaders);

        expect(result).toContain('[[Recipe Link]]');
        expect(result).toContain('Plain text item');
    });

    test('should respect custom day order (Monday start)', () => {
        const mondayStartHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const listContent = `# Week of January 8th
## Monday
- [[Recipe A]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
## Sunday
`;

        const result = convertListToTable(listContent, mondayStartHeaders);

        expect(result).toContain('| Week Start | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |');
        expect(result).toContain('[[Recipe A]]');
    });
});

describe('convertTableToList', () => {
    const defaultDayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    test('should convert empty table format to list format', () => {
        const tableContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  |  |  |  |  |  |  |
`;

        const result = convertTableToList(tableContent, defaultDayHeaders);

        expect(result).toContain('# Week of January 8th');
        expect(result).toContain('## Sunday');
        expect(result).toContain('## Monday');
        expect(result).toContain('## Tuesday');
        expect(result).toContain('## Wednesday');
        expect(result).toContain('## Thursday');
        expect(result).toContain('## Friday');
        expect(result).toContain('## Saturday');
    });

    test('should convert table format with recipes to list format', () => {
        const tableContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Pasta Carbonara]] |  | [[Chicken Tikka Masala]]<br>[[Garlic Bread]] |  |  |  |
`;

        const result = convertTableToList(tableContent, defaultDayHeaders);

        expect(result).toContain('# Week of January 8th');
        expect(result).toContain('## Monday\n- [[Pasta Carbonara]]');
        expect(result).toContain('## Wednesday\n- [[Chicken Tikka Masala]]\n- [[Garlic Bread]]');
    });

    test('should convert multiple weeks from table to list', () => {
        const tableContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 15th |  | [[Recipe A]] |  |  |  |  |  |
| January 8th |  | [[Recipe B]] |  |  |  |  |  |
`;

        const result = convertTableToList(tableContent, defaultDayHeaders);

        expect(result).toContain('# Week of January 15th');
        expect(result).toContain('# Week of January 8th');
        expect(result).toContain('[[Recipe A]]');
        expect(result).toContain('[[Recipe B]]');
    });

    test('should handle table with plain text items', () => {
        const tableContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Recipe Link]]<br>Plain text item |  |  |  |  |  |
`;

        const result = convertTableToList(tableContent, defaultDayHeaders);

        expect(result).toContain('- [[Recipe Link]]');
        expect(result).toContain('- Plain text item');
    });

    test('should respect custom day order (Monday start)', () => {
        const mondayStartHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const tableContent = `| Week Start | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday |
|---|---|---|---|---|---|---|---|
| January 8th | [[Recipe A]] |  |  |  |  |  |  |
`;

        const result = convertTableToList(tableContent, mondayStartHeaders);

        expect(result).toContain('# Week of January 8th');
        expect(result).toContain('## Monday\n- [[Recipe A]]');
        // Day order should match the headers
        const mondayIndex = result.indexOf('## Monday');
        const tuesdayIndex = result.indexOf('## Tuesday');
        expect(mondayIndex).toBeLessThan(tuesdayIndex);
    });

    test('should preserve order of items in cell', () => {
        const tableContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[First]]<br>[[Second]]<br>[[Third]] |  |  |  |  |  |
`;

        const result = convertTableToList(tableContent, defaultDayHeaders);

        const firstIndex = result.indexOf('[[First]]');
        const secondIndex = result.indexOf('[[Second]]');
        const thirdIndex = result.indexOf('[[Third]]');

        expect(firstIndex).toBeLessThan(secondIndex);
        expect(secondIndex).toBeLessThan(thirdIndex);
    });
});

describe('Format conversion round-trip', () => {
    const defaultDayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    test('list -> table -> list should preserve recipes', () => {
        const originalList = `# Week of January 8th
## Sunday
## Monday
- [[Recipe A]]
- [[Recipe B]]
## Tuesday
## Wednesday
- [[Recipe C]]
## Thursday
## Friday
## Saturday
`;

        const table = convertListToTable(originalList, defaultDayHeaders);
        const backToList = convertTableToList(table, defaultDayHeaders);

        expect(backToList).toContain('[[Recipe A]]');
        expect(backToList).toContain('[[Recipe B]]');
        expect(backToList).toContain('[[Recipe C]]');
    });

    test('table -> list -> table should preserve recipes', () => {
        const originalTable = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Recipe A]]<br>[[Recipe B]] |  | [[Recipe C]] |  |  |  |
`;

        const list = convertTableToList(originalTable, defaultDayHeaders);
        const backToTable = convertListToTable(list, defaultDayHeaders);

        expect(backToTable).toContain('[[Recipe A]]');
        expect(backToTable).toContain('[[Recipe B]]');
        expect(backToTable).toContain('[[Recipe C]]');
    });
});

describe('detectMealPlanFormat', () => {
    test('should detect list format', () => {
        const content = `# Week of January 8th
## Sunday
## Monday
- [[Recipe]]
## Tuesday
`;

        expect(detectMealPlanFormat(content)).toBe('list');
    });

    test('should detect table format', () => {
        const content = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Recipe]] |  |  |  |  |  |
`;

        expect(detectMealPlanFormat(content)).toBe('table');
    });

    test('should return null for empty content', () => {
        expect(detectMealPlanFormat('')).toBeNull();
        expect(detectMealPlanFormat('   ')).toBeNull();
    });

    test('should return null for content without meal plan structure', () => {
        const content = `# Some other heading
This is just random content without meal plan structure.
`;

        expect(detectMealPlanFormat(content)).toBeNull();
    });

    test('should handle content with leading whitespace', () => {
        const listContent = `
# Week of January 8th
## Sunday
`;

        const tableContent = `
| Week Start | Sunday | Monday |
|---|---|---|
| January 8th |  |  |
`;

        // List format with leading whitespace should still be detected (pattern uses multiline mode)
        expect(detectMealPlanFormat(listContent)).toBe('list');

        // Table format with leading whitespace should be detected after trimming
        expect(detectMealPlanFormat(tableContent)).toBe('table');
    });
});
