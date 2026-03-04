/**
 * All 122 keto-friendly ingredients organized by category
 * Each ingredient has an id and translationKey for i18n support
 */

export interface Ingredient {
  id: string
  translationKey: string
  category: 'meat' | 'fish' | 'dairy' | 'vegetables' | 'nuts' | 'fats' | 'herbs'
}

const ingredients: Ingredient[] = [
  // MEAT (15)
  { id: 'beef', translationKey: 'ingredients.meat.beef', category: 'meat' },
  { id: 'chicken', translationKey: 'ingredients.meat.chicken', category: 'meat' },
  { id: 'pork', translationKey: 'ingredients.meat.pork', category: 'meat' },
  { id: 'lamb', translationKey: 'ingredients.meat.lamb', category: 'meat' },
  { id: 'turkey', translationKey: 'ingredients.meat.turkey', category: 'meat' },
  { id: 'bacon', translationKey: 'ingredients.meat.bacon', category: 'meat' },
  { id: 'ham', translationKey: 'ingredients.meat.ham', category: 'meat' },
  { id: 'duck', translationKey: 'ingredients.meat.duck', category: 'meat' },
  { id: 'veal', translationKey: 'ingredients.meat.veal', category: 'meat' },
  { id: 'venison', translationKey: 'ingredients.meat.venison', category: 'meat' },
  { id: 'rabbit', translationKey: 'ingredients.meat.rabbit', category: 'meat' },
  { id: 'goat', translationKey: 'ingredients.meat.goat', category: 'meat' },
  { id: 'bison', translationKey: 'ingredients.meat.bison', category: 'meat' },
  { id: 'sausage', translationKey: 'ingredients.meat.sausage', category: 'meat' },
  { id: 'ground-meat', translationKey: 'ingredients.meat.groundMeat', category: 'meat' },

  // FISH (18)
  { id: 'salmon', translationKey: 'ingredients.fish.salmon', category: 'fish' },
  { id: 'cod', translationKey: 'ingredients.fish.cod', category: 'fish' },
  { id: 'mackerel', translationKey: 'ingredients.fish.mackerel', category: 'fish' },
  { id: 'herring', translationKey: 'ingredients.fish.herring', category: 'fish' },
  { id: 'tuna', translationKey: 'ingredients.fish.tuna', category: 'fish' },
  { id: 'trout', translationKey: 'ingredients.fish.trout', category: 'fish' },
  { id: 'sardines', translationKey: 'ingredients.fish.sardines', category: 'fish' },
  { id: 'anchovies', translationKey: 'ingredients.fish.anchovies', category: 'fish' },
  { id: 'halibut', translationKey: 'ingredients.fish.halibut', category: 'fish' },
  { id: 'sea-bass', translationKey: 'ingredients.fish.seaBass', category: 'fish' },
  { id: 'flounder', translationKey: 'ingredients.fish.flounder', category: 'fish' },
  { id: 'shrimp', translationKey: 'ingredients.fish.shrimp', category: 'fish' },
  { id: 'crab', translationKey: 'ingredients.fish.crab', category: 'fish' },
  { id: 'lobster', translationKey: 'ingredients.fish.lobster', category: 'fish' },
  { id: 'mussels', translationKey: 'ingredients.fish.mussels', category: 'fish' },
  { id: 'clams', translationKey: 'ingredients.fish.clams', category: 'fish' },
  { id: 'oysters', translationKey: 'ingredients.fish.oysters', category: 'fish' },
  { id: 'caviar', translationKey: 'ingredients.fish.caviar', category: 'fish' },

  // DAIRY (18)
  { id: 'cheddar', translationKey: 'ingredients.dairy.cheddar', category: 'dairy' },
  { id: 'mozzarella', translationKey: 'ingredients.dairy.mozzarella', category: 'dairy' },
  { id: 'brie', translationKey: 'ingredients.dairy.brie', category: 'dairy' },
  { id: 'feta', translationKey: 'ingredients.dairy.feta', category: 'dairy' },
  { id: 'gouda', translationKey: 'ingredients.dairy.gouda', category: 'dairy' },
  { id: 'parmesan', translationKey: 'ingredients.dairy.parmesan', category: 'dairy' },
  { id: 'cream-cheese', translationKey: 'ingredients.dairy.creamCheese', category: 'dairy' },
  { id: 'blue-cheese', translationKey: 'ingredients.dairy.blueChees', category: 'dairy' },
  { id: 'butter', translationKey: 'ingredients.dairy.butter', category: 'dairy' },
  { id: 'ghee', translationKey: 'ingredients.dairy.ghee', category: 'dairy' },
  { id: 'heavy-cream', translationKey: 'ingredients.dairy.heavyCream', category: 'dairy' },
  { id: 'sour-cream', translationKey: 'ingredients.dairy.sourCream', category: 'dairy' },
  { id: 'greek-yogurt', translationKey: 'ingredients.dairy.greekYogurt', category: 'dairy' },
  { id: 'milk', translationKey: 'ingredients.dairy.milk', category: 'dairy' },
  { id: 'cottage-cheese', translationKey: 'ingredients.dairy.cottageChees', category: 'dairy' },
  { id: 'eggs', translationKey: 'ingredients.dairy.eggs', category: 'dairy' },
  { id: 'ricotta', translationKey: 'ingredients.dairy.ricotta', category: 'dairy' },
  { id: 'halloumi', translationKey: 'ingredients.dairy.halloumi', category: 'dairy' },

  // VEGETABLES (31)
  { id: 'spinach', translationKey: 'ingredients.vegetables.spinach', category: 'vegetables' },
  { id: 'kale', translationKey: 'ingredients.vegetables.kale', category: 'vegetables' },
  { id: 'broccoli', translationKey: 'ingredients.vegetables.broccoli', category: 'vegetables' },
  { id: 'cauliflower', translationKey: 'ingredients.vegetables.cauliflower', category: 'vegetables' },
  { id: 'brussels-sprouts', translationKey: 'ingredients.vegetables.brusselsSprouts', category: 'vegetables' },
  { id: 'cabbage', translationKey: 'ingredients.vegetables.cabbage', category: 'vegetables' },
  { id: 'zucchini', translationKey: 'ingredients.vegetables.zucchini', category: 'vegetables' },
  { id: 'cucumber', translationKey: 'ingredients.vegetables.cucumber', category: 'vegetables' },
  { id: 'celery', translationKey: 'ingredients.vegetables.celery', category: 'vegetables' },
  { id: 'bell-pepper', translationKey: 'ingredients.vegetables.bellPepper', category: 'vegetables' },
  { id: 'asparagus', translationKey: 'ingredients.vegetables.asparagus', category: 'vegetables' },
  { id: 'green-beans', translationKey: 'ingredients.vegetables.greenBeans', category: 'vegetables' },
  { id: 'lettuce', translationKey: 'ingredients.vegetables.lettuce', category: 'vegetables' },
  { id: 'arugula', translationKey: 'ingredients.vegetables.arugula', category: 'vegetables' },
  { id: 'mushrooms', translationKey: 'ingredients.vegetables.mushrooms', category: 'vegetables' },
  { id: 'tomato', translationKey: 'ingredients.vegetables.tomato', category: 'vegetables' },
  { id: 'avocado', translationKey: 'ingredients.vegetables.avocado', category: 'vegetables' },
  { id: 'olives', translationKey: 'ingredients.vegetables.olives', category: 'vegetables' },
  { id: 'artichoke', translationKey: 'ingredients.vegetables.artichoke', category: 'vegetables' },
  { id: 'radish', translationKey: 'ingredients.vegetables.radish', category: 'vegetables' },
  { id: 'turnip', translationKey: 'ingredients.vegetables.turnip', category: 'vegetables' },
  { id: 'eggplant', translationKey: 'ingredients.vegetables.eggplant', category: 'vegetables' },
  { id: 'leek', translationKey: 'ingredients.vegetables.leek', category: 'vegetables' },
  { id: 'onion', translationKey: 'ingredients.vegetables.onion', category: 'vegetables' },
  { id: 'garlic', translationKey: 'ingredients.vegetables.garlic', category: 'vegetables' },
  { id: 'bok-choy', translationKey: 'ingredients.vegetables.bokChoy', category: 'vegetables' },
  { id: 'swiss-chard', translationKey: 'ingredients.vegetables.swissChimney', category: 'vegetables' },
  { id: 'collard-greens', translationKey: 'ingredients.vegetables.collardGreens', category: 'vegetables' },
  { id: 'watercress', translationKey: 'ingredients.vegetables.watercress', category: 'vegetables' },
  { id: 'endive', translationKey: 'ingredients.vegetables.endive', category: 'vegetables' },
  { id: 'fennel', translationKey: 'ingredients.vegetables.fennel', category: 'vegetables' },

  // NUTS (15)
  { id: 'almonds', translationKey: 'ingredients.nuts.almonds', category: 'nuts' },
  { id: 'walnuts', translationKey: 'ingredients.nuts.walnuts', category: 'nuts' },
  { id: 'macadamia', translationKey: 'ingredients.nuts.macadamia', category: 'nuts' },
  { id: 'pecans', translationKey: 'ingredients.nuts.pecans', category: 'nuts' },
  { id: 'hazelnuts', translationKey: 'ingredients.nuts.hazelnuts', category: 'nuts' },
  { id: 'brazil-nuts', translationKey: 'ingredients.nuts.brazilNuts', category: 'nuts' },
  { id: 'pine-nuts', translationKey: 'ingredients.nuts.pineNuts', category: 'nuts' },
  { id: 'sunflower-seeds', translationKey: 'ingredients.nuts.sunflowerSeeds', category: 'nuts' },
  { id: 'pumpkin-seeds', translationKey: 'ingredients.nuts.pumpkinSeeds', category: 'nuts' },
  { id: 'sesame-seeds', translationKey: 'ingredients.nuts.sesameSeeds', category: 'nuts' },
  { id: 'flax-seeds', translationKey: 'ingredients.nuts.flaxSeeds', category: 'nuts' },
  { id: 'chia-seeds', translationKey: 'ingredients.nuts.chiaSeeds', category: 'nuts' },
  { id: 'almond-butter', translationKey: 'ingredients.nuts.almondButter', category: 'nuts' },
  { id: 'peanut-butter', translationKey: 'ingredients.nuts.peanutButter', category: 'nuts' },
  { id: 'tahini', translationKey: 'ingredients.nuts.tahini', category: 'nuts' },

  // FATS (10)
  { id: 'coconut-oil', translationKey: 'ingredients.fats.coconutOil', category: 'fats' },
  { id: 'olive-oil', translationKey: 'ingredients.fats.oliveOil', category: 'fats' },
  { id: 'avocado-oil', translationKey: 'ingredients.fats.avocadoOil', category: 'fats' },
  { id: 'mct-oil', translationKey: 'ingredients.fats.mctOil', category: 'fats' },
  { id: 'lard', translationKey: 'ingredients.fats.lard', category: 'fats' },
  { id: 'tallow', translationKey: 'ingredients.fats.tallow', category: 'fats' },
  { id: 'sesame-oil', translationKey: 'ingredients.fats.sesameOil', category: 'fats' },
  { id: 'walnut-oil', translationKey: 'ingredients.fats.walnutOil', category: 'fats' },
  { id: 'hemp-oil', translationKey: 'ingredients.fats.hempOil', category: 'fats' },
  { id: 'bacon-fat', translationKey: 'ingredients.fats.baconFat', category: 'fats' },

  // HERBS (15)
  { id: 'basil', translationKey: 'ingredients.herbs.basil', category: 'herbs' },
  { id: 'oregano', translationKey: 'ingredients.herbs.oregano', category: 'herbs' },
  { id: 'thyme', translationKey: 'ingredients.herbs.thyme', category: 'herbs' },
  { id: 'rosemary', translationKey: 'ingredients.herbs.rosemary', category: 'herbs' },
  { id: 'sage', translationKey: 'ingredients.herbs.sage', category: 'herbs' },
  { id: 'parsley', translationKey: 'ingredients.herbs.parsley', category: 'herbs' },
  { id: 'cilantro', translationKey: 'ingredients.herbs.cilantro', category: 'herbs' },
  { id: 'dill', translationKey: 'ingredients.herbs.dill', category: 'herbs' },
  { id: 'mint', translationKey: 'ingredients.herbs.mint', category: 'herbs' },
  { id: 'black-pepper', translationKey: 'ingredients.herbs.blackPepper', category: 'herbs' },
  { id: 'sea-salt', translationKey: 'ingredients.herbs.seaSalt', category: 'herbs' },
  { id: 'cumin', translationKey: 'ingredients.herbs.cumin', category: 'herbs' },
  { id: 'paprika', translationKey: 'ingredients.herbs.paprika', category: 'herbs' },
  { id: 'cayenne', translationKey: 'ingredients.herbs.cayenne', category: 'herbs' },
  { id: 'garlic-powder', translationKey: 'ingredients.herbs.garlicPowder', category: 'herbs' },
]

/**
 * Get all ingredients, optionally filtered by category
 */
export function getIngredients(category?: string): Ingredient[] {
  if (category) {
    return ingredients.filter(ing => ing.category === category)
  }
  return ingredients
}

/**
 * Get unique categories
 */
export function getCategories(): Array<'meat' | 'fish' | 'dairy' | 'vegetables' | 'nuts' | 'fats' | 'herbs'> {
  return ['meat', 'fish', 'dairy', 'vegetables', 'nuts', 'fats', 'herbs']
}

/**
 * Get ingredient by ID
 */
export function getIngredientById(id: string): Ingredient | undefined {
  return ingredients.find(ing => ing.id === id)
}

/**
 * Get category translation key
 */
export function getCategoryTranslationKey(category: string): string {
  return `ingredients.categories.${category}`
}

export default ingredients
