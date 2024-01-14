import { App, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';
import 'virtual:uno.css';
import { load_recipes, APP } from './store';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import { open_meal_plan_note } from './meal_plan/plan';
import { MealSettings, settings } from './settings';
import { get } from 'svelte/store';

export default class MealPlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        APP.set(this.app);
        load_recipes();

        this.registerEvent(
            this.app.vault.on('create', () => {
                load_recipes();
            }),
        );

        this.registerEvent(
            this.app.vault.on('modify', () => {
                load_recipes();
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
    }
}
