// Manual annotations that the source data does not have.
const a = (contains = [], may = []) => ({ contains, may })

export const ingredientAllergens = {
  egg: a(['eggs']),
  cottage: a(['milk']),
  milk: a(['milk']),
  kefir: a(['milk']),
  // Egg lysozyme is a common preservative in hard cheese.
  cheese: a(['milk'], ['eggs']),
  yogurt: a(['milk']),
  buckw: a([], ['gluten']),
  bulgur: a(['gluten']),
  couscous: a(['gluten']),
  pasta: a(['gluten'], ['eggs']),
  noodle: a(['gluten'], ['eggs']),
  // Ordinary oats are processed next to wheat; EU labelling treats them as gluten.
  oats: a(['gluten']),
  flour: a(['gluten']),
  bread: a(['gluten'], ['milk', 'eggs', 'soy', 'sesame']),
  lavash: a(['gluten']),
  tortilla: a(['gluten'], ['milk', 'soy']),
  crumbs: a(['gluten'], ['milk', 'eggs', 'soy', 'sesame']),
  semolina: a(['gluten']),
  crisp: a(['gluten'], ['milk', 'nuts', 'soy', 'sesame']),
  lentr: a([], ['gluten']),
  lentg: a([], ['gluten']),
  starch: a([], ['gluten']),
  sesoil: a(['sesame']),
  soy: a(['soy', 'gluten']),
  // Most brands ferment it with wheat or barley and soy.
  gochu: a(['soy', 'gluten']),
  ketchup: a([], ['mustard']),
  pbutter: a(['peanuts'], ['nuts', 'sesame']),
  nuts: a(['nuts'], ['peanuts']),
  choc: a([], ['milk', 'nuts', 'peanuts', 'soy', 'gluten']),
  hummus: a(['sesame'], ['mustard']),
  dates: a([], ['nuts', 'peanuts']),
  salmon: a(['fish']),
  pink: a(['fish']),
  salmsalt: a(['fish']),
  shrimp: a(['crustaceans'], ['fish']),
}

export const lactose = { cottage: 'yes', kefir: 'yes', yogurt: 'yes', cheese: 'low', bread: 'low', crumbs: 'low', tortilla: 'low', crisp: 'low', choc: 'low' }

export const market = new Set(['chicken', 'beef', 'bmince', 'bfat', 'thigh', 'turkey', 'pork', 'salmon', 'pink'])
// Frozen and dried produce, herbs and leaf salads come in packs or heads, unlike other vegetables and fruit.
export const packedProduce = new Set(['vegmix', 'gbeans', 'berries', 'dates', 'greens', 'spinach', 'iceberg'])

/** Spice mixes often contain mustard. Optional spices count as "may". */
export function spiceAllergens(spices) {
  const contains = new Set()
  const may = new Set()
  const t = spices.toLowerCase()
  if (/горчиц/.test(t)) (/горчица (по вкусу|по желанию)/.test(t) ? may : contains).add('mustard')
  if (/кунжут/.test(t)) may.add('sesame')
  if (/карри|масала|хмели|уцхо/.test(t)) may.add('mustard')
  return a([...contains], [...may])
}
