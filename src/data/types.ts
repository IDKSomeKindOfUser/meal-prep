export const ALLERGENS = [
  'gluten', 'milk', 'eggs', 'fish', 'crustaceans',
  'peanuts', 'nuts', 'soy', 'sesame', 'mustard',
] as const
export type Allergen = (typeof ALLERGENS)[number]

/** Allergens that are present, and those the product may contain. Both are excluded for an allergic user. */
export interface AllergenInfo {
  contains: Allergen[]
  may: Allergen[]
}

/** Lactose is separate from milk allergy: lactose-free milk has milk protein. */
export type Lactose = 'none' | 'low' | 'yes'

export interface Ingredient {
  id: string
  name: string
  category: string
  /** Nutrition per 100 g of raw product. */
  kcal: number
  protein: number
  fat: number
  carbs: number
  /** Weight of one piece in grams, for products counted in pieces. */
  pieceGrams: number | null
  pieceLabel: string | null
  /** `free` is water: it is never bought. */
  buyBy: 'weight' | 'pack' | 'free'
  place: 'market' | 'store' | null
  allergens: AllergenInfo
  lactose: Lactose
}

export type MealType = 'breakfast' | 'main' | 'snack'

export interface Recipe {
  id: string
  type: MealType
  name: string
  cuisine: string
  tools: string[]
  minutes: number
  /** Days in the fridge. */
  keepDays: number
  freezable: boolean
  spicy: boolean
  /** Grams of raw product per portion. */
  ingredients: { id: string; grams: number }[]
  /** Free text: spices are assumed to be at home. */
  spices: string
  /** Allergens hidden in `spices`. */
  spiceAllergens: AllergenInfo
  steps: string[]
  source: unknown
  /** Nutrition per portion, as recorded in the source. */
  kcal: number
  protein: number
  fat: number
  carbs: number
  /** Weight of a cooked portion in grams. */
  cookedGrams: number
  /** ISO date the dish was added; it is marked as new for a week. */
  added?: string
}
