import { describe, expect, it } from 'vitest'
import * as T from '@/components/shell/theme'

describe('shell theme', () => {
  it('shell is one flat neutral grey, strip is brand black', () => {
    expect(T.SHELL_BODY).toBe('#6F6F73')
    expect(T.STRIP_BLACK).toBe('#0D0D0D')
  })
  it('wordmark is Primary Pink', () => {
    expect(T.WORDMARK_PINK).toBe('#FF8AC7')
  })
  it('rubber and DMG pill faces are molded (gradients), never pink', () => {
    expect(T.RUBBER_FACE).toContain('gradient')
    expect(T.DMG_PILL_FACE).toContain('gradient')
    expect(T.RUBBER_FACE.toLowerCase()).not.toContain('#6f6f73')
    expect(T.DMG_PILL_FACE.toLowerCase()).not.toContain('#6f6f73')
  })
  it('retired ink/pink-face tokens are gone', () => {
    const t = T as Record<string, unknown>
    for (const dead of ['INK_BODY', 'INK_CREASES', 'PINK_FACE', 'PINK_SHADOW', 'PILL_FACE', 'PILL_SHADOW']) {
      expect(t[dead], dead).toBeUndefined()
    }
  })
  it('pressedStyle sinks the control and shrinks its shadow', () => {
    const p = T.pressedStyle('0 4px 6px rgba(0,0,0,.5)')
    expect(p.transform).toContain('translateY')
    expect(p.boxShadow).not.toBe('0 4px 6px rgba(0,0,0,.5)')
  })
})
