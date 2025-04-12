import { type App, Modal, Notice, Plugin, PluginSettingTab, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { Context } from './context.ts';
import { AddToPlanModal } from './meal_plan/add_to_plan.ts';
import { OpenMealPlanNote } from './meal_plan/plan.ts';
import { AddFileToShoppingList, AddMealPlanToShoppingList, ClearCheckedIngredients } from './meal_plan/shopping_list.ts';
import SearchRecipe from './recipe/SearchRecipe.svelte';
import { MealSettings, ShoppingListIgnoreBehaviour } from './settings/settings.ts';
import 'virtual:uno.css';
import initWasm from 'recipe-rs';
import wasmData from 'recipe-rs/recipe_rs_bg.wasm?url';
import { mount, unmount } from 'svelte';
import { DownloadRecipeCommand, RedownloadRecipe } from './recipe/downloader.ts';
import { Recipe } from './recipe/recipe.ts';
import SettingsPage from './settings/SettingsPage.svelte';
import { wildcardToRegex } from './utils/utils.ts';

// biome-ignore lint/style/noDefaultExport: <explanation>
export default class MealPlugin extends Plugin {
    ctx = new Context(this);

    async onload() {
        this.addSettingTab(new MealPluginSettingsTab(this.app, this));

        this.app.workspace.onLayoutReady(async () => {
            await this.loadSettings();

            await initWasm(wasmData);

            await this.ctx.loadRecipes(undefined);

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

                    if (get(this.ctx.settings).debugMode && t instanceof TFile) {
                        e.addItem((e) => {
                            return e
                                .setTitle('Reload recipe')
                                .setIcon('carrot')
                                .onClick(async () => {
                                    await this.ctx.loadRecipes(t);
                                });
                        });
                    }
                }
            }),
        );

        console.info('obisidan-meals plugin loaded');
    }

    async loadSettings() {
        this.ctx.settings.set(Object.assign({}, new MealSettings(), await this.loadData()));
    }

    async saveSettings() {
        const settings = get(this.ctx.settings);
        console.debug(settings);
        await this.saveData(settings);
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

    htmlToDocumentFragment(html: string): DocumentFragment {
        const fragment: DocumentFragment = document.createDocumentFragment();
        const div = document.createElement('div');
        div.innerHTML = html;
        fragment.appendChild(div);
        return fragment;
    }

    validateBehaviour(behaviour: ShoppingListIgnoreBehaviour): boolean {
        return this.validateShoppingListSettings(get(this.ctx.settings).shoppingListIgnore, behaviour);
    }

    validateIgnoreList(ignoreList: string[]): boolean {
        return this.validateShoppingListSettings(ignoreList, get(this.ctx.settings).shoppingListIgnoreBehaviour);
    }

    validateShoppingListSettings(ignoreList: string[], behaviour: ShoppingListIgnoreBehaviour): boolean {
        if ([ShoppingListIgnoreBehaviour.Exact, ShoppingListIgnoreBehaviour.Partial].contains(behaviour)) {
            return true;
        }

        for (const item of ignoreList) {
            try {
                if (behaviour === ShoppingListIgnoreBehaviour.Wildcard) {
                    new RegExp(wildcardToRegex(item));
                } else {
                    new RegExp(item);
                }
            } catch (e) {
                new Notice(`Shopping list's ignore items are invalid: ${(<Error>e).message}.`);
                return false;
            }
        }
        return true;
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

        // new Setting(containerEl)
        //     .setName('Shopping list ignore')
        //     .setDesc('List of ingredients to not add to the shopping list automatically, one per line')
        //     .addTextArea((textarea) => {
        //         const initialValue = get(this.ctx.settings).shoppingListIgnore.join('\n');
        //         textarea
        //             .setPlaceholder('salt\npepper')
        //             .setValue(initialValue)
        //             .onChange((value) => {
        //                 textarea.inputEl.dataset.tempValue = value;
        //             });

        //         // Delayed Validation
        //         textarea.inputEl.addEventListener('blur', async () => {
        //             const rawValue = textarea.inputEl.dataset.tempValue ?? '';
        //             const ignoreList = rawValue.split('\n').map((line) => line.trim());

        //             if (!this.validateIgnoreList(ignoreList)) {
        //                 // Reset to saved value if validation fails
        //                 textarea.setValue(get(this.ctx.settings).shoppingListIgnore.join('\n'));
        //                 return;
        //             }

        //             this.ctx.settings.update((s) => {
        //                 s.shoppingListIgnore = ignoreList;
        //                 return s;
        //             });
        //             await this.plugin.saveSettings();
        //         });

        //         textarea.inputEl.rows = 6;
        //     });

        // new Setting(containerEl)
        //     .setName('Shopping list ignore behaviour')
        //     .setDesc(
        //         this.htmlToDocumentFragment(`
        //             <p><strong>Exact:</strong> Ignore if ingredient name exactly matches any element in ignore list.</p>
        //             <p><strong>Partial:</strong> Ignore if the ingredient name contains any element in ignore list (Example: "olive oil" will be ignored if "oil" exists in ignore list).</p>
        //             <p><strong>Wildcard:</strong> Ignore if the ingredient name matches by wildcard (Example: both "sea salt" and "salt" will be ignored by "*salt", but "salted nuts" won’t be ignored).</p>
        //             <p><strong>Regex:</strong> Ignore if any regex match is found in the ingredient name (Example: "red pepper" will be ignored if this regex exists in ignore list: ".{0,3} pepper", but "black pepper" won’t be ignored).</p>
        //         `),
        //     )
        //     .addDropdown((dropdown) => {
        //         dropdown
        //             .addOption('Exact', ShoppingListIgnoreBehaviour.Exact)
        //             .addOption('Partial', ShoppingListIgnoreBehaviour.Partial)
        //             .addOption('Wildcard', ShoppingListIgnoreBehaviour.Wildcard)
        //             .addOption('Regex', ShoppingListIgnoreBehaviour.Regex)
        //             .setValue(get(this.ctx.settings).shoppingListIgnoreBehaviour)
        //             .onChange(async (value) => {
        //                 const behaviour = <ShoppingListIgnoreBehaviour>value;
        //                 if (!this.validateBehaviour(behaviour)) {
        //                     dropdown.setValue(get(this.ctx.settings).shoppingListIgnoreBehaviour.valueOf());
        //                     return;
        //                 }
        //                 this.ctx.settings.update((s) => {
        //                     s.shoppingListIgnoreBehaviour = behaviour;
        //                     return s;
        //                 });
        //                 await this.plugin.saveSettings();
        //             });
        //     });
    }
}
