import { describe, expect, test } from 'vitest';
import { DownloadRecipeFileContent } from '../recipe/downloader';

describe('Download', () => {
    test('Download: red-lentil-dahl', async () => {
        const url = 'https://www.noracooks.com/red-lentil-dahl';
        const result = await DownloadRecipeFileContent(url, true);
        expect(result.isOk()).toBe(true);

        const { recipeName, recipeContent } = result.unwrap();
        expect(recipeName).toBe('Quick & Easy Red Lentil Dahl');
        expect(recipeContent).toBe(`---
source: ${url}
servings: 8,8 servings
calories: 258 kcal
fat: 13 g
saturatedFat: 9 g
carbohydrate: 28 g
sugar: 3 g
fiber: 12 g
protein: 11 g
sodium: 732 mg
---

# Quick & Easy Red Lentil Dahl
Made in one pot in just 30 minutes, this is guaranteed to be the easiest lentil dahl recipe you ever try! It’s rich and creamy, made with budget-friendly ingredients, and packed with plant protein and fiber.

**8,8 servings servings**

---
- 1 tablespoon olive oil
- 1 large yellow onion, chopped small
- 5 cloves garlic, minced
- 1 tablespoon fresh ginger, peeled and grated
- 1 tablespoon garam masala
- 1 teaspoon ground turmeric
- 1/2 teaspoon red pepper chili flakes
- 1 1/2 cups dried red lentils
- 14 ounce can diced tomatoes
- 13.5 ounce can full fat coconut milk
- 3 cups vegetable broth
- 1 teaspoon salt, or to taste
- half a lemon, juiced
- 3-4 cups baby spinach
- 4 cups cooked brown or white rice
- Vegan Naan
---
`);
    });
    test('Download: pork souvlaki', async () => {
        const url = 'https://s.samsungfood.com/JwKRp';
        const result = await DownloadRecipeFileContent(url, true);
        expect(result.isOk()).toBe(true);

        const { recipeName, recipeContent } = result.unwrap();
        expect(recipeName).toBe('pork souvlaki');
        expect(recipeContent).toBe(`---
source: ${url}
servings: 2
calories: 399.39 calories
fat: 31.52 g
saturatedFat: 8.04 g
carbohydrate: 4.84 g
sugar: 0.91 g
fiber: 1.62 g
protein: 24.49 g
cholesterol: 85.44 mg
---

# pork souvlaki
Greek traditional pork souvlaki plus one ☝️ new tip for juicier souvlaki ! I know I have done this recipe a couple of times, but is always so good and I’m never tired of this, also I want to say a big thank you for all the love and support you give me, thank you so much for 100K Followers❤️ also click the link in my bio , you can find my favorite kitchen products and I use into my everyday cooking! 
Recipe below 👇⬇️👇
• ingredients:
- pork shoulder or belly in cubes 
- salt 
- pepper 
- oregano 
- olive oil, lemon juice 
• instructions:
- poke the cubes into the skewers about 8 pork cubes 
- add salt &amp; pepper, oregano, olive oil, lemon juice you can add 1 minced garlic clove too ( optional) 
- grill them or stir fry them for about 10 mins each side, once you turn side cover with a heavy lid over the souvlaki, that way will be cooked faster and some of the steams will keep it softer inside and won’t come out dry! 
- enjoy either as they are or with bread, or pita bread, tzatziki or tirokafteri or wrap them as a yiro! No matter how though, one thing is sure that are insanely delicious! 

**2 servings**

---
- pork shoulder or belly in cubes
- salt
- pepper
- oregano
- olive oil, lemon juice
---
`);
    });
});
