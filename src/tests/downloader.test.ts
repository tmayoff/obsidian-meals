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

1. In a large pot or pan over medium heat, sauté the chopped onion in the olive oil for 5 minutes, stirring frequently. Then add the garlic and ginger and cook 1 more minute, until fragrant.
2. Add the garam masala, turmeric and red pepper flakes to the pan and stir into the onion mixture. Add a few tablespoons of water if the mixture is too dry.
3. Now add the dried lentils, canned tomatoes and their juices, coconut milk and vegetable broth to the pan. Stir well and turn the heat to high. Bring to a boil, then lower heat and simmer for about 15 minutes, until the lentils are cooked and soft. Stir occasionally.
4. Squeeze the lemon juice into the pan, and stir in the spinach as well until wilted. Add salt to taste. I used 1 teaspoon.
5. Serve with brown or white rice and Vegan Naan. Enjoy!
`);
    });
    test('Download: Fryer-Less General Tao Chicken', async () => {
        const url = 'https://www.ricardocuisine.com/en/recipes/6076-fryer-less-general-tao-chicken';
        const result = await DownloadRecipeFileContent(url, true);
        expect(result.isOk()).toBe(true);

        const { recipeName, recipeContent } = result.unwrap();
        expect(recipeName).toBe('Fryer Less General Tao Chicken');
        expect(recipeContent).toBe(`---
source: ${url}
servings: 6 serving(s)
calories: 540 calories
---

# Fryer-Less General Tao Chicken
Fryer-Less General Tao Chicken

**6 serving(s) servings**

---
- 6 tablespoons (90 ml) soy sauce
- 6 tablespoons (90 ml) chicken broth (or water)
- 6 tablespoons (90 ml) rice vinegar
- 1 to 2 tablespoons (15 to 30 ml) fresh ginger, finely chopped
- 3 cloves garlic, finely chopped
- 4 teaspoons (20 ml) cornstarch
- 2 teaspoons (10 ml) paprika
- 2 teaspoons (10 ml) sambal oelek
- 1 teaspoon (5 ml) toasted sesame oil
- 1 cup (250 ml) sugar
- 3 tablespoons (45 ml) water
- 2 red bell peppers, cut into strips
- 3/4 cup (180 ml) canola oil
- 2 lbs (1 kg) chicken skinless and boneless thighs chicken, cut into large cubes
- 1/2 cup (125 ml) unbleached all-purpose flour
- 2 green onions, thinly sliced
- Salt and pepper
---

1. In a small bowl, combine soy sauce, broth, vinegar, ginger, garlic, cornstarch, paprika, sambal oelek and sesame oil. Set aside.
2. In a small saucepan, combine sugar and water. Bring to a boil and simmer until mixture is slightly caramelized, about 5 minutes. Add soy mixture. Bring to a boil, whisking constantly. Keep sauce aside, off the heat.
3. In a large non-stick skillet, soften peppers for about 3 minutes in 30 ml (2 tablespoons) of oil. Set aside on a plate.
4. In a bowl, season chicken pieces with salt and pepper. Add flour and toss until well coated. Remove any excess flour. In the same skillet, brown half of the chicken at a time in remaining oil (150 ml/2/3 cup), making sure to always have about 1-cm (3/4-inch) of oil to fry chicken. Add oil, if needed. Drain on paper towels and keep warm. Repeat with remaining chicken. Discard oil.
5. In the same skillet, heat sauce. Add chicken and toss to coat well. Sprinkle with green onions.
6. Serve with rice and stir-fried vegetables such as bok choy or Chinese cabbage.
`);
    });
    test('Download: cuisineaz chia pudding', async () => {
        const url = 'https://www.cuisineaz.com/recettes/graines-de-chia-au-lait-de-coco-et-mangues-91786.aspx';
        const result = await DownloadRecipeFileContent(url, true);
        expect(result.isOk()).toBe(true);

        const { recipeName, recipeContent } = result.unwrap();
        expect(recipeName).toBe('Graines de Chia au lait de coco et mangues');
        expect(recipeContent).toBe(`---
source: ${url}
servings: 2
---

# Graines de Chia au lait de coco et mangues
Les graines de Chia font figure de super-aliment depuis quelque temps…

**2 servings**

---
- 200 ml Lait de coco
- 2 c. à soupe Graine(s) de chia
- 1 c. à soupe Cassonade
- 1 Mangue(s)
---

1. Mélanger les graines de chia avec le lait de coco et la cassonade la veille dans un bol. 
2. Couvrir avec du film transparent et laisser reposer toute la nuit. 
3. Le lendemain bien mélanger les graines de chia et disposer dans des verrines. 
4. Préparer la mangue : éplucher et découper en cubes.
5. Vous pouvez ensuite disposer la mangue directement sur vos graines.
6. Bon appétit !
7. Retrouvez la recette sur mon blog http://www.chezcachou.com/2016/10/graines-de-chia-au-lait-de-coco-et-mangues.html
`);
    });
});
