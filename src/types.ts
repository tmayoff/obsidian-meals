import type { Ingredient as TIngredient } from 'parse-ingredient';

export interface AltIngredient {
    altQuantity: number | null;
    altUnitOfMeasure: string | null;
    altUnitOfMeasureID: string | null;
}

export type Ingredient = TIngredient & AltIngredient;

export type ParseErrors =
    | 'NO_INGREDIENT'
    | 'INGREDIENT_FAILED_TO_PARSE'
    | 'INGREDIENT_EMPTY'
    | 'NOT_RECIPE_MD_FORMAT'
    | 'INGREDIENT_SECTION_DOESNT_END'
    | 'MISSING_INGREDIENT_HEADING';
