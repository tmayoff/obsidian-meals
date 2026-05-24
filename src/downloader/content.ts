import type { Recipe } from 'schema-dts';

export interface DownloadedContent {
    recipeName: string;
    recipeContent: string;
    recipe: Recipe | null;
}
