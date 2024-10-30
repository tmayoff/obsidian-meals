import { type App, Modal, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { Context } from './context.ts';
import { OpenMealPlanNote } from './meal_plan/plan.ts';
import { AddFileToShoppingList, AddMealPlanToShoppingList, ClearCheckedIngredients } from './meal_plan/shopping_list.ts';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import { MealSettings, RecipeFormat } from './settings.ts';
import 'virtual:uno.css';
import initWasm from 'recipe-rs';
import wasmData from 'recipe-rs/recipe_rs_bg.wasm?url';
import { DownloadRecipeCommand } from './recipe/downloader.ts';

// biome-ignore lint/style/noDefaultExport: <explanation>
export default class MealPlugin extends Plugin {
    ctx = new Context(this);

    async onload() {
        await this.loadSettings();

        await initWasm(wasmData);

        this.registerEvent(
            this.app.vault.on('create', (file) => {
                this.ctx.loadRecipes(file);
            }),
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                this.ctx.loadRecipes(file);
            }),
        );

        this.addSettingTab(new MealPluginSettingsTab(this.app, this));

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
                await OpenMealPlanNote(this.app, get(this.ctx.settings).mealPlanNote);
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
                }
            }),
        );

        if (get(this.ctx.settings).debugMode) {
            console.debug('Debug mode enabled');
            this.addCommand({
                id: 'reload-recipes',
                name: 'Reload all recipes',
                callback: async () => {
                    await this.ctx.loadRecipes(undefined);
                },
            });

            this.registerEvent(
                this.app.workspace.on('file-menu', (e, file) => {
                    if (file instanceof TFile && file.path.contains(get(this.ctx.settings).recipeDirectory)) {
                        e.addItem((e) => {
                            return e
                                .setTitle('Reload recipe')
                                .setIcon('carrot')
                                .onClick(async () => {
                                    await this.ctx.loadRecipes(file);
                                });
                        });
                    }
                }),
            );
        }

        this.app.workspace.onLayoutReady(async () => {
            await this.ctx.loadRecipes(undefined);
        });

        console.info('obisidan-meals plugin loaded');
    }

    async loadSettings() {
        this.ctx.settings.set(Object.assign({}, new MealSettings(), await this.loadData()));
    }

    async saveSettings() {
        await this.saveData(get(this.ctx.settings));
    }
}

class RecipeSearch extends Modal {
    recipeView: SearchRecipe | undefined;
    ctx: Context;

    constructor(ctx: Context) {
        super(ctx.app);
        this.ctx = ctx;
    }
    async onOpen() {
        this.recipeView = new SearchRecipe({
            target: this.containerEl.children[1].children[2],
            props: {
                ctx: this.ctx,
            },
        });

        this.recipeView.$on('close_modal', () => {
            this.close();
        });
    }

    onClose(): void {
        this.contentEl.empty();
        this.recipeView?.$destroy();
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

        new Setting(containerEl)
            .setName('Recipe directory')
            .setDesc('Parent folder where recipes are stored')
            .addText(async (text) => {
                text.setValue(get(this.ctx.settings).recipeDirectory).onChange(async (value) => {
                    this.ctx.settings.update((s) => {
                        s.recipeDirectory = value;
                        return s;
                    });
                    await this.plugin.saveSettings();
                });
            });
        new Setting(containerEl)
            .setName('Meal plan note')
            .setDesc('Note to store the the weekly meal plans')
            .addText((text) =>
                text
                    .setPlaceholder('Meal Plan')
                    .setValue(get(this.ctx.settings).mealPlanNote)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.mealPlanNote = value;
                            return s;
                        });
                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Shopping List note')
            .setDesc('Note for storing your shopping list')
            .addText((text) =>
                text
                    .setPlaceholder('Shopping List')
                    .setValue(get(this.ctx.settings).shoppingListNote)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.shoppingListNote = value;
                            return s;
                        });

                        await this.plugin.saveSettings();
                    }),
            );

        new Setting(containerEl)
            .setName('Recipe Format')
            .setDesc('RecipeMD or Meal Planner')
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('RecipeMD', RecipeFormat.RecipeMD)
                    .addOption('Meal Planner', RecipeFormat.MealPlan)
                    .setValue(get(this.ctx.settings).recipeFormat)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.recipeFormat = <RecipeFormat>value;
                            return s;
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Shopping list format')
            .setDesc(
                'Which elements of the ingredients to add to the shopping list. Place the ingredients properties in {} properties are from here: https://www.npmjs.com/package/parse-ingredient',
            )
            .addText((text) => {
                text.setPlaceholder('{description} {quantity} {unitOfMeasure}')
                    .setValue(get(this.ctx.settings).shoppingListFormat)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.shoppingListFormat = value;
                            return s;
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Shopping list ignore')
            .setDesc('CSV list of ingredients to not add to the shopping list automatically')
            .addText((text) => {
                text.setPlaceholder('salt,pepper')
                    .setValue(get(this.ctx.settings).shoppingListIgnore.join(','))
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.shoppingListIgnore = value.split(',');
                            return s;
                        });

                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('EXPERIMENTAL: Advanced ingredient parsing')
            .setDesc(
                "This will add some extra rules to parsing an ingredient's name, ignoring text after the first comma and turning the name singular",
            )
            .addToggle((toggle) => {
                toggle.setValue(get(this.ctx.settings).advancedIngredientParsing).onChange(async (val) => {
                    this.ctx.settings.update((s) => {
                        s.advancedIngredientParsing = val;
                        return s;
                    });

                    await this.plugin.saveSettings();
                    await this.ctx.loadRecipes(undefined);
                });
            });

        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('This enables extra debugging tools: logging, menu options, etc...')
            .addToggle((toggle) => {
                toggle.setValue(get(this.ctx.settings).debugMode).onChange(async (val) => {
                    this.ctx.settings.update((s) => {
                        s.debugMode = val;
                        return s;
                    });

                    await this.plugin.saveSettings();
                    await this.ctx.loadRecipes(undefined);
                });
            });
    }
}
