import { getFrontMatterInfo } from 'obsidian';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GetIngredients } from '../recipe/ingredients.ts';
import { MealSettings, RecipeFormat } from '../settings/settings.ts';

describe('GetIngredients', () => {
    let mockFile: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockFile = {
            path: 'recipes/Test.md',
            basename: 'Test',
        };
    });

    function makeCtx(fileContent: string, fileMetadata: any, settings: MealSettings) {
        return {
            settings: writable(settings),
            app: {
                vault: {
                    read: vi.fn().mockResolvedValue(fileContent),
                },
                metadataCache: {
                    getFileCache: vi.fn().mockReturnValue(fileMetadata),
                },
            },
            debugMode: vi.fn().mockReturnValue(false),
        } as any;
    }

    describe('RecipeMD format', () => {
        test('should parse ingredients even when metadata cache is not yet populated (null)', async () => {
            // Reproduces issue #362: recipes with YAML frontmatter fail when Obsidian
            // has not yet indexed their metadata (common during initial plugin load)
            const fileContent = `---\ntitle: Test\n---\n# Ingredients\n---\n- 1 egg\n- 2 cups flour\n---\n`;
            // contentStart = len("---\n") + len("title: Test\n") + len("---\n") = 4 + 12 + 4 = 20
            (getFrontMatterInfo as ReturnType<typeof vi.fn>).mockReturnValue({ contentStart: 20 });

            const settings = new MealSettings();
            settings.recipeFormat = RecipeFormat.RecipeMD;

            // Simulate metadata not yet indexed — typical for YAML frontmatter files on startup
            const ctx = makeCtx(fileContent, null, settings);

            const result = await GetIngredients(ctx, mockFile);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toHaveLength(2);
            expect(result.unwrap()[0].description).toBe('egg');
            expect(result.unwrap()[1].description).toBe('flour');
        });

        test('should parse ingredients when metadata cache is populated', async () => {
            const fileContent = `---\ntitle: Test\n---\n# Ingredients\n---\n- 1 egg\n- 2 cups flour\n---\n`;
            (getFrontMatterInfo as ReturnType<typeof vi.fn>).mockReturnValue({ contentStart: 20 });

            const settings = new MealSettings();
            settings.recipeFormat = RecipeFormat.RecipeMD;

            const ctx = makeCtx(fileContent, { frontmatter: { title: 'Test' }, headings: [], listItems: [] }, settings);

            const result = await GetIngredients(ctx, mockFile);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toHaveLength(2);
        });

        test('should parse ingredients from file without frontmatter', async () => {
            const fileContent = `# Ingredients\n---\n- 1 egg\n- 2 cups flour\n---\n`;
            (getFrontMatterInfo as ReturnType<typeof vi.fn>).mockReturnValue({ contentStart: 0 });

            const settings = new MealSettings();
            settings.recipeFormat = RecipeFormat.RecipeMD;

            const ctx = makeCtx(fileContent, null, settings);

            const result = await GetIngredients(ctx, mockFile);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toHaveLength(2);
        });
    });

    describe('Legacy (MealPlan) format', () => {
        test('should parse ingredients when metadata cache is populated', async () => {
            // File: "# Ingredients\n- 1 egg\n- 2 cups flour\n\n# Directions\n"
            // Offsets: "# Ingredients\n" ends at 14; "# Directions" starts at 38
            const fileContent = `# Ingredients\n- 1 egg\n- 2 cups flour\n\n# Directions\n`;

            const settings = new MealSettings();
            settings.recipeFormat = RecipeFormat.MealPlan;

            const fileMetadata = {
                headings: [
                    {
                        heading: 'Ingredients',
                        level: 1,
                        position: {
                            start: { offset: 0, line: 0, col: 0 },
                            end: { offset: 14, line: 0, col: 14 },
                        },
                    },
                    {
                        heading: 'Directions',
                        level: 1,
                        position: {
                            start: { offset: 38, line: 3, col: 0 },
                            end: { offset: 51, line: 3, col: 13 },
                        },
                    },
                ],
            };

            const ctx = makeCtx(fileContent, fileMetadata, settings);

            const result = await GetIngredients(ctx, mockFile);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toHaveLength(2);
        });

        test('should return error when metadata cache is null', async () => {
            const fileContent = `# Ingredients\n- 1 egg\n`;

            const settings = new MealSettings();
            settings.recipeFormat = RecipeFormat.MealPlan;

            const ctx = makeCtx(fileContent, null, settings);

            const result = await GetIngredients(ctx, mockFile);

            expect(result.isErr()).toBe(true);
        });

        test('should parse ingredients from file with YAML frontmatter', async () => {
            // File with frontmatter: "---\ntags: [recipe]\n---\n# Ingredients\n- 1 egg\n..."
            // "---\n" = 4, "tags: [recipe]\n" = 15, "---\n" = 4 → "# Ingredients" starts at offset 23
            // "# Ingredients\n" = 14 chars → end offset = 37
            // "# Directions" starts at offset 61 (after 8 + 15 + 1 chars of ingredients)
            const fileContent = `---\ntags: [recipe]\n---\n# Ingredients\n- 1 egg\n- 2 cups flour\n\n# Directions\n`;

            const settings = new MealSettings();
            settings.recipeFormat = RecipeFormat.MealPlan;

            // Obsidian metadata uses absolute offsets (including frontmatter bytes)
            const fileMetadata = {
                headings: [
                    {
                        heading: 'Ingredients',
                        level: 1,
                        position: {
                            start: { offset: 23, line: 3, col: 0 },
                            end: { offset: 37, line: 3, col: 14 },
                        },
                    },
                    {
                        heading: 'Directions',
                        level: 1,
                        position: {
                            start: { offset: 61, line: 6, col: 0 },
                            end: { offset: 74, line: 6, col: 13 },
                        },
                    },
                ],
            };

            const ctx = makeCtx(fileContent, fileMetadata, settings);

            const result = await GetIngredients(ctx, mockFile);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toHaveLength(2);
        });
    });
});
