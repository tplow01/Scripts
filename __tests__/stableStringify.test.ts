import { describe, expect, it } from 'vitest'
import { stableStringify } from '@/lib/admin/stableStringify'

describe('stableStringify', () => {
  it('is independent of top-level key order', () => {
    const a = { name: 'ANXIETY', id: '1' }
    const b = { id: '1', name: 'ANXIETY' }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('sorts keys in nested objects', () => {
    const a = { outer: { z: 1, a: 2 } }
    const b = { outer: { a: 2, z: 1 } }
    expect(stableStringify(a)).toBe(stableStringify(b))
    expect(stableStringify(a)).toBe('{"outer":{"a":2,"z":1}}')
  })

  it('preserves array order (does not sort array elements)', () => {
    const a = { list: [3, 1, 2] }
    const b = { list: [1, 2, 3] }
    expect(stableStringify(a)).not.toBe(stableStringify(b))
    expect(stableStringify(a)).toBe('{"list":[3,1,2]}')
  })

  it('sorts keys within objects nested inside arrays', () => {
    const a = { list: [{ z: 1, a: 2 }] }
    const b = { list: [{ a: 2, z: 1 }] }
    expect(stableStringify(a)).toBe(stableStringify(b))
  })

  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null')
    expect(stableStringify(42)).toBe('42')
    expect(stableStringify('hi')).toBe('"hi"')
    expect(stableStringify(true)).toBe('true')
    expect(stableStringify(undefined)).toBeUndefined()
  })
})
