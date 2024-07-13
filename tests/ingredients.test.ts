import { expect, test } from 'vitest';
import { testingExports } from '../src/recipe/ingredients.ts'

test('AdvancedParsing', () => {
    const tests = [{ input: '', output: {} }];

    for (const test of tests) {
        testingExports.AdvancedParse();
    }
});
