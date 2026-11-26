import { useEffect, useState } from 'react'
import { splitTimes } from './stepTime'

function clock(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** A time span in a step: a tap starts a countdown, another tap stops it. */
function Timer({ text, seconds }: { text: string; seconds: number }) {
  const [end, setEnd] = useState<number | null>(null)
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (end === null) return
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) { setEnd(null); navigator.vibrate?.([300, 150, 300]) }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [end])
  const running = end !== null
  const done = !running && left === 0
  return (
    <button type="button" className="timer" aria-pressed={running}
      aria-label={running ? `Остановить таймер, осталось ${clock(left)}` : `Запустить таймер на ${text}`}
      onClick={() => { if (running) { setEnd(null); setLeft(seconds) } else { setLeft(seconds); setEnd(Date.now() + seconds * 1000) } }}>
      {running ? clock(left) : done ? 'Готово' : text}
    </button>
  )
}

/** Steps with a tick for each one and timers; keeps the screen awake while cooking. */
export function Steps({ steps }: { steps: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    const take = () => { if (document.visibilityState === 'visible') navigator.wakeLock?.request('screen').then((l) => { lock = l }, () => {}) }
    take()
    document.addEventListener('visibilitychange', take)
    return () => { document.removeEventListener('visibilitychange', take); void lock?.release() }
  }, [])
  const toggle = (i: number) => setDone((d) => { const n = new Set(d); if (!n.delete(i)) n.add(i); return n })
  return (
    <ol className="steps">
      {steps.map((s, i) => {
        const times = splitTimes(s).filter((p) => typeof p !== 'string')
        return (
          <li key={i} className={done.has(i) ? 'ticked' : undefined}>
            <label>
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} />
              <span>{s}</span>
            </label>
            {times.length > 0 && <span className="timers">{times.map((t, k) => <Timer key={k} {...t} />)}</span>}
          </li>
        )
      })}
    </ol>
  )
}
