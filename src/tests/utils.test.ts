import { Err, Ok, type Result } from 'ts-results-es';
import { expect, test } from 'vitest';
import { ShoppingListIgnoreBehaviour } from '../settings/settings.ts';
import { BehaviourValidationError, validateIgnoreBehaviour, wildcardToRegex } from '../utils/utils.ts';

test('wildcardToRegex', () => {
    interface Test {
        input: string;
        expected: RegExp;
    }

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
            input: ['salt['],
            expected: Err(
                new BehaviourValidationError(
                    "Shopping list's ignore items are invalid: Invalid regular expression: /salt[/: Unterminated character class.",
                ),
            ),
        },
    ];

    for (const test of tests) {
        const actual = validateIgnoreBehaviour(test.input, ShoppingListIgnoreBehaviour.Regex);

        if (test.expected.isOk()) {
            expect(actual).toStrictEqual(test.expected);
        } else {
            expect(actual.unwrapErr().message).toStrictEqual(test.expected.unwrapErr().message);
        }
    }
});

test('validateIgnoreBehaviour_Wildcard', () => {
    interface Test {
        input: string[];
        expected: Result<boolean, BehaviourValidationError>;
    }

    const tests: Test[] = [
        {
            input: ['salt*', 'pepper'],
            expected: Ok(true),
        },
        {
            input: ['salt['],
            expected: Err(
                new BehaviourValidationError(
                    "Shopping list's ignore items are invalid: Invalid regular expression: /salt[/: Unterminated character class.",
                ),
            ),
        },
    ];

    for (const test of tests) {
        const actual = validateIgnoreBehaviour(test.input, ShoppingListIgnoreBehaviour.Regex);

        if (test.expected.isOk()) {
            expect(actual).toStrictEqual(test.expected);
        } else {
            expect(actual.unwrapErr().message).toStrictEqual(test.expected.unwrapErr().message);
        }
    }
});
