import { useCallback, useState } from 'react'
import type { Recipe } from '../data/types'
import photos from '../data/photos.json'

/** Ids of the recipes that have a photo file. */
const HAS_PHOTO = new Set(Object.keys(photos))

/** Same shape as a photo: a tinted tile with a plate, for dishes without a photo. */
function NoPhoto() {
  return (
    <span className="art none" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="24" cy="26" r="12" />
        <circle cx="24" cy="26" r="6.5" />
        <path d="M8 10v9a3 3 0 0 0 3 3v16M11 10v8M14 10v9a3 3 0 0 1-3 3M38 10c-3 2-4 6-4 10h4v18" />
      </svg>
    </span>
  )
}

/** The photo of a dish; a placeholder stays when there is no photo or it fails to load. */
export function DishPicture({ recipe }: { recipe: Recipe }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // Фото из кэша может загрузиться раньше, чем React повесит onLoad.
  const ref = useCallback((img: HTMLImageElement | null) => { if (img?.complete && img.naturalWidth > 0) setLoaded(true) }, [])
  if (!HAS_PHOTO.has(recipe.id) || failed) return <NoPhoto />
  return <img ref={ref} loading="lazy" className={loaded ? 'art photo' : 'art photo loading'} onLoad={() => setLoaded(true)} src={`/photos/${recipe.id}.webp`} alt="" width="500" height="500" onError={() => setFailed(true)} />
}
