import { Timer as TimerIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { splitTimes } from './stepTime'
import { celebrate } from './confetti'

function clock(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** Created on the tap that starts a timer: browsers only allow sound after a user gesture. */
let audio: AudioContext | null = null
function wakeAudio() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch { /* no sound in this browser */ }
}

/** Three short beeps and a vibration when a timer ends. */
function ring() {
  navigator.vibrate?.([300, 150, 300, 150, 300])
  if (!audio) return
  const t = audio.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0, t + i * 0.4)
    gain.gain.linearRampToValueAtTime(0.3, t + i * 0.4 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.4 + 0.3)
    osc.connect(gain).connect(audio.destination)
    osc.start(t + i * 0.4)
    osc.stop(t + i * 0.4 + 0.32)
  }
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
      if (s === 0) { setEnd(null); ring() }
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
      onClick={() => { if (running) { setEnd(null); setLeft(seconds) } else { wakeAudio(); setLeft(seconds); setEnd(Date.now() + seconds * 1000) } }}>
      <TimerIcon aria-hidden="true" />{running ? clock(left) : done ? 'Готово' : text}
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
  const total = steps.length
  const toggle = (i: number) => {
    if (!done.has(i) && done.size + 1 === total) celebrate('dish')
    setDone((d) => { const n = new Set(d); if (!n.delete(i)) n.add(i); return n })
  }
  return (
    <>
    {total > 0 && (
      <div className="progress">
        <p aria-live="polite">{done.size} из {total} {total % 10 === 1 && total % 100 !== 11 ? 'шага' : 'шагов'}</p>
        {/* Not <progress>: browsers do not animate its fill. */}
        <div className="track" role="progressbar" aria-label="Сделано шагов" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done.size}>
          <i style={{ scale: `${done.size / total} 1` }} />
        </div>
      </div>
    )}
    <ol className="steps">
      {steps.map((s, i) => {
        const times = splitTimes(s).filter((p) => typeof p !== 'string')
        return (
          <li key={i} className={done.has(i) ? 'ticked' : undefined}>
            <label>
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} />
              <span><span className="line">{s}</span></span>
            </label>
            {times.length > 0 && <span className="timers">{times.map((t, k) => <Timer key={k} {...t} />)}</span>}
          </li>
        )
      })}
    </ol>
    </>
  )
}
