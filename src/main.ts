import { App, Modal, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";

import "virtual:uno.css";
import { initialize_store } from "./store";
import SearchRecipe from "./recipe/SearchRecipe.svelte";
import { open_meal_plan_note } from "./meal_plan/plan";
import { MealSettings, settings } from "./settings";
import { get } from "svelte/store";

export default class MealPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    initialize_store(this);

    this.app.vault.on("create", () => {
      initialize_store(this);
    });

    this.app.vault.on("modify", () => {
      initialize_store(this);
    });

    this.addSettingTab(new MealPluginSettingsTab(this.app, this));

    this.addCommand({
      id: "open-recipe-search",
      name: "Find a recipe",
      callback: () => {
        new RecipeSearch(this.app, get(settings)).open();
      },
    });

    this.addCommand({
      id: "open-meal-plan",
      name: "Open meal plan note",
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
      .setName("Recipe Directory")
      .setDesc("Folder where recipes are stored")
      .addText(async (text) => {
        text
          .setValue(get(settings).recipe_directory)
          .onChange(async (value) => {
            settings.update((s) => {
              s.recipe_directory = value;
              return s;
            });
            await this.plugin.saveSettings();
          });
      });
    new Setting(containerEl)
      .setName("Meal Plan Note")
      .setDesc("Note to store meal plans")
      .addText((text) =>
        text
          .setPlaceholder("Meal Plan")
          .setValue(get(settings).meal_plan_note)
          .onChange(async (value) => {
            settings.update((s) => {
              s.meal_plan_note = value;
              return s;
            });
            await this.plugin.saveSettings();
          })
      );
  }
}
