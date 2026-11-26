// Builds src/data/*.json from the saved page. Run: npm run extract
import { readFileSync, writeFileSync } from 'node:fs'
import { ingredientAllergens, lactose, market, packedProduce, spiceAllergens } from './annotations.mjs'

const html = readFileSync('reference/artifact.html', 'utf8')
const match = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)
if (!match) throw new Error('data block not found in reference/artifact.html')
const data = JSON.parse(match[1])

const known = new Set(Object.keys(data.ing))
const annotated = [...Object.keys(ingredientAllergens), ...Object.keys(lactose), ...market, ...packedProduce]
for (const id of annotated) if (!known.has(id)) throw new Error(`annotation for unknown product: ${id}`)

const fresh = new Set(['Мясо', 'Овощи', 'Фрукты'])
function buyBy(id, cat) {
  if (id === 'water') return 'free'
  return market.has(id) || (fresh.has(cat) && !packedProduce.has(id)) ? 'weight' : 'pack'
}

const ingredients = Object.entries(data.ing).map(([id, v]) => ({
  id, name: v.n, category: v.cat ?? '', kcal: v.k, protein: v.p, fat: v.f, carbs: v.c,
  pieceGrams: v.pc, pieceLabel: v.pcl,
  buyBy: buyBy(id, v.cat),
  place: id === 'water' ? null : market.has(id) ? 'market' : 'store',
  allergens: ingredientAllergens[id] ?? { contains: [], may: [] },
  lactose: lactose[id] ?? 'none',
}))

const types = { b: 'breakfast', m: 'main', s: 'snack' }
const recipes = data.recipes.map((r) => ({
  id: r.id, type: types[r.cat], name: r.name, cuisine: r.cuisine, tools: r.tools, minutes: r.time,
  keepDays: r.keep, freezable: r.freeze, spicy: r.spicy,
  ingredients: r.ing.map(([id, grams]) => ({ id, grams })),
  spices: r.spices, spiceAllergens: spiceAllergens(r.spices), steps: r.steps, source: r.src,
  kcal: r.kcal, protein: r.p, fat: r.f, carbs: r.c, cookedGrams: r.cooked,
}))

const save = (name, value) => writeFileSync(`src/data/${name}.json`, JSON.stringify(value, null, 1) + '\n')
save('ingredients', ingredients)
save('recipes', recipes)
// The source has a yield for a product that no longer exists.
save('yields', Object.fromEntries(Object.entries(data.yield).filter(([id]) => known.has(id))))
console.log(`${ingredients.length} ingredients, ${recipes.length} recipes`)
