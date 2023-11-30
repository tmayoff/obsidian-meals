import moment from "moment";
import { TFile } from "obsidian";
import { DAYS_OF_WEEK } from "../constants";
import type { Recipe } from "../recipe/recipe";

export async function add_recipe_to_meal_plan(recipe: Recipe, day: string) {
  console.log("Adding recipe to meal plan");
}

export async function open_meal_plan_note(file_path: string) {
  if (!file_path.endsWith(".md")) {
    file_path += ".md";
  }
  await create_meal_plan_note(file_path);

  let found = false;
  app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.getDisplayText() == file_path.substring(0, file_path.length - 3)) {
      console.log(leaf.getDisplayText());
      app.workspace.setActiveLeaf(leaf);
      found = true;
    }
  });

  if (!found) {
    await app.workspace.openLinkText(file_path, "", true);
  }

  fill_meal_plan_note(file_path);
}

async function fill_meal_plan_note(file_path: string) {
  const header = "Week of " + get_current_week();
  const day_headers = DAYS_OF_WEEK.map((day) => {
    return "## " + day;
  });

  let file = app.vault.getAbstractFileByPath(file_path);
  if (file instanceof TFile) {
    app.vault.process(file, (content) => {
      if (content.contains(header)) {
        return content;
      } else {
        return "# " + header + "\n" + day_headers.join("\n\n") + "\n" + content;
      }
    });
  }
}

async function create_meal_plan_note(file_path: string) {
  let file = app.vault.getAbstractFileByPath(file_path);
  if (file === undefined) {
    await app.vault.create(file_path, "");
  } else {
    if (!(file instanceof TFile)) {
      console.error("Meal plan note is not a file");
    }
  }
}

function get_current_week() {
  let current_date = new Date();

  let last_sunday_date = new Date(
    current_date.setDate(current_date.getDate() - current_date.getDay())
  );

  return moment(last_sunday_date).format("MMMM Do");
}
