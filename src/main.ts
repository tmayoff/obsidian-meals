import {
  App,
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  TFolder,
} from "obsidian";

import SearchRecipe from "./recipe/SearchRecipe.svelte";

// Remember to rename these classes and interfaces!

export interface MealSettings {
  recipe_directory: string;
  meal_plan_note: string;
}

const DEFAULT_SETTINGS: MealSettings = {
  recipe_directory: "/",
  meal_plan_note: "Meal Plan",
};

export default class MealPlugin extends Plugin {
  settings: MealSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MealPluginSettingsTab(this.app, this));

    this.addCommand({
      id: "open-recipe-search",
      name: "Find a recipe",
      callback: () => {
        new RecipeSearch(this.app, this.settings).open();
      },
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
        settings: this.settings,
        app: this.app,
      },
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
      .setName("Recipe Directory")
      .setDesc("Folder where recipes are stored")
      .addText(async (text) => {
        text
          .setValue(this.plugin.settings.recipe_directory)
          .onChange(async (value) => {
            this.plugin.settings.recipe_directory = value;
            await this.plugin.saveSettings();
          });
      });
    new Setting(containerEl)
      .setName("Meal Plan Note")
      .setDesc("Note to store meal plans")
      .addText((text) =>
        text
          .setPlaceholder("Meal Plan")
          .setValue(this.plugin.settings.meal_plan_note)
          .onChange(async (value) => {
            this.plugin.settings.meal_plan_note = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
