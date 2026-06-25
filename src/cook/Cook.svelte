<script lang="ts">
import type { Recipe } from '../recipe/recipe';

type Props = {
    recipe: Recipe;
};

let { recipe }: Props = $props();

console.log(recipe);
</script>

<div>
  <h1>{recipe.name}</h1>
</div>
