import type { TFile } from 'obsidian';
import { writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '../context.ts';
import { AddFileToShoppingList, AddMealPlanToShoppingList, ClearCheckedIngredients } from '../meal_plan/shopping_list.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealSettings, ShoppingListIgnoreBehaviour } from '../settings/settings.ts';
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
    let mockRecipe1File: TFile;
    let mockRecipe2File: TFile;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock GetCurrentWeek to return a fixed date
        vi.spyOn(Utils, 'GetCurrentWeek').mockReturnValue('January 8th');

        // Reset file contents
        mealPlanFileContent = '';
        shoppingListFileContent = '';

        // Create mock recipes with ingredients
        mockRecipe1File = {
            path: 'recipes/Pasta.md',
            basename: 'Pasta',
        } as TFile;
        const recipe1 = new Recipe(mockRecipe1File);
        recipe1.ingredients = [
            { description: 'pasta', quantity: 200, unitOfMeasure: 'g' },
            { description: 'tomato sauce', quantity: 1, unitOfMeasure: 'cup' },
        ] as Ingredient[];

        mockRecipe2File = {
            path: 'recipes/Salad.md',
            basename: 'Salad',
        } as TFile;
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
        expect(shoppingListFileContent).toBe(`# Food

- [ ] lettuce 1 head
- [ ] pasta 200 g
- [ ] tomato sauce 1 cup
- [ ] tomatoes 2 
`);
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
        expect(shoppingListFileContent).toBe(`# Food

- [ ] pasta 200 g
- [ ] tomato sauce 1 cup
`);
    });

    test('should filter ingredients based on ignore list with Exact behavior', async () => {
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]
`;

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.shoppingListNote = 'Shopping List';
        settings.startOfWeek = 0;
        settings.shoppingListIgnore = ['pasta'];
        settings.shoppingListIgnoreBehaviour = ShoppingListIgnoreBehaviour.Exact;
        mockContext.settings = writable(settings);

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
                                start: { line: 2, col: 2, offset: 37 },
                                end: { line: 2, col: 11, offset: 46 },
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

        // pasta should be filtered out, only tomato sauce should remain
        expect(shoppingListFileContent).toBe(`# Food

- [ ] tomato sauce 1 cup
`);
    });

    test('should filter ingredients based on ignore list with Partial behavior', async () => {
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]
`;

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.shoppingListNote = 'Shopping List';
        settings.startOfWeek = 0;
        settings.shoppingListIgnore = ['sauce'];
        settings.shoppingListIgnoreBehaviour = ShoppingListIgnoreBehaviour.Partial;
        mockContext.settings = writable(settings);

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
                                start: { line: 2, col: 2, offset: 37 },
                                end: { line: 2, col: 11, offset: 46 },
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

        // tomato sauce should be filtered out because it contains "sauce"
        expect(shoppingListFileContent).toBe(`# Food

- [ ] pasta 200 g
`);
    });

    test('should filter ingredients based on ignore list with Wildcard behavior', async () => {
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]
`;

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.shoppingListNote = 'Shopping List';
        settings.startOfWeek = 0;
        settings.shoppingListIgnore = ['*sauce'];
        settings.shoppingListIgnoreBehaviour = ShoppingListIgnoreBehaviour.Wildcard;
        mockContext.settings = writable(settings);

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
                                start: { line: 2, col: 2, offset: 37 },
                                end: { line: 2, col: 11, offset: 46 },
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

        // tomato sauce should be filtered out because it ends with "sauce"
        expect(shoppingListFileContent).toBe(`# Food

- [ ] pasta 200 g
`);
    });

    test('should filter ingredients based on ignore list with Regex behavior', async () => {
        mealPlanFileContent = `# Week of January 8th
## Monday
- [[Pasta]]
`;

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.shoppingListNote = 'Shopping List';
        settings.startOfWeek = 0;
        settings.shoppingListIgnore = ['^tomato'];
        settings.shoppingListIgnoreBehaviour = ShoppingListIgnoreBehaviour.Regex;
        mockContext.settings = writable(settings);

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
                                start: { line: 2, col: 2, offset: 37 },
                                end: { line: 2, col: 11, offset: 46 },
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

        // tomato sauce should be filtered out because it starts with "tomato"
        expect(shoppingListFileContent).toBe(`# Food

- [ ] pasta 200 g
`);
    });
});

describe('ClearCheckedIngredients', () => {
    let mockContext: Context;
    let shoppingListFileContent: string;

    beforeEach(() => {
        vi.clearAllMocks();
        shoppingListFileContent = '';

        const mockVault = {
            getFileByPath: vi.fn((path) => {
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
                return '';
            }),
            modify: vi.fn((file, content) => {
                if (file.path === 'Shopping List.md') {
                    shoppingListFileContent = content;
                }
                return Promise.resolve();
            }),
        };

        const settings = new MealSettings();
        settings.shoppingListNote = 'Shopping List';

        mockContext = {
            settings: writable(settings),
            app: {
                vault: mockVault,
                metadataCache: {
                    getFileCache: vi.fn(),
                },
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

    test('should remove checked items from shopping list', async () => {
        shoppingListFileContent = `# Food
- [ ] pasta 200 g
- [x] tomato sauce 1 cup
- [ ] lettuce 1 head
- [x] tomatoes 2
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Shopping List.md') {
                return {
                    listItems: [
                        {
                            task: ' ',
                            parent: -7,
                            position: {
                                start: { offset: 7, line: 1, col: 0 },
                                end: { offset: 24, line: 1, col: 17 },
                            },
                        },
                        {
                            task: 'x',
                            parent: -25,
                            position: {
                                start: { offset: 25, line: 2, col: 0 },
                                end: { offset: 49, line: 2, col: 24 },
                            },
                        },
                        {
                            task: ' ',
                            parent: -50,
                            position: {
                                start: { offset: 50, line: 3, col: 0 },
                                end: { offset: 70, line: 3, col: 20 },
                            },
                        },
                        {
                            task: 'x',
                            parent: -71,
                            position: {
                                start: { offset: 71, line: 4, col: 0 },
                                end: { offset: 87, line: 4, col: 16 },
                            },
                        },
                    ],
                } as any;
            }
            return null;
        });

        await ClearCheckedIngredients(mockContext);

        expect(shoppingListFileContent).toBe(`# Food
- [ ] pasta 200 g
- [ ] lettuce 1 head
`);
    });

    test('should handle shopping list with no checked items', async () => {
        shoppingListFileContent = `# Food
- [ ] pasta 200 g
- [ ] lettuce 1 head
`;

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Shopping List.md') {
                return {
                    listItems: [
                        {
                            task: ' ',
                            parent: -7,
                            position: {
                                start: { offset: 7, line: 1, col: 0 },
                                end: { offset: 24, line: 1, col: 17 },
                            },
                        },
                        {
                            task: ' ',
                            parent: -25,
                            position: {
                                start: { offset: 25, line: 2, col: 0 },
                                end: { offset: 43, line: 2, col: 18 },
                            },
                        },
                    ],
                } as any;
            }
            return null;
        });

        await ClearCheckedIngredients(mockContext);

        expect(shoppingListFileContent).toBe(`# Food
- [ ] pasta 200 g
- [ ] lettuce 1 head
`);
    });

    test('should handle empty shopping list', async () => {
        shoppingListFileContent = '# Food\n';

        const mockMetadataCache = mockContext.app.metadataCache;
        mockMetadataCache.getFileCache = vi.fn((file) => {
            if (file.path === 'Shopping List.md') {
                return {
                    listItems: [],
                };
            }
            return null;
        });

        await ClearCheckedIngredients(mockContext);

        expect(shoppingListFileContent).toBe('# Food\n');
    });
});

describe('AddFileToShoppingList', () => {
    let mockContext: Context;
    let shoppingListFileContent: string;
    let mockRecipeFile: TFile;
    let mockRecipe: Recipe;

    beforeEach(() => {
        vi.clearAllMocks();
        shoppingListFileContent = '';

        mockRecipeFile = {
            path: 'recipes/Pasta.md',
            basename: 'Pasta',
        } as TFile;

        const recipe = new Recipe(mockRecipeFile);
        recipe.ingredients = [
            { description: 'pasta', quantity: 200, unitOfMeasure: 'g' },
            { description: 'tomato sauce', quantity: 1, unitOfMeasure: 'cup' },
        ] as Ingredient[];
        mockRecipe = recipe;

        const mockVault = {
            getFileByPath: vi.fn((path) => {
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

        const settings = new MealSettings();
        settings.shoppingListNote = 'Shopping List';

        mockContext = {
            settings: writable(settings),
            recipes: writable([mockRecipe]),
            app: {
                vault: mockVault,
                metadataCache: {
                    getFileCache: vi.fn((file) => {
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
                    }),
                },
            } as any,
            plugin: {} as any,
            ingredients: {} as any,
            getRecipeFolder: vi.fn(),
            isInRecipeFolder: vi.fn(),
            loadRecipes: vi.fn(),
            debugMode: vi.fn().mockReturnValue(false),
        };
    });

    test('should add recipe ingredients to shopping list', async () => {
        shoppingListFileContent = '# Food\n';

        await AddFileToShoppingList(mockContext, mockRecipeFile);

        expect(shoppingListFileContent).toBe(`# Food

- [ ] pasta 200 g
- [ ] tomato sauce 1 cup
`);
    });

    test('should create shopping list if it does not exist', async () => {
        let fileCreated = false;
        const mockVault = mockContext.app.vault;
        mockVault.getFileByPath = vi.fn((path) => {
            if (path === 'Shopping List.md' && fileCreated) {
                return {
                    path: 'Shopping List.md',
                    basename: 'Shopping List',
                } as TFile;
            }
            return null;
        });
        mockVault.create = vi.fn().mockImplementation(() => {
            fileCreated = true;
            shoppingListFileContent = '# Food\n';
            return Promise.resolve({});
        });

        await AddFileToShoppingList(mockContext, mockRecipeFile);

        expect(shoppingListFileContent).toBe(`# Food

- [ ] pasta 200 g
- [ ] tomato sauce 1 cup
`);
    });

    test('should handle recipe not found in context', async () => {
        mockContext.recipes = writable([]);
        shoppingListFileContent = '# Food\n';

        await AddFileToShoppingList(mockContext, mockRecipeFile);

        // No ingredients should be added since recipe is not found
        expect(shoppingListFileContent).toBe('# Food\n\n');
    });

    test('should respect different shopping list formats', async () => {
        const settings = new MealSettings();
        settings.shoppingListNote = 'Shopping List';
        settings.shoppingListFormat = '{quantity} {unitOfMeasure} of {description}';
        mockContext.settings = writable(settings);

        shoppingListFileContent = '# Food\n';

        await AddFileToShoppingList(mockContext, mockRecipeFile);

        // Check that custom format is applied
        expect(shoppingListFileContent).toContain('200 g of pasta');
        expect(shoppingListFileContent).toContain('1 cup of tomato sauce');
    });
});
