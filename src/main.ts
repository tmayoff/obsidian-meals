import { App, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { get } from 'svelte/store';
import { open_meal_plan_note } from './meal_plan/plan';
import { generate_shopping_list } from './meal_plan/shopping_list';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import { RecipeFormat, MealSettings, settings } from './settings';
import { APP, load_recipes } from './store';
import 'virtual:uno.css';

export default class MealPlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        APP.set(this.app);
        load_recipes();

        this.registerEvent(
            this.app.vault.on('create', (file) => {
                load_recipes(file);
            }),
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                load_recipes(file);
            }),
        );

        this.addSettingTab(new MealPluginSettingsTab(this.app, this));

        this.addCommand({
            id: 'open-recipe-search',
            name: 'Find a recipe',
            callback: () => {
                new RecipeSearch(this.app, get(settings)).open();
            },
        });

        this.addCommand({
            id: 'open-meal-plan',
            name: 'Open meal plan note',
            callback: async () => {
                await open_meal_plan_note(get(settings).meal_plan_note);
            },
        });

        this.addCommand({
            id: 'create-shopping-list',
            name: "Add week's shopping list",
            callback: async () => {
                generate_shopping_list(this.app);
            },
        });
    }

    onunload() {}

    async loadSettings() {
        settings.set(Object.assign({}, new MealSettings(), await this.loadData()));
    }

    async saveSettings() {
        await this.saveData(get(settings));
    }
}

class RecipeSearch extends Modal {
    recipeView: SearchRecipe | undefined;
    settings: MealSettings;
    app: App;

    constructor(app: App, settings: MealSettings) {
        super(app);

        this.app = app;
        this.settings = settings;
    }
    async onOpen() {
        this.recipeView = new SearchRecipe({
            target: this.containerEl.children[1].children[2],
            props: {
                app: this.app,
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

    constructor(app: App, plugin: MealPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Recipe directory')
            .setDesc('Parent folder where recipes are stored')
            .addText(async (text) => {
                text.setValue(get(settings).recipe_directory).onChange(async (value) => {
                    settings.update((s) => {
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
                    .setValue(get(settings).meal_plan_note)
                    .onChange(async (value) => {
                        settings.update((s) => {
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
                    .setValue(get(settings).shopping_list_note)
                    .onChange(async (value) => {
                        settings.update((s) => {
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
              dropdown.addOption("RecipeMD",RecipeFormat.RecipeMD)
              .addOption("Meal Planner",RecipeFormat.Meal_Plan)
              .setValue(get(settings).recipe_format)
              .onChange(async (value) => {
                  settings.update((s) => {
                      s.recipe_format = <RecipeFormat> value;
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
                    .setValue(get(settings).shopping_list_ignore.join(','))
                    .onChange(async (value) => {
                        settings.update((s) => {
                            s.shopping_list_ignore = value.split(',');
                            return s;
                        });

                        await this.plugin.saveSettings();
                    });
            });
    }
}
