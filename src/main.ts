import { type App, Modal, Plugin, PluginSettingTab, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { Context } from './context.ts';
import { AddToPlanModal } from './meal_plan/add_to_plan.ts';
import { OpenMealPlanNote } from './meal_plan/plan.ts';
import { AddFileToShoppingList, AddMealPlanToShoppingList, ClearCheckedIngredients } from './meal_plan/shopping_list.ts';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import { MealSettings } from './settings/settings.ts';
import 'virtual:uno.css';
import initWasm from 'recipe-rs';
import wasmData from 'recipe-rs/recipe_rs_bg.wasm?url';
import { mount, unmount } from 'svelte';
import { DownloadRecipeCommand, RedownloadRecipe } from './recipe/downloader.ts';
import { Recipe } from './recipe/recipe.ts';
import SettingsPage from './settings/SettingsPage.svelte';

// biome-ignore lint/style/noDefaultExport: <explanation>
export default class MealPlugin extends Plugin {
    ctx = new Context(this);

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
            name: "Add week's shopping list",
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
                                new AddToPlanModal(this.ctx, new Recipe(t), false).open();
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
        });

        console.info('obisidan-meals plugin loaded');
    }

    async loadSettings() {
        this.ctx.settings.set(Object.assign({}, new MealSettings(), await this.loadData()));
    }

    async saveSettings() {
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
