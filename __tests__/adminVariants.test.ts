import { describe, expect, it } from 'vitest'
import { abbreviate, generateSku } from '@/lib/admin/variants'

describe('abbreviate', () => {
  it('uppercases and takes the first three alphanumerics', () => {
    expect(abbreviate('White')).toBe('WHI')
    expect(abbreviate('Army Green')).toBe('ARM')
  })

  it('keeps short values whole', () => {
    expect(abbreviate('S')).toBe('S')
    expect(abbreviate('XL')).toBe('XL')
  })

  it('strips punctuation and spaces', () => {
    expect(abbreviate('are you okay?')).toBe('ARE')
    expect(abbreviate('  -- ')).toBe('X')
  })
})

describe('generateSku', () => {
  it('joins the root with abbreviated option values', () => {
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], new Set())).toBe('SCR-ANX-M-ARM')
  })

  it('suffixes on collision', () => {
    const taken = new Set(['SCR-ANX-M-ARM'])
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], taken)).toBe('SCR-ANX-M-ARM-2')
  })

  it('keeps suffixing until the sku is free', () => {
    const taken = new Set(['SCR-ANX-M-ARM', 'SCR-ANX-M-ARM-2'])
    expect(generateSku('SCR-ANX', ['M', 'Army Green'], taken)).toBe('SCR-ANX-M-ARM-3')
  })

  it('falls back to SCR when the root is blank', () => {
    expect(generateSku('', ['S'], new Set())).toBe('SCR-S')
  })
})
