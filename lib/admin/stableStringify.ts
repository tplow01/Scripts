/**
 * JSON.stringify with object keys sorted recursively, so two objects that
 * differ only in key insertion order serialise identically. Array order is
 * preserved — it is meaningful (variant/media/option ordering).
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sort(value))
}

function sort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sort)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sort((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}
