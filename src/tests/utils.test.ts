import { Ok, type Result } from 'ts-results-es';
import { expect, test } from 'vitest';
import { ShoppingListIgnoreBehaviour } from '../settings/settings.ts';
import { type BehaviourValidationError, validateIgnoreBehaviour, wildcardToRegex } from '../utils/utils.ts';

test('wildcardToRegex', () => {
    interface Test {
        input: string;
        expected: RegExp;
    }

    // biome-ignore lint/performance/useTopLevelRegex: <explanation>
    const tests: Test[] = [{ input: '*', expected: /^.*$/ }];

    for (const test of tests) {
        const actual = wildcardToRegex(test.input);

        expect(actual).toStrictEqual(test.expected);
    }
});

test('validateIgnoreBehaviour_ExactPartial', () => {
    const input = ['salt', 'pepper'];

    let res = validateIgnoreBehaviour(input, ShoppingListIgnoreBehaviour.Exact);

    expect(res.isOk());

    res = validateIgnoreBehaviour(input, ShoppingListIgnoreBehaviour.Exact);

    expect(res.isOk());
});

test('validateIgnoreBehaviour_Regex', () => {
    interface Test {
        input: string[];
        expected: Result<boolean, BehaviourValidationError>;
    }

    const tests: Test[] = [
        {
            input: ['salt.*', 'pepper'],
            expected: Ok(true),
        },
        {
            // TODO(tyler) Failing test here
            input: ['salt'],
            expected: Ok(true),
        },
    ];

    for (const test of tests) {
        const actual = validateIgnoreBehaviour(test.input, ShoppingListIgnoreBehaviour.Regex);
        expect(actual).toStrictEqual(test.expected);
    }
});
