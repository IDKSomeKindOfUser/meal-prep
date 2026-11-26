import { BackLink } from './parts'
import photos from '../data/photos.json'
import { recipes } from '../data'

type Credit = { title: string; author: string; license: string; licenseUrl: string; source: string }

const credits = photos as Record<string, Credit>
const rows = recipes
  .filter((r) => credits[r.id])
  .map((r) => ({ id: r.id, name: r.name, ...credits[r.id]! }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

/** Strips the markup and the service words that Wikimedia Commons puts into author names. */
const person = (author: string) => author.replace(/^Original description was:\s*/i, '').trim()

export function CreditsScreen() {
  return (
    <>
      <header>
        <div className="top"><BackLink href="#settings">Назад к настройкам</BackLink></div>
        <h1 tabIndex={-1}>Авторы фото</h1>
        <p className="note">Фотографии блюд взяты с Wikimedia Commons и обрезаны до квадрата. У четырёх блюд фото нет, там рисунок.</p>
      </header>
      <section>
        <ul className="credits">
          {rows.map((r) => (
            <li key={r.id}>
              <b>{r.name}</b>
              <span>{person(r.author)}, <a href={r.licenseUrl} target="_blank" rel="noreferrer">{r.license}</a>, <a href={r.source} target="_blank" rel="noreferrer">источник</a></span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
