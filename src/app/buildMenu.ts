import type { PlanAnswer, PlanRequest } from './planner.worker'

/** Runs the search off the main thread: a month can take seconds. */
export function buildMenu(request: PlanRequest): Promise<PlanAnswer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./planner.worker.ts', import.meta.url), { type: 'module' })
    const finish = () => worker.terminate()
    worker.onmessage = ({ data }: MessageEvent<PlanAnswer>) => { finish(); resolve(data) }
    worker.onerror = (e) => { finish(); reject(new Error(e.message)) }
    worker.postMessage(request)
  })
}
