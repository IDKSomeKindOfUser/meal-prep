import { describe, expect, it } from 'vitest'
import { splitTimes } from './stepTime'

describe('splitTimes', () => {
  it('finds a single time', () => {
    expect(splitTimes('Варите 10 минут до мягкости')).toEqual(['Варите ', { text: '10 минут', seconds: 600 }, ' до мягкости'])
  })
  it('takes the longer end of a range, after the temperature', () => {
    expect(splitTimes('180 °C 8–10 минут')).toEqual(['180 °C ', { text: '8–10 минут', seconds: 600 }])
  })
  it('knows hours', () => {
    expect(splitTimes('Оставьте на 6 часов')).toEqual(['Оставьте на ', { text: '6 часов', seconds: 21600 }])
  })
  it('keeps text without time whole', () => {
    expect(splitTimes('Нарежьте лук')).toEqual(['Нарежьте лук'])
  })
})
