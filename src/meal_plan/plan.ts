import { App, TFile } from 'obsidian';
import { get } from 'svelte/store';
import { DAYS_OF_WEEK } from '../constants';
import type { Recipe } from '../recipe/recipe';
import { settings } from '../settings';
import { get_current_week } from './utils';

export async function add_recipe_to_meal_plan(recipe: Recipe, day: string) {
    let file_path = get(settings).meal_plan_note;
    if (!file_path.endsWith('.md')) {
        file_path += '.md';
    }

    await fill_meal_plan_note(file_path);

    const file = app.vault.getAbstractFileByPath(file_path);
    if (file instanceof TFile) {
        file.vault.process(file, (content) => {
            const header = `Week of ${get_current_week()}`;
            const header_index = content.indexOf(header) + header.length;
            const day_header = `## ${day}`;
            const day_header_index = content.indexOf(day_header, header_index) + day_header.length;

            const recipe_line = `\n- [[${recipe.name}]]`;

            content = content.slice(0, day_header_index) + recipe_line + content.slice(day_header_index);

            return content;
        });
    }
}

export async function open_meal_plan_note(file_path: string) {
    if (!file_path.endsWith('.md')) {
        file_path += '.md';
    }
    await create_meal_plan_note(file_path);

    let found = false;
    app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.getDisplayText() === file_path.substring(0, file_path.length - 3)) {
            // console.log(leaf.getDisplayText());
            app.workspace.setActiveLeaf(leaf);
            found = true;
        }
    });

    if (!found) {
        await app.workspace.openLinkText(file_path, '', true);
    }

    fill_meal_plan_note(file_path);
}

async function fill_meal_plan_note(file_path: string) {
    const header = `Week of ${get_current_week()}`;
    const day_headers = DAYS_OF_WEEK.map((day) => {
        return `## ${day}`;
    });

    const file = app.vault.getAbstractFileByPath(file_path);
    if (file instanceof TFile) {
        app.vault.process(file, (content) => {
            if (content.contains(header)) {
                return content;
            }

            return `# ${header}\n${day_headers.join('\n\n')}\n${content}`;
        });
    }
}

async function create_meal_plan_note(file_path: string) {
    const file = app.vault.getAbstractFileByPath(file_path);
    if (file === undefined) {
        await app.vault.create(file_path, '');
    } else {
        if (!(file instanceof TFile)) {
            console.error('Meal plan note is not a file');
        }
    }
}
