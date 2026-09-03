import { fail, ok, type Result } from '../domain/errors'
import type { Row } from './types'

/**
 * Every number a widget shows passes through here.
 *
 * The rule these functions exist to enforce: a value is read only if it is
 * actually there and actually the right type. There is no coalescing, no
 * Number(x), no `?? 0`, and no dropping of unreadable rows behind the user's
 * back -- because each of those turns "we don't know" into a number that looks
 * like knowledge.
 */

type Scan = {
  present: boolean
  availableFields: string[]
  values: number[]
  badRows: number
  totalRows: number
  firstBadValue: unknown
}

function scanNumeric(rows: Row[], field: string): Scan {
  const availableFields = collectFields(rows)
  const present = availableFields.includes(field)

  const values: number[] = []
  let badRows = 0
  let firstBadValue: unknown

  if (present) {
    for (const row of rows) {
      const raw = row[field]
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        values.push(raw)
        continue
      }
      badRows++
      if (firstBadValue === undefined) firstBadValue = raw
    }
  }

  return { present, availableFields, values, badRows, totalRows: rows.length, firstBadValue }
}

/** Union of keys across rows, so a field missing from only some rows still lists. */
export function collectFields(rows: Row[]): string[] {
  const seen = new Set<string>()
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key)
  return [...seen]
}

const AGGREGATES = ['sum', 'avg', 'min', 'max', 'count'] as const
export type Aggregate = (typeof AGGREGATES)[number]
export const AGGREGATE_OPTIONS = AGGREGATES

/**
 * Aggregate a numeric field over rows.
 *
 * A partially unreadable column refuses outright: summing the readable 66% of a
 * revenue column produces a number that is wrong in the one direction nobody
 * checks -- too low, but perfectly plausible.
 */
export function aggregateField(
  rows: Row[],
  field: string,
  aggregate: Aggregate,
): Result<number> {
  if (rows.length === 0) {
    return fail({ kind: 'EMPTY_RESULT', message: 'No rows match the current filters.' })
  }

  if (aggregate === 'count') return ok(rows.length)

  const scan = scanNumeric(rows, field)

  if (!scan.present) {
    return fail({ kind: 'FIELD_MISSING', field, availableFields: scan.availableFields })
  }
  if (scan.badRows > 0) {
    return fail({
      kind: 'AGGREGATE_INCOMPLETE',
      field,
      badRows: scan.badRows,
      totalRows: scan.totalRows,
    })
  }

  const { values } = scan
  switch (aggregate) {
    case 'sum':
      return ok(values.reduce((a, b) => a + b, 0))
    case 'avg':
      return ok(values.reduce((a, b) => a + b, 0) / values.length)
    case 'min':
      return ok(Math.min(...values))
    case 'max':
      return ok(Math.max(...values))
  }
}

/**
 * Verify a numeric field is plottable across every row. Charts refuse partial
 * columns too: a line with a third of its points quietly absent still reads as
 * a complete trend.
 */
export function requireNumericField(rows: Row[], field: string): Result<null> {
  const scan = scanNumeric(rows, field)
  if (!scan.present) {
    return fail({ kind: 'FIELD_MISSING', field, availableFields: scan.availableFields })
  }
  if (scan.badRows > 0) {
    return fail({
      kind: 'TYPE_MISMATCH',
      field,
      expected: 'number',
      received: typeName(scan.firstBadValue),
      sample: JSON.stringify(scan.firstBadValue) ?? 'undefined',
      badRows: scan.badRows,
      totalRows: scan.totalRows,
    })
  }
  return ok(null)
}

/** Verify a field usable as a category / axis label exists and is scalar. */
export function requireLabelField(rows: Row[], field: string): Result<null> {
  const availableFields = collectFields(rows)
  if (!availableFields.includes(field)) {
    return fail({ kind: 'FIELD_MISSING', field, availableFields })
  }

  let badRows = 0
  let firstBad: unknown
  for (const row of rows) {
    const raw = row[field]
    const scalar = typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
    if (!scalar) {
      badRows++
      if (firstBad === undefined) firstBad = raw
    }
  }

  if (badRows > 0) {
    return fail({
      kind: 'TYPE_MISMATCH',
      field,
      expected: 'string',
      received: typeName(firstBad),
      sample: JSON.stringify(firstBad) ?? 'undefined',
      badRows,
      totalRows: rows.length,
    })
  }
  return ok(null)
}

export function typeName(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'missing'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/** Read an already-verified numeric cell. Throws only if verification was skipped. */
export function numberAt(row: Row, field: string): number {
  const raw = row[field]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new Error(`numberAt("${field}") called on an unverified row`)
  }
  return raw
}

export function labelAt(row: Row, field: string): string {
  const raw = row[field]
  return typeof raw === 'string' ? raw : String(raw)
}
