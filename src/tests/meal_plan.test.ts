import type { TFile } from 'obsidian';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '../context.ts';
import { AddRecipeToMealPlan, OpenMealPlanNote } from '../meal_plan/plan.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealSettings } from '../settings/settings.ts';
import * as Utils from '../utils/utils.ts';

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
        } as TFile;
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

        expect(fileContent).toBe(`# Week of January 8th
## Sunday
## Monday
## Tuesday
## Wednesday
- [[Test Recipe]]
## Thursday
## Friday
## Saturday
`);
    });

    test('should add multiple recipes to same day in list format', async () => {
        fileContent = `# Week of January 8th
## Sunday
## Monday
- [[First Recipe]]
## Tuesday
`;

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Monday');

        expect(fileContent).toBe(`# Week of January 8th
## Sunday
## Monday
- [[Test Recipe]]
- [[First Recipe]]
## Tuesday
`);
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

        expect(fileContent).toBe(`# Week of January 8th
## Sunday
## Monday
- [[Test Recipe]]
## Tuesday

# Week of January 1st
## Sunday
## Monday
- [[Old Recipe]]
## Tuesday
`);
    });

    test('should create meal plan note content if the note is empty', async () => {
        fileContent = '';

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Monday');

        expect(fileContent).toBe(`# Week of January 8th
## Sunday
## Monday
- [[Test Recipe]]
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`);
    });

    test('should add week header if file has existing content', async () => {
        fileContent = 'Some existing content\n';

        await AddRecipeToMealPlan(mockContext, mockRecipe, 'Sunday');

        expect(fileContent).toBe(`# Week of January 8th
## Sunday
- [[Test Recipe]]
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
Some existing content
`);
    });
});

describe('OpenMealPlanNote', () => {
    let mockContext: Context;
    let fileContent: string;
    let createdFile: boolean;
    let openedLink: string | null;
    let activeLeafSet: boolean;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Utils, 'GetCurrentWeek').mockReturnValue('January 8th');

        fileContent = '';
        createdFile = false;
        openedLink = null;
        activeLeafSet = false;

        const mockVault = {
            getFileByPath: vi.fn((path) => {
                if (path === 'Meal Plan.md' && createdFile) {
                    return {
                        vault: {
                            process: vi.fn((_file, callback) => {
                                fileContent = callback(fileContent);
                                return Promise.resolve();
                            }),
                        },
                    };
                }
                return null;
            }),
            create: vi.fn().mockImplementation(() => {
                createdFile = true;
                return Promise.resolve({});
            }),
            process: vi.fn((_file, callback) => {
                fileContent = callback(fileContent);
                return Promise.resolve();
            }),
        };

        const mockWorkspace = {
            iterateAllLeaves: vi.fn(() => {
                // Simulate no existing leaf found
            }),
            openLinkText: vi.fn((path) => {
                openedLink = path;
                return Promise.resolve();
            }),
            setActiveLeaf: vi.fn(() => {
                activeLeafSet = true;
            }),
        };

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.startOfWeek = 0;

        mockContext = {
            settings: writable(settings),
            app: {
                vault: mockVault,
                workspace: mockWorkspace,
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

    test('should create and open meal plan note', async () => {
        await OpenMealPlanNote(mockContext, 'Meal Plan');

        expect(createdFile).toBe(true);
        expect(openedLink).toBe('Meal Plan.md');
        expect(fileContent).toBe(`# Week of January 8th
## Sunday
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
`);
    });

    test('should open existing meal plan note without recreating', async () => {
        createdFile = true;
        fileContent = `# Week of January 8th
## Sunday
`;

        await OpenMealPlanNote(mockContext, 'Meal Plan.md');

        expect(fileContent).toBe(`# Week of January 8th
## Sunday
`);
    });

    test('should set active leaf if note is already open', async () => {
        createdFile = true;

        const mockWorkspace = mockContext.app.workspace;
        mockWorkspace.iterateAllLeaves = vi.fn((callback) => {
            // Simulate finding an existing leaf
            callback({
                getDisplayText: () => 'Meal Plan',
            });
        });

        await OpenMealPlanNote(mockContext, 'Meal Plan');

        expect(activeLeafSet).toBe(true);
        expect(openedLink).toBe(null);
    });

    test('should handle different start of week', async () => {
        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.startOfWeek = 1; // Monday
        mockContext.settings = writable(settings);

        await OpenMealPlanNote(mockContext, 'Meal Plan');

        expect(fileContent).toBe(`# Week of January 8th
## Monday
## Tuesday
## Wednesday
## Thursday
## Friday
## Saturday
## Sunday
`);
    });
});
