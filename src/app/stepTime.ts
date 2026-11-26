export type Piece = string | { text: string; seconds: number }

const TIME = /(\d+)(?:\s*[–-]\s*(\d+))?\s*(минут[а-я]*|мин\b\.?|час[а-я]*)/gi

/** Splits a step into plain text and time spans; a range like "8–10 минут" counts as its longer end. */
export function splitTimes(step: string): Piece[] {
  const out: Piece[] = []
  let last = 0
  for (const m of step.matchAll(TIME)) {
    const value = Number(m[2] ?? m[1])
    const seconds = value * (m[3]!.toLowerCase().startsWith('ч') ? 3600 : 60)
    if (m.index > last) out.push(step.slice(last, m.index))
    out.push({ text: m[0], seconds })
    last = m.index + m[0].length
  }
  if (last < step.length) out.push(step.slice(last))
  return out
}
