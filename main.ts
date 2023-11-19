import { App, Modal, Plugin, PluginSettingTab, Setting } from "obsidian";

// Remember to rename these classes and interfaces!

interface MealSettings {
	recipe_directory: string;
	meal_plan_note: string;
}

const DEFAULT_SETTINGS: MealSettings = {
	recipe_directory: "/",
	meal_plan_note: "Meal Plan",
};

export default class MealPlugin extends Plugin {
	settings: MealSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MealPluginSettingsTab(this.app, this));

		this.addCommand({
			id: "open-recipe-search",
			name: "Find a recipe",
			callback: () => {
				new RecipeSearch(this.app).open();
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RecipeSearch extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen(): void {
		const { containerEl } = this;

		containerEl.setText("Find a recipe");
	}

	onClose(): void {
		this.contentEl.empty();
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
			.addText((text) =>
				text
					.setPlaceholder("/recipes")
					.setValue(this.plugin.settings.recipe_directory)
					.onChange(async (value) => {
						this.plugin.settings.recipe_directory = value;
						await this.plugin.saveSettings();
					})
			);
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
