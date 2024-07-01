import { type App, Modal, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { Context } from './context';
import { open_meal_plan_note } from './meal_plan/plan';
import { add_meal_plan_to_shopping_list, add_file_to_shopping_list, clear_checked_ingredients } from './meal_plan/shopping_list';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import { MealSettings, RecipeFormat } from './settings';
import 'virtual:uno.css';

export default class MealPlugin extends Plugin {
    ctx = new Context(this);

    async onload() {
        await this.loadSettings();

        this.ctx.load_recipes(undefined);

        this.registerEvent(
            this.app.vault.on('create', (file) => {
                this.ctx.load_recipes(file);
            }),
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                this.ctx.load_recipes(file);
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
                await open_meal_plan_note(this.app, get(this.ctx.settings).meal_plan_note);
            },
        });

        this.addCommand({
            id: 'create-shopping-list',
            name: "Add week's shopping list",
            callback: async () => {
                await add_meal_plan_to_shopping_list(this.ctx);
            },
        });

        this.addCommand({
            id: 'clear-shopping-list',
            name: 'Clear checked shopping list items',
            callback: async () => {
                await clear_checked_ingredients(this.ctx);
            },
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (e, t) => {
                if (t instanceof TFile && t.path.contains(get(this.ctx.settings).recipe_directory)) {
                    e.addItem((e) => {
                        return e
                            .setTitle('Add to shopping list')
                            .setIcon('shopping-basket')
                            .onClick(() => {
                                add_file_to_shopping_list(this.ctx, t);
                            });
                    });
                }
            }),
        );

        console.log('tmayoff-meals loaded');
    }

    onunload() {}

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
                text.setValue(get(this.ctx.settings).recipe_directory).onChange(async (value) => {
                    this.ctx.settings.update((s) => {
                        s.recipe_directory = value;
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
                    .setValue(get(this.ctx.settings).meal_plan_note)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.meal_plan_note = value;
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
                    .setValue(get(this.ctx.settings).shopping_list_note)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.shopping_list_note = value;
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
                    .addOption('Meal Planner', RecipeFormat.Meal_Plan)
                    .setValue(get(this.ctx.settings).recipe_format)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.recipe_format = <RecipeFormat>value;
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
                    .setValue(get(this.ctx.settings).shopping_list_format)
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.shopping_list_format = value;
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
                    .setValue(get(this.ctx.settings).shopping_list_ignore.join(','))
                    .onChange(async (value) => {
                        this.ctx.settings.update((s) => {
                            s.shopping_list_ignore = value.split(',');
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
                toggle.setValue(get(this.ctx.settings).advanced_ingredient_parsing).onChange(async (val) => {
                    this.ctx.settings.update((s) => {
                        s.advanced_ingredient_parsing = val;
                        return s;
                    });

                    await this.plugin.saveSettings();
                    await this.ctx.load_recipes(undefined);
                });
            });
    }
}
