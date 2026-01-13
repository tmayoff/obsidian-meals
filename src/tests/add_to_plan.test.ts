import type { TFile } from 'obsidian';
import { writable } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '../context.ts';
import { AddToPlanModal } from '../meal_plan/add_to_plan.ts';
import { Recipe } from '../recipe/recipe.ts';
import { MealSettings } from '../settings/settings.ts';

// Mock SuggestModal
vi.mock('obsidian', async () => {
    const actual = await vi.importActual('obsidian');
    return {
        ...actual,
        SuggestModal: class {
            app: any;
            constructor(app: any) {
                this.app = app;
            }
            open() {}
            close() {}
        },
    };
});

describe('AddToPlanModal', () => {
    let mockContext: Context;
    let mockRecipe: Recipe;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockFile = {
            path: 'test-recipe.md',
            basename: 'Test Recipe',
        } as TFile;
        mockRecipe = new Recipe(mockFile);

        const settings = new MealSettings();
        settings.mealPlanNote = 'Meal Plan';
        settings.startOfWeek = 0;

        mockContext = {
            settings: writable(settings),
            app: {
                scope: {
                    register: vi.fn(),
                },
                keymap: {
                    pushScope: vi.fn(),
                    popScope: vi.fn(),
                },
                workspace: {
                    on: vi.fn(),
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

    test('should create modal with buttons for each day of week', () => {
        const modal = new AddToPlanModal(mockContext, mockRecipe);

        expect(modal.buttons).toHaveLength(7);
        expect(modal.buttons[0].name).toBe('Sunday');
        expect(modal.buttons[1].name).toBe('Monday');
        expect(modal.buttons[2].name).toBe('Tuesday');
        expect(modal.buttons[3].name).toBe('Wednesday');
        expect(modal.buttons[4].name).toBe('Thursday');
        expect(modal.buttons[5].name).toBe('Friday');
        expect(modal.buttons[6].name).toBe('Saturday');
    });

    test('should return all buttons when getting suggestions', () => {
        const modal = new AddToPlanModal(mockContext, mockRecipe);

        const suggestions = modal.getSuggestions('');

        expect(suggestions).toEqual(modal.buttons);
    });

    test('should render suggestion with day name', () => {
        const modal = new AddToPlanModal(mockContext, mockRecipe);
        const mockEl = {
            createEl: vi.fn(),
        } as any;

        modal.renderSuggestion(modal.buttons[0], mockEl);

        expect(mockEl.createEl).toHaveBeenCalledWith('div', { text: 'Sunday' });
    });

    test('should execute callback and close on suggestion chosen', () => {
        const modal = new AddToPlanModal(mockContext, mockRecipe);
        modal.close = vi.fn();

        const mockCallback = vi.fn().mockResolvedValue(undefined);
        modal.buttons[0].cb = mockCallback;

        modal.onChooseSuggestion(modal.buttons[0], {} as MouseEvent);

        expect(mockCallback).toHaveBeenCalled();
        expect(modal.close).toHaveBeenCalled();
    });

    test('should not fail if callback is undefined', () => {
        const modal = new AddToPlanModal(mockContext, mockRecipe);
        modal.close = vi.fn();

        const buttonWithoutCb = {
            name: 'Test',
            cb: undefined,
        };

        modal.onChooseSuggestion(buttonWithoutCb, {} as MouseEvent);

        expect(modal.close).toHaveBeenCalled();
    });
});
