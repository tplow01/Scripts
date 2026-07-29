import { describe, expect, it } from 'vitest'
import { KEY_TO_BTN, UTILITY_LABELS, type Btn } from '@/lib/controls'

describe('controls', () => {
  it('maps arrows and Z/X to buttons', () => {
    expect(KEY_TO_BTN['ArrowUp']).toBe('up')
    expect(KEY_TO_BTN['ArrowDown']).toBe('down')
    expect(KEY_TO_BTN['ArrowLeft']).toBe('left')
    expect(KEY_TO_BTN['ArrowRight']).toBe('right')
    expect(KEY_TO_BTN['z']).toBe('A')
    expect(KEY_TO_BTN['x']).toBe('B')
  })
  it('no longer maps Enter/Shift/Escape to game buttons', () => {
    expect(KEY_TO_BTN['Enter']).toBeUndefined()
    expect(KEY_TO_BTN['Shift']).toBeUndefined()
    expect(KEY_TO_BTN['Escape']).toBeUndefined()
  })
  it('labels the four utilities', () => {
    expect(UTILITY_LABELS.social).toBe('SOCIALS')
    expect(UTILITY_LABELS.inventory).toBe('INVENTORY')
    expect(UTILITY_LABELS.mute).toBe('MUTE')
    expect(UTILITY_LABELS.help).toBe('?')
  })
  it('Btn excludes the removed hardware buttons', () => {
    // @ts-expect-error START is no longer a Btn
    const bad: Btn = 'START'
    void bad
  })
})
