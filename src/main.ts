import { type App, MarkdownView, Modal, Plugin, PluginSettingTab, TFile, type WorkspaceLeaf } from 'obsidian';
import initWasm from 'recipe-rs';
import wasmData from 'recipe-rs/recipe_rs_bg.wasm?url';
import { mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import 'virtual:uno.css';
import { Context } from './context.ts';
import { AddToPlanModal } from './meal_plan/add_to_plan.ts';
import MealPlanCalendarWrapper from './meal_plan/MealPlanCalendarWrapper.svelte';
import { OpenMealPlanNote } from './meal_plan/plan.ts';
import { AddFileToShoppingList, AddMealPlanToShoppingList, ClearCheckedIngredients } from './meal_plan/shopping_list.ts';
import { DownloadRecipeCommand, RedownloadRecipe } from './recipe/downloader.ts';
import { Recipe } from './recipe/recipe.ts';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import SettingsPage from './settings/SettingsPage.svelte';
import { MealSettings } from './settings/settings.ts';
import { AppendMarkdownExt } from './utils/filesystem.ts';

export default class MealPlugin extends Plugin {
    ctx = new Context(this);
    loadedSettings = false;
    private mealPlanCalendarComponent: Record<string, any> | null = null;
    private mealPlanCalendarContainer: HTMLElement | null = null;

    async onload() {
        this.addSettingTab(new MealPluginSettingsTab(this.app, this));

        this.app.workspace.onLayoutReady(async () => {
            await this.loadSettings();

            await initWasm(wasmData);

            await this.ctx.loadRecipes(null);

            this.registerEvent(
                this.app.vault.on('create', (file) => {
                    if (file instanceof TFile) {
                        this.ctx.loadRecipes(file);
                    }
                }),
            );

            this.registerEvent(
                this.app.vault.on('modify', (file) => {
                    if (file instanceof TFile) {
                        this.ctx.loadRecipes(file as TFile);
                    }
                }),
            );

            // Listen for active leaf changes to inject calendar into meal plan note
            this.registerEvent(
                this.app.workspace.on('active-leaf-change', (leaf) => {
                    this.handleMealPlanCalendarInjection(leaf);
                }),
            );

            // Also check the current active leaf on startup
            const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
            if (activeLeaf) {
                this.handleMealPlanCalendarInjection(activeLeaf);
            }
        });

        this.addCommand({
            id: 'open-recipe-search',
            name: 'Find a recipe',
            callback: () => {
                new RecipeSearch(this.ctx).open();
            },
        });

        this.addCommand({
            id: 'open-meal-plan',
            name: 'Open meal plan note',
            callback: async () => {
                await OpenMealPlanNote(this.ctx, get(this.ctx.settings).mealPlanNote);
            },
        });

        this.addCommand({
            id: 'create-shopping-list',
            name: 'Add meal plan to shopping list',
            callback: async () => {
                await AddMealPlanToShoppingList(this.ctx);
            },
        });

        this.addCommand({
            id: 'clear-shopping-list',
            name: 'Clear checked shopping list items',
            callback: async () => {
                await ClearCheckedIngredients(this.ctx);
            },
        });

        this.addCommand({
            id: 'download-url',
            name: 'Download recipe from url',
            callback: () => {
                DownloadRecipeCommand(this.ctx);
            },
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (e, t) => {
                if (t instanceof TFile && t.path.contains(get(this.ctx.settings).recipeDirectory)) {
                    e.addItem((e) => {
                        return e
                            .setTitle('Add to shopping list')
                            .setIcon('shopping-basket')
                            .onClick(() => {
                                AddFileToShoppingList(this.ctx, t);
                            });
                    });
                    e.addItem((e) => {
                        return e
                            .setTitle('Add to meal plan')
                            .setIcon('utensils')
                            .onClick(() => {
                                new AddToPlanModal(this.ctx, new Recipe(t)).open();
                            });
                    });

                    e.addItem((e) => {
                        return e
                            .setTitle('Redownload recipe')
                            .setIcon('download')
                            .onClick(async () => {
                                await RedownloadRecipe(this.ctx, new Recipe(t, t.basename));
                            });
                    });
                }
            }),
        );

        this.ctx.settings.subscribe(async () => {
            this.updateDebugMode(this.ctx.debugMode());
            await this.ctx.loadRecipes(null);
            this.saveSettings();

            // Re-evaluate calendar injection when settings change
            const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
            this.handleMealPlanCalendarInjection(activeLeaf ?? null);
        });

        console.info('obisidan-meals plugin loaded');
    }

    async loadSettings() {
        this.loadedSettings = true;

        this.ctx.settings.set(Object.assign({}, new MealSettings(), await this.loadData()));
    }

    async saveSettings() {
        if (!this.loadedSettings) {
            return;
        }

        await this.saveData(get(this.ctx.settings));
    }

    async updateDebugMode(enabled: boolean) {
        this.registerEvent(
            this.app.workspace.on('file-menu', (e, t) => {
                if (enabled === false) {
                    return;
                }

                if (t instanceof TFile && this.ctx.isInRecipeFolder(t)) {
                    e.addItem((e) => {
                        return e
                            .setTitle('Reload recipe')
                            .setIcon('carrot')
                            .onClick(async () => {
                                await this.ctx.loadRecipes(t);
                            });
                    });
                }
            }),
        );

        if (enabled) {
            this.addCommand({
                id: 'reload-recipes',
                name: 'Reload all recipes',
                callback: async () => {
                    await this.ctx.loadRecipes(null);
                },
            });
        } else {
            this.removeCommand('reload-recipes');
        }
    }

    private handleMealPlanCalendarInjection(leaf: WorkspaceLeaf | null) {
        // Clean up previous calendar if it exists
        this.cleanupMealPlanCalendar();

        if (!leaf) return;

        const settings = get(this.ctx.settings);

        // Check if the setting is enabled
        if (!settings.showCalendarInMealPlan) return;

        const view = leaf.view;

        // Check if it's a MarkdownView
        if (!(view instanceof MarkdownView)) return;

        // Check if it's the meal plan note
        const mealPlanFilePath = AppendMarkdownExt(settings.mealPlanNote);
        if (view.file?.path !== mealPlanFilePath) return;

        // Get the content container
        const contentContainer = view.containerEl.querySelector('.cm-sizer');
        if (!contentContainer) return;

        // Check if calendar is already injected
        if (contentContainer.querySelector('.meal-plan-calendar-wrapper')) return;

        // Create container for the calendar
        this.mealPlanCalendarContainer = document.createElement('div');
        this.mealPlanCalendarContainer.className = 'meal-plan-calendar-injection';

        // Insert at the beginning of the content
        contentContainer.insertBefore(this.mealPlanCalendarContainer, contentContainer.firstChild);

        // Mount the Svelte component
        this.mealPlanCalendarComponent = mount(MealPlanCalendarWrapper, {
            target: this.mealPlanCalendarContainer,
            props: {
                ctx: this.ctx,
            },
        });
    }

    private cleanupMealPlanCalendar() {
        if (this.mealPlanCalendarComponent) {
            unmount(this.mealPlanCalendarComponent);
            this.mealPlanCalendarComponent = null;
        }
        if (this.mealPlanCalendarContainer) {
            this.mealPlanCalendarContainer.remove();
            this.mealPlanCalendarContainer = null;
        }
    }
}

class RecipeSearch extends Modal {
    component: Record<string, any> | null = null;
    ctx: Context;
    constructor(ctx: Context) {
        super(ctx.app);
        this.ctx = ctx;
    }

    onOpen() {
        this.component = mount(SearchRecipe, {
            target: this.containerEl.children[1].children[2],
            props: {
                ctx: this.ctx,
                onClose: () => {
                    this.close();
                },
            },
        });
    }
    onClose(): void {
        if (this.component != null) {
            unmount(this.component);
        }
    }
}

class MealPluginSettingsTab extends PluginSettingTab {
    plugin: MealPlugin;
    ctx: Context;

    constructor(app: App, plugin: MealPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.ctx = plugin.ctx;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        mount(SettingsPage, {
            target: this.containerEl,
            props: {
                plugin: this.plugin,
                settings: this.ctx.settings,
            },
        });
    }
}
