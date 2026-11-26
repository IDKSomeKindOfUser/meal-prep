import { useState } from 'react'
import type { Recipe } from '../data/types'
import photos from '../data/photos.json'
import { DishArt } from './DishArt'

/** Ids of the recipes that have a photo file. */
const HAS_PHOTO = new Set(Object.keys(photos))

/** The photo of a dish; the drawing stays when there is no photo or it fails to load. */
export function DishPicture({ recipe }: { recipe: Recipe }) {
  const [failed, setFailed] = useState(false)
  if (!HAS_PHOTO.has(recipe.id) || failed) return <DishArt recipe={recipe} />
  return <img className="art photo" src={`/photos/${recipe.id}.webp`} alt="" width="500" height="500" onError={() => setFailed(true)} />
}
