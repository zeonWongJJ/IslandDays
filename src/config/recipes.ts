import type { FurnitureItemId, ItemId } from './items.ts';

export interface Recipe {
  output: FurnitureItemId;
  recipe: ItemId;
  materials: Partial<Record<ItemId, number>>;
}

export const RECIPES: Record<FurnitureItemId, Recipe> = {
  furniture_stool: {
    output: 'furniture_stool',
    recipe: 'recipe_stool',
    materials: { wood: 3, branch: 2 },
  },
  furniture_table: {
    output: 'furniture_table',
    recipe: 'recipe_table',
    materials: { wood: 6, branch: 4 },
  },
  furniture_bed: {
    output: 'furniture_bed',
    recipe: 'recipe_bed',
    materials: { wood: 10, branch: 6, stone: 2 },
  },
  furniture_lamp: {
    output: 'furniture_lamp',
    recipe: 'recipe_lamp',
    materials: { wood: 2, stone: 3, branch: 1 },
  },
  furniture_rug: {
    output: 'furniture_rug',
    recipe: 'recipe_rug',
    materials: { wood: 4, branch: 8 },
  },
  furniture_chair: {
    output: 'furniture_chair',
    recipe: 'recipe_chair',
    materials: { wood: 4, branch: 2 },
  },
  furniture_sofa: {
    output: 'furniture_sofa',
    recipe: 'recipe_sofa',
    materials: { wood: 8, branch: 6, stone: 4 },
  },
  furniture_bookcase: {
    output: 'furniture_bookcase',
    recipe: 'recipe_bookcase',
    materials: { wood: 8, branch: 4 },
  },
  furniture_desk: {
    output: 'furniture_desk',
    recipe: 'recipe_desk',
    materials: { wood: 6, branch: 3 },
  },
  furniture_coffeeTable: {
    output: 'furniture_coffeeTable',
    recipe: 'recipe_coffeeTable',
    materials: { wood: 4, branch: 2 },
  },
  furniture_bench: {
    output: 'furniture_bench',
    recipe: 'recipe_bench',
    materials: { wood: 5, branch: 3 },
  },
  furniture_sideTable: {
    output: 'furniture_sideTable',
    recipe: 'recipe_sideTable',
    materials: { wood: 3, branch: 1 },
  },
  furniture_cabinet: {
    output: 'furniture_cabinet',
    recipe: 'recipe_cabinet',
    materials: { wood: 10, stone: 2, branch: 4 },
  },
  furniture_lampTable: {
    output: 'furniture_lampTable',
    recipe: 'recipe_lampTable',
    materials: { wood: 2, stone: 3 },
  },
  furniture_rugSquare: {
    output: 'furniture_rugSquare',
    recipe: 'recipe_rugSquare',
    materials: { wood: 4, branch: 6 },
  },
};

export function hasRecipe(
  inventory: Partial<Record<ItemId, number>>,
  output: FurnitureItemId,
): boolean {
  return (inventory[RECIPES[output].recipe] ?? 0) > 0;
}

export function hasMaterials(
  inventory: Partial<Record<ItemId, number>>,
  output: FurnitureItemId,
): boolean {
  const recipe = RECIPES[output];
  for (const [id, need] of Object.entries(recipe.materials) as [ItemId, number][]) {
    if ((inventory[id] ?? 0) < need) return false;
  }
  return true;
}

export const FURNITURE_TO_RECIPE: Record<FurnitureItemId, ItemId> = {
  furniture_stool: 'recipe_stool',
  furniture_table: 'recipe_table',
  furniture_bed: 'recipe_bed',
  furniture_lamp: 'recipe_lamp',
  furniture_rug: 'recipe_rug',
  furniture_chair: 'recipe_chair',
  furniture_sofa: 'recipe_sofa',
  furniture_bookcase: 'recipe_bookcase',
  furniture_desk: 'recipe_desk',
  furniture_coffeeTable: 'recipe_coffeeTable',
  furniture_bench: 'recipe_bench',
  furniture_sideTable: 'recipe_sideTable',
  furniture_cabinet: 'recipe_cabinet',
  furniture_lampTable: 'recipe_lampTable',
  furniture_rugSquare: 'recipe_rugSquare',
};
