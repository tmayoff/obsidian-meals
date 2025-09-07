import { parseIngredient, type Ingredient as TIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import { Err, Ok, type Result } from 'ts-results-es';
import type { AltIngredient, Ingredient, ParseErrors } from '../types.ts';
import { ErrCtx } from './result.ts';

export function GetRecipeMDFormatBoundedList(content: string): Result<string[], ParseErrors> {
    // Ingredient content is between --- & ---
    const start = content.indexOf('---') + '---'.length;
    if (start < 0) {
        return Err('NOT_RECIPE_MD_FORMAT');
    }

    const end = content.indexOf('---', start);
    if (end < 0) {
        return Err('INGREDIENT_SECTION_DOESNT_END');
    }
    content = content.substring(start, end).trim();

    return Ok(
        content
            .split('\n')
            .filter((line) => {
                return line.length > 0;
            })
            .map((l) => {
                return l.trim();
            }),
    );
}

const linePrefix = /^((- \[ \] )|(- ))([^[\]]*$)/;

export function GetIngredientsFromList(list: string[], advancedParsing: boolean, debug: boolean): Result<Ingredient[], ErrCtx> {
    const rawIngredient = list.filter((i) => {
        return linePrefix.test(i);
    });

    if (debug) {
        console.debug(rawIngredient);
    }

    const ingredients: Ingredient[] = [];
    for (const rawIngredient of list) {
        if (debug) {
            console.debug('Parsing ingredient, raw line: ', rawIngredient);
        }

        const ingredient = ParseIngredient(rawIngredient, advancedParsing);
        if (ingredient.isOk()) {
            if (debug) {
                console.debug('Final ingredient output', ingredient.value);
            }
            ingredients.push(ingredient.value);
        } else if (ingredient.error !== 'NO_INGREDIENT') {
            console.error(ingredient.error);
            return Err(new ErrCtx(rawIngredient, ingredient.error));
        }
    }

    return Ok(ingredients);
}

export function ParseIngredient(content: string, advancedParse: boolean): Result<Ingredient, ParseErrors> {
    // Parse the ingredient line
    const match = content.match(linePrefix);
    if (match === null) {
        return Err('NO_INGREDIENT');
    }

    let ingredientContent = match[4];

    if (ingredientContent === '') {
        return Err('INGREDIENT_EMPTY');
    }

    let altIngredients: AltIngredient = {
        altQuantity: null,
        altUnitOfMeasure: null,
        altUnitOfMeasureID: null,
    };
    if (advancedParse) {
        const obj = AdvancedParse(ingredientContent);
        ingredientContent = obj.ingredientContent;
        altIngredients = obj.altIngredients;
    }

    let tingredient: TIngredient | null = null;
    for (const candidate of parseIngredient(ingredientContent)) {
        if (candidate.isGroupHeader) {
            return Err('INGREDIENT_EMPTY');
        }
        tingredient = candidate;
    }

    if (tingredient == null) {
        // console.error('Failed to parse ingredient', ingredientContent);
        // new Notice(`Failed to parse ingredient '${ingredientContent}'`); // TODO improve the message
        return Err('INGREDIENT_FAILED_TO_PARSE');
    }

    if (advancedParse) {
        tingredient.description = singular(tingredient.description);
    }

    return Ok({
        ...tingredient,
        ...altIngredients,
    });
}

const regex = /\((.*?)\)/;
export function AdvancedParse(ingredientContent: string) {
    // ============================
    // Special ingredient parsing
    // =============================

    let altIngredients: AltIngredient = {
        altQuantity: null,
        altUnitOfMeasure: null,
        altUnitOfMeasureID: null,
    };

    // Ingredients with (...) will be parsed as follows: if it contains another alternate quantity: 17 oz (200g), it will be added as an alternate quantity otherwise it'll be ignored

    if (regex.test(ingredientContent)) {
        // Regex match all '(...)'
        const match = regex.exec(ingredientContent);
        if (match != null) {
            // This hack is required due to the parseIngredient function expected a description, without it 200g is parsed into: {quantity: 200, description: 'g'}
            const extraQuantity = `DUMMY_INGREDIENT ${match[0]}`;
            const ingredients = parseIngredient(extraQuantity);
            if (ingredients.length > 0) {
                altIngredients = {
                    altQuantity: ingredients[0].quantity,
                    altUnitOfMeasure: ingredients[0].unitOfMeasure,
                    altUnitOfMeasureID: ingredients[0].unitOfMeasureID,
                };
            }
            ingredientContent = ingredientContent.replace(regex, '');
        }
    }

    // Ingredient name ignores everything after the first comma
    // 200g onions, chopped
    // ~~~~~~~~~~~
    // 200g onion

    const firstComma = ingredientContent.indexOf(',');

    if (firstComma >= 0) {
        ingredientContent = ingredientContent.substring(0, firstComma);
    }

    return { ingredientContent, altIngredients };
}
