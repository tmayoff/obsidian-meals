import { describe, expect, test } from 'vitest';
import { DownloadRecipeFileContent } from '../recipe/downloader';

describe('Download', () => {
    test('Download: red-lentil-dahl', async () => {
        const result = await DownloadRecipeFileContent('https://www.noracooks.com/red-lentil-dahl', true);
        expect(result.isOk()).toBe(true);
    });
});
