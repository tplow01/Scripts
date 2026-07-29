import { describe, expect, it } from 'vitest'
import * as T from '@/components/shell/theme'

describe('shell theme', () => {
  it('uses the approved ink body gradient', () => {
    expect(T.INK_BODY).toContain('#303034')
    expect(T.INK_BODY).toContain('#232327')
    expect(T.INK_BODY).toContain('#17171a')
  })
  it('pink face uses brand pinks and is the only pink material', () => {
    expect(T.PINK_FACE).toContain('#FF4FA3')
    expect(T.RUBBER_FACE.toLowerCase()).not.toContain('#ff4fa3')
    expect(T.PILL_FACE.toLowerCase()).not.toContain('#ff4fa3')
  })
  it('wordmark is Primary Pink', () => {
    expect(T.WORDMARK_PINK).toBe('#FF8AC7')
  })
  it('pressedStyle sinks the control and shrinks its shadow', () => {
    const p = T.pressedStyle('0 4px 6px rgba(0,0,0,.5)')
    expect(p.transform).toContain('translateY')
    expect(p.boxShadow).not.toBe('0 4px 6px rgba(0,0,0,.5)')
  })
})
