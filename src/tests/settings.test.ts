import { expect, test } from 'vitest';
import { MealSettings } from '../settings/settings.ts';

test('MealSettings has showRecipeParseErrors setting', () => {
    const settings = new MealSettings();

    expect(settings).toHaveProperty('showRecipeParseErrors');
});

test('showRecipeParseErrors defaults to false', () => {
    const settings = new MealSettings();

    expect(settings.showRecipeParseErrors).toBe(false);
});

test('showRecipeParseErrors can be set to true', () => {
    const settings = new MealSettings();

    settings.showRecipeParseErrors = true;

    expect(settings.showRecipeParseErrors).toBe(true);
});
