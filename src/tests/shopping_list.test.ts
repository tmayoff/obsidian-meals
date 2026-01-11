import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '../context.ts';
import { AddMealPlanToShoppingList, processSelectedWeeks } from '../meal_plan/shopping_list.ts';
import { extractWeeksFromMealPlan } from '../meal_plan/week_extractor.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealSettings } from '../settings/settings.ts';
import type { Ingredient } from '../types.ts';
import * as Utils from '../utils/utils.ts';

vi.mock('../meal_plan/WeekSelector.svelte', () => {
    return {
        WeekSelectorModal: {
            open: vi.fn(),
        },
    };
});

describe('AddMealPlanToShoppingList', () => {
    let mockContext: Context;
    let mealPlanFileContent: string;
    let shoppingListFileContent: string;
    let mockRecipes: Recipe[];
    let mockRecipe1File: any;
    let mockRecipe2File: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock system time to January 10, 2025 (within "Week of January 8th")
        // This ensures tests work regardless of when they're run
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-10T12:00:00'));

        // Mock GetCurrentWeek to return a fixed date
        vi.spyOn(Utils, 'GetCurrentWeek').mockReturnValue('January 8th');

        // Reset file contents
        mealPlanFileContent = '';
        shoppingListFileContent = '';

        // Create mock recipes with ingredients
        mockRecipe1File = {
            path: 'recipes/Pasta.md',
            basename: 'Pasta',
        } as any;
        const recipe1 = new Recipe(mockRecipe1File);
        recipe1.ingredients = [
            { description: 'pasta', quantity: 200, unitOfMeasure: 'g' },
            { description: 'tomato sauce', quantity: 1, unitOfMeasure: 'cup' },
        ] as Ingredient[];

        mockRecipe2File = {
            path: 'recipes/Salad.md',
            basename: 'Salad',
        } as any;
        const recipe2 = new Recipe(mockRecipe2File);
        recipe2.ingredients = [
            { description: 'lettuce', quantity: 1, unitOfMeasure: 'head' },
            { description: 'tomatoes', quantity: 2, unitOfMeasure: '' },
        ] as Ingredient[];

        mockRecipes = [recipe1, recipe2];

        // Create mock metadata cache
        const mockMetadataCache = {
            getFileCache: vi.fn((file) => {
                if (file.path === 'Meal Plan.md') {
                    // Will be set per test
                    return {
                        headings: [],
                        links: [],
                        listItems: [],
                    };
                }
                if (file.path === 'Shopping List.md') {
                    return {
                        headings: [
                            {
                                heading: 'Food',
                                level: 1,
                                position: {
                                    start: { offset: 0 },
                                    end: { offset: 7 },
                                },
                            },
                        ],
                        listItems: [],
                    };
                }
                return null;
            }),
            getFirstLinkpathDest: vi.fn((link, _sourcePath) => {
                if (link === 'Pasta') {
                    return mockRecipe1File;
                }
                if (link === 'Salad') {
                    return mockRecipe2File;
                }
                return null;
            }),
        };

        // Create mock vault
        const mockVault = {
            getFileByPath: vi.fn((path) => {
                if (path === 'Meal Plan.md') {
                    return {
                        path: 'Meal Plan.md',
                        basename: 'Meal Plan',
                    };
                }
                if (path === 'Shopping List.md') {
                    return {
                        path: 'Shopping List.md',
                        basename: 'Shopping List',
                    };
                }
                return null;
            }),
            read: vi.fn(async (file) => {
                if (file.path === 'Shopping List.md') {
                    return shoppingListFileContent;
                }
                if (file.path === 'Meal Plan.md') {
                    return mealPlanFileContent;
                }
                return '';
            }),
            create: vi.fn().mockResolvedValue({}),
            process: vi.fn((file, callback) => {
                if (file.path === 'Shopping List.md') {
                    shoppingListFileContent = callback(shoppingListFileContent);
                }
                return Promise.resolve();
            }),
        };

        // Create mock context
        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.shoppingListNote = 'Shopping List';
        settings.startOfWeek = 0; // Sunday

        mockContext = {
            settings: writable(settings),
            recipes: writable(mockRecipes),
            app: {
                vault: mockVault,
                metadataCache: mockMetadataCache,
            } as any,
            plugin: {} as any,
            ingredients: {} as any,
            getRecipeFolder: vi.fn(),
            isInRecipeFolder: vi.fn(),
            loadRecipes: vi.fn(),
            debugMode: vi.fn().mockReturnValue(false),
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('should extract recipes from list format and add to shopping list', async () => {
        // Setup meal plan in list format
        mealPlanFileContent = `# Week of January 8th
## Sunday
## Monday
- [[Pasta]]
## Tuesday
- [[Salad]]
## Wednesday
## Thursday
## Friday
## Saturday
`;

        // Setup metadata cache for list format
        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [
                        {
                            heading: 'Week of January 8th',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 23, offset: 23 },
                            },
                        },
                    ],
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 3, col: 2, offset: 50 },
                                end: { line: 3, col: 11, offset: 59 },
                            },
                        },
                        {
                            link: 'Salad',
                            original: '[[Salad]]',
                            position: {
                                start: { line: 5, col: 2, offset: 80 },
                                end: { line: 5, col: 11, offset: 89 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        // Setup initial shopping list content
        shoppingListFileContent = '# Food\n';

        await AddMealPlanToShoppingList(mockContext);

        // Verify shopping list contains week header
        expect(shoppingListFileContent).toContain('## Week of January 8th');

        // Verify shopping list contains recipe headers
        expect(shoppingListFileContent).toContain('### Pasta');
        expect(shoppingListFileContent).toContain('### Salad');

        // Verify shopping list contains ingredients from both recipes
        expect(shoppingListFileContent).toContain('pasta');
        expect(shoppingListFileContent).toContain('tomato sauce');
        expect(shoppingListFileContent).toContain('lettuce');
        expect(shoppingListFileContent).toContain('tomatoes');

        // Verify format
        expect(shoppingListFileContent).toContain('- [ ]');
    });

    test('should extract recipes from table format and add to shopping list', async () => {
        // Setup meal plan in table format
        mealPlanFileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Pasta]] | [[Salad]] |  |  |  |  |
| January 1st |  |  |  |  |  |  |  |
`;

        // Setup metadata cache for table format
        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [], // No H1 headings in table format
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 2, col: 23, offset: 150 },
                                end: { line: 2, col: 32, offset: 159 },
                            },
                        },
                        {
                            link: 'Salad',
                            original: '[[Salad]]',
                            position: {
                                start: { line: 2, col: 35, offset: 162 },
                                end: { line: 2, col: 44, offset: 171 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        // Setup initial shopping list content
        shoppingListFileContent = '# Food\n';

        await AddMealPlanToShoppingList(mockContext);

        // Verify shopping list contains week header
        expect(shoppingListFileContent).toContain('## Week of January 8th');

        // Verify shopping list contains recipe headers
        expect(shoppingListFileContent).toContain('### Pasta');
        expect(shoppingListFileContent).toContain('### Salad');

        // Verify shopping list contains ingredients from both recipes
        expect(shoppingListFileContent).toContain('pasta');
        expect(shoppingListFileContent).toContain('tomato sauce');
        expect(shoppingListFileContent).toContain('lettuce');
        expect(shoppingListFileContent).toContain('tomatoes');

        // Verify format
        expect(shoppingListFileContent).toContain('- [ ]');
    });

    test('should only extract recipes from current week in list format', async () => {
        // Setup meal plan with multiple weeks
        mealPlanFileContent = `# Week of January 8th
## Sunday
## Monday
- [[Pasta]]

# Week of January 1st
## Sunday
## Monday
- [[Salad]]
`;

        // Setup metadata cache
        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [
                        {
                            heading: 'Week of January 8th',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 23, offset: 23 },
                            },
                        },
                        {
                            heading: 'Week of January 1st',
                            level: 1,
                            position: {
                                start: { line: 5, col: 0, offset: 60 },
                                end: { line: 5, col: 23, offset: 83 },
                            },
                        },
                    ],
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 3, col: 2, offset: 50 },
                                end: { line: 3, col: 11, offset: 59 },
                            },
                        },
                        {
                            link: 'Salad',
                            original: '[[Salad]]',
                            position: {
                                start: { line: 8, col: 2, offset: 110 },
                                end: { line: 8, col: 11, offset: 119 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        shoppingListFileContent = '# Food\n';

        await AddMealPlanToShoppingList(mockContext);

        // Should only include ingredients from current week (Pasta)
        expect(shoppingListFileContent).toContain('pasta');
        expect(shoppingListFileContent).toContain('tomato sauce');

        // Should NOT include ingredients from old week (Salad)
        expect(shoppingListFileContent).not.toContain('lettuce');
        expect(shoppingListFileContent).not.toContain('tomatoes');
    });

    test('should only extract recipes from current week in table format', async () => {
        // Setup meal plan in table format with multiple weeks
        mealPlanFileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 8th |  | [[Pasta]] |  |  |  |  |  |
| January 1st |  | [[Salad]] |  |  |  |  |  |
`;

        // Setup metadata cache
        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                // In table format, links are in cells
                // January 8th row starts at offset ~150, January 1st row at ~220
                return {
                    headings: [], // No H1 headings in table format
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 2, col: 23, offset: 150 },
                                end: { line: 2, col: 32, offset: 159 },
                            },
                        },
                        {
                            link: 'Salad',
                            original: '[[Salad]]',
                            position: {
                                start: { line: 3, col: 23, offset: 220 },
                                end: { line: 3, col: 32, offset: 229 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        shoppingListFileContent = '# Food\n';

        await AddMealPlanToShoppingList(mockContext);

        // Should only include ingredients from current week (Pasta)
        expect(shoppingListFileContent).toContain('pasta');
        expect(shoppingListFileContent).toContain('tomato sauce');

        // Should NOT include ingredients from old week (Salad)
        expect(shoppingListFileContent).not.toContain('lettuce');
        expect(shoppingListFileContent).not.toContain('tomatoes');
    });

    test('should merge duplicate ingredients with same unit', async () => {
        // Create a third recipe with overlapping ingredients
        const mockRecipe3File = {
            path: 'recipes/Pasta2.md',
            basename: 'Pasta2',
        } as any;
        const recipe3 = new Recipe(mockRecipe3File);
        recipe3.ingredients = [{ description: 'pasta', quantity: 100, unitOfMeasure: 'g' }] as Ingredient[];

        mockRecipes.push(recipe3);
        mockContext.recipes = writable(mockRecipes);

        // Setup meal plan
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]
- [[Pasta2]]
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [
                        {
                            heading: 'Week of January 8th',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 23, offset: 23 },
                            },
                        },
                    ],
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 2, col: 2, offset: 40 },
                                end: { line: 2, col: 11, offset: 49 },
                            },
                        },
                        {
                            link: 'Pasta2',
                            original: '[[Pasta2]]',
                            position: {
                                start: { line: 3, col: 2, offset: 52 },
                                end: { line: 3, col: 12, offset: 62 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        mockMetadataCache.getFirstLinkpathDest = vi.fn((link, _sourcePath) => {
            if (link === 'Pasta') return mockRecipe1File;
            if (link === 'Pasta2') return mockRecipe3File;
            return null;
        });

        shoppingListFileContent = '# Food\n';

        await AddMealPlanToShoppingList(mockContext);

        // Should have separate sections for each recipe
        expect(shoppingListFileContent).toContain('### Pasta');
        expect(shoppingListFileContent).toContain('### Pasta2');

        // Should keep pasta quantities separate (200g in Pasta, 100g in Pasta2)
        expect(shoppingListFileContent).toContain('pasta 200 g');
        expect(shoppingListFileContent).toContain('pasta 100 g');

        // Count how many times "pasta" appears (should be 4: 2 recipe headings + 2 ingredients)
        const pastaMatches = shoppingListFileContent.match(/pasta/gi);
        expect(pastaMatches).toHaveLength(4);
    });
});

describe('Multi-week shopping list', () => {
    let mockContext: Context;
    let mealPlanFileContent: string;
    let shoppingListFileContent: string;
    let mockRecipes: Recipe[];
    let mockRecipe1File: any;
    let mockRecipe2File: any;
    let mockRecipe3File: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock system time to January 10, 2025 (within "Week of January 8th")
        // This ensures tests work regardless of when they're run
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-10T12:00:00'));

        // Mock GetCurrentWeek to return a fixed date
        vi.spyOn(Utils, 'GetCurrentWeek').mockReturnValue('January 8th');

        // Reset file contents
        mealPlanFileContent = '';
        shoppingListFileContent = '';

        // Create mock recipes with ingredients
        mockRecipe1File = {
            path: 'recipes/Pasta.md',
            basename: 'Pasta',
        } as any;
        const recipe1 = new Recipe(mockRecipe1File);
        recipe1.ingredients = [
            { description: 'pasta', quantity: 200, unitOfMeasure: 'g' },
            { description: 'tomato sauce', quantity: 1, unitOfMeasure: 'cup' },
        ] as Ingredient[];

        mockRecipe2File = {
            path: 'recipes/Salad.md',
            basename: 'Salad',
        } as any;
        const recipe2 = new Recipe(mockRecipe2File);
        recipe2.ingredients = [
            { description: 'lettuce', quantity: 1, unitOfMeasure: 'head' },
            { description: 'tomatoes', quantity: 2, unitOfMeasure: '' },
        ] as Ingredient[];

        mockRecipe3File = {
            path: 'recipes/Soup.md',
            basename: 'Soup',
        } as any;
        const recipe3 = new Recipe(mockRecipe3File);
        recipe3.ingredients = [
            { description: 'chicken broth', quantity: 4, unitOfMeasure: 'cup' },
            { description: 'carrots', quantity: 2, unitOfMeasure: '' },
        ] as Ingredient[];

        mockRecipes = [recipe1, recipe2, recipe3];

        // Create mock metadata cache
        const mockMetadataCache = {
            getFileCache: vi.fn((file) => {
                if (file.path === 'Meal Plan.md') {
                    return {
                        headings: [],
                        links: [],
                        listItems: [],
                    };
                }
                if (file.path === 'Shopping List.md') {
                    return {
                        headings: [
                            {
                                heading: 'Food',
                                level: 1,
                                position: {
                                    start: { offset: 0 },
                                    end: { offset: 7 },
                                },
                            },
                        ],
                        listItems: [],
                    };
                }
                return null;
            }),
            getFirstLinkpathDest: vi.fn((link, _sourcePath) => {
                if (link === 'Pasta') return mockRecipe1File;
                if (link === 'Salad') return mockRecipe2File;
                if (link === 'Soup') return mockRecipe3File;
                return null;
            }),
        };

        // Create mock vault
        const mockVault = {
            getFileByPath: vi.fn((path) => {
                if (path === 'Meal Plan.md') {
                    return {
                        path: 'Meal Plan.md',
                        basename: 'Meal Plan',
                    };
                }
                if (path === 'Shopping List.md') {
                    return {
                        path: 'Shopping List.md',
                        basename: 'Shopping List',
                    };
                }
                return null;
            }),
            read: vi.fn(async (file) => {
                if (file.path === 'Shopping List.md') {
                    return shoppingListFileContent;
                }
                if (file.path === 'Meal Plan.md') {
                    return mealPlanFileContent;
                }
                return '';
            }),
            create: vi.fn().mockResolvedValue({}),
            process: vi.fn((file, callback) => {
                if (file.path === 'Shopping List.md') {
                    shoppingListFileContent = callback(shoppingListFileContent);
                }
                return Promise.resolve();
            }),
        };

        // Create mock context
        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.shoppingListNote = 'Shopping List';
        settings.startOfWeek = 0; // Sunday

        mockContext = {
            settings: writable(settings),
            recipes: writable(mockRecipes),
            app: {
                vault: mockVault,
                metadataCache: mockMetadataCache,
            } as any,
            plugin: {} as any,
            ingredients: {} as any,
            getRecipeFolder: vi.fn(),
            isInRecipeFolder: vi.fn(),
            loadRecipes: vi.fn(),
            debugMode: vi.fn().mockReturnValue(false),
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('should extract multiple weeks from list format', async () => {
        // Setup meal plan with three weeks (one past, two future)
        mealPlanFileContent = `# Week of January 1st
## Monday
- [[Soup]]

# Week of January 8th
## Monday
- [[Pasta]]

# Week of January 15th
## Tuesday
- [[Salad]]
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [
                        {
                            heading: 'Week of January 1st',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 23, offset: 23 },
                            },
                        },
                        {
                            heading: 'Week of January 8th',
                            level: 1,
                            position: {
                                start: { line: 4, col: 0, offset: 50 },
                                end: { line: 4, col: 23, offset: 73 },
                            },
                        },
                        {
                            heading: 'Week of January 15th',
                            level: 1,
                            position: {
                                start: { line: 8, col: 0, offset: 100 },
                                end: { line: 8, col: 24, offset: 124 },
                            },
                        },
                    ],
                    links: [],
                };
            }
            return null;
        });

        const mealPlanFile = mockContext.app.vault.getFileByPath('Meal Plan.md') as any;
        const weeks = await extractWeeksFromMealPlan(mockContext, mealPlanFile, 0);

        // Should only return current and future weeks (not January 1st)
        expect(weeks).toHaveLength(2);
        expect(weeks[0].dateString).toBe('January 8th');
        expect(weeks[1].dateString).toBe('January 15th');
    });

    test('should extract multiple weeks from table format', async () => {
        // Setup meal plan in table format
        mealPlanFileContent = `| Week Start | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|---|---|---|---|---|---|---|---|
| January 1st |  | [[Soup]] |  |  |  |  |  |
| January 8th |  | [[Pasta]] |  |  |  |  |  |
| January 15th |  |  | [[Salad]] |  |  |  |  |
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [], // No headings in table format
                    links: [],
                };
            }
            return null;
        });

        const mealPlanFile = mockContext.app.vault.getFileByPath('Meal Plan.md') as any;
        const weeks = await extractWeeksFromMealPlan(mockContext, mealPlanFile, 0);

        // Should only return current and future weeks
        expect(weeks).toHaveLength(2);
        expect(weeks[0].dateString).toBe('January 8th');
        expect(weeks[1].dateString).toBe('January 15th');
    });

    test('should group ingredients by week with headers', async () => {
        // Setup meal plan with two future weeks
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]

# Week of January 15th
## Tuesday
- [[Salad]]
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [
                        {
                            heading: 'Week of January 8th',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 23, offset: 23 },
                            },
                        },
                        {
                            heading: 'Week of January 15th',
                            level: 1,
                            position: {
                                start: { line: 4, col: 0, offset: 50 },
                                end: { line: 4, col: 24, offset: 74 },
                            },
                        },
                    ],
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 2, col: 2, offset: 40 },
                                end: { line: 2, col: 11, offset: 49 },
                            },
                        },
                        {
                            link: 'Salad',
                            original: '[[Salad]]',
                            position: {
                                start: { line: 6, col: 2, offset: 90 },
                                end: { line: 6, col: 11, offset: 99 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        shoppingListFileContent = '# Food\n';

        const mealPlanFile = mockContext.app.vault.getFileByPath('Meal Plan.md') as any;
        const weeks = await extractWeeksFromMealPlan(mockContext, mealPlanFile, 0);

        await processSelectedWeeks(mockContext, mealPlanFile, weeks);

        // Should have week headers
        expect(shoppingListFileContent).toContain('## Week of January 8th');
        expect(shoppingListFileContent).toContain('## Week of January 15th');

        // Should have recipe headers within each week
        expect(shoppingListFileContent).toContain('### Pasta');
        expect(shoppingListFileContent).toContain('### Salad');

        // Should have ingredients under correct headers
        expect(shoppingListFileContent).toContain('pasta');
        expect(shoppingListFileContent).toContain('tomato sauce');
        expect(shoppingListFileContent).toContain('lettuce');
        expect(shoppingListFileContent).toContain('tomatoes');

        // Verify ordering: January 8th ingredients should come before January 15th
        const pastaIndex = shoppingListFileContent.indexOf('pasta');
        const lettuceIndex = shoppingListFileContent.indexOf('lettuce');
        const week8Index = shoppingListFileContent.indexOf('## Week of January 8th');
        const week15Index = shoppingListFileContent.indexOf('## Week of January 15th');

        expect(week8Index).toBeLessThan(pastaIndex);
        expect(pastaIndex).toBeLessThan(week15Index);
        expect(week15Index).toBeLessThan(lettuceIndex);
    });

    test('should not merge ingredients across weeks', async () => {
        // Setup meal plan with pasta in both weeks
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]

# Week of January 15th
## Tuesday
- [[Pasta]]
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Meal Plan.md') {
                return {
                    headings: [
                        {
                            heading: 'Week of January 8th',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 23, offset: 23 },
                            },
                        },
                        {
                            heading: 'Week of January 15th',
                            level: 1,
                            position: {
                                start: { line: 4, col: 0, offset: 50 },
                                end: { line: 4, col: 24, offset: 74 },
                            },
                        },
                    ],
                    links: [
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 2, col: 2, offset: 40 },
                                end: { line: 2, col: 11, offset: 49 },
                            },
                        },
                        {
                            link: 'Pasta',
                            original: '[[Pasta]]',
                            position: {
                                start: { line: 6, col: 2, offset: 90 },
                                end: { line: 6, col: 11, offset: 99 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            if (file.path === 'Shopping List.md') {
                return {
                    headings: [
                        {
                            heading: 'Food',
                            level: 1,
                            position: {
                                start: { line: 0, col: 0, offset: 0 },
                                end: { line: 0, col: 7, offset: 7 },
                            },
                        },
                    ],
                    listItems: [],
                };
            }
            return null;
        });

        shoppingListFileContent = '# Food\n';

        const mealPlanFile = mockContext.app.vault.getFileByPath('Meal Plan.md') as any;
        const weeks = await extractWeeksFromMealPlan(mockContext, mealPlanFile, 0);

        await processSelectedWeeks(mockContext, mealPlanFile, weeks);

        // Should have pasta listed 4 times total (twice per week: recipe heading + ingredient)
        // Each week has "### Pasta" and "- [ ] pasta 200 g"
        const pastaMatches = shoppingListFileContent.match(/pasta/gi);
        expect(pastaMatches).toHaveLength(4);

        // Each occurrence should have quantity 200 (not 400 if merged)
        const quantity200Matches = shoppingListFileContent.match(/200/g);
        expect(quantity200Matches).toHaveLength(2);
    });
});
