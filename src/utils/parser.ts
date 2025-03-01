import { type Ingredient as TIngredient, parseIngredient } from 'parse-ingredient';
import { singular } from 'pluralize';
import { Err, Ok, type Result } from 'ts-results-es';
import type { AltIngredient, Ingredient, ParseErrors } from '../types.ts';

export function ParseIngredient(content: string, advancedParse: boolean): Result<Ingredient, ParseErrors> {
    // Parse the ingredient line
    const linePrefix = '-';
    const prefixIndex = content.indexOf(linePrefix);
    if (prefixIndex < 0) {
        return Err('NO_INGREDIENT');
    }

    let ingredientContent = content;
    if (prefixIndex >= 0) {
        ingredientContent = ingredientContent.substring(prefixIndex + 1).trim();
    }

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
        console.debug(ingredientContent);
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
