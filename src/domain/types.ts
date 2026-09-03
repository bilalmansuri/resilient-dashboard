/** One record from a data source. Untyped on purpose: it arrives from the API. */
export type Row = Record<string, unknown>

export type Region = 'All' | 'India' | 'USA'
export const REGIONS: Region[] = ['All', 'India', 'USA']

/** Describe an unknown value for an error message, without dumping the whole thing. */
export function describe(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return `array of ${value.length}`
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return `string "${value.slice(0, 32)}"`
  return `${typeof value} ${String(value)}`
}
