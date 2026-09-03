/**
 * A single, closed taxonomy of every reason a widget can refuse to render.
 *
 * Rule of the system: a widget renders verified data, or it renders one of
 * these. There is no third outcome, and none of these ever degrade into a
 * plausible-looking value (0, "-", empty series).
 */
export type WidgetFailure =
  | { kind: 'CONFIG_INVALID'; message: string; issues: string[] }
  | { kind: 'UNKNOWN_WIDGET_TYPE'; requestedType: string; knownTypes: string[] }
  | { kind: 'UNKNOWN_DATA_SOURCE'; requestedSource: string; knownSources: string[] }
  | { kind: 'NETWORK_ERROR'; message: string; status?: number }
  | { kind: 'MALFORMED_RESPONSE'; message: string; received: string }
  | { kind: 'FIELD_MISSING'; field: string; availableFields: string[] }
  | {
      kind: 'TYPE_MISMATCH'
      field: string
      expected: FieldKind
      received: string
      sample: string
      badRows: number
      totalRows: number
    }
  | { kind: 'EMPTY_RESULT'; message: string }
  | { kind: 'AGGREGATE_INCOMPLETE'; field: string; badRows: number; totalRows: number }
  | { kind: 'RENDER_CRASH'; message: string }

export type FieldKind = 'number' | 'string' | 'date' | 'boolean'

/** Non-fatal: the widget rendered, but not over all of the data it asked for. */
export type DataQualityWarning = {
  field: string
  excludedRows: number
  totalRows: number
  reason: string
}

export type Result<T> =
  | { ok: true; value: T; warnings?: DataQualityWarning[] }
  | { ok: false; failure: WidgetFailure }

export const ok = <T>(value: T, warnings?: DataQualityWarning[]): Result<T> => ({
  ok: true,
  value,
  ...(warnings && warnings.length ? { warnings } : {}),
})

export const fail = <T = never>(failure: WidgetFailure): Result<T> => ({ ok: false, failure })

/** Short label used in error UI headers. */
export function failureTitle(f: WidgetFailure): string {
  switch (f.kind) {
    case 'CONFIG_INVALID':
      return 'Invalid widget configuration'
    case 'UNKNOWN_WIDGET_TYPE':
      return 'Unsupported widget type'
    case 'UNKNOWN_DATA_SOURCE':
      return 'Unknown data source'
    case 'NETWORK_ERROR':
      return 'Could not reach the data source'
    case 'MALFORMED_RESPONSE':
      return 'Data source returned an unusable response'
    case 'FIELD_MISSING':
      return 'Field no longer exists'
    case 'TYPE_MISMATCH':
      return 'Field has an unexpected type'
    case 'EMPTY_RESULT':
      return 'No data for the current filters'
    case 'AGGREGATE_INCOMPLETE':
      return 'Cannot compute a trustworthy total'
    case 'RENDER_CRASH':
      return 'Widget failed while rendering'
  }
}

/** Human-readable explanation. Deliberately names the field and what was seen. */
export function failureDetail(f: WidgetFailure): string {
  switch (f.kind) {
    case 'CONFIG_INVALID':
      return f.issues.length ? f.issues.join('\n') : f.message
    case 'UNKNOWN_WIDGET_TYPE':
      return `This dashboard asks for "${f.requestedType}", which this build does not know how to render.\nKnown types: ${f.knownTypes.join(', ')}`
    case 'UNKNOWN_DATA_SOURCE':
      return `This dashboard asks for "${f.requestedSource}".\nKnown sources: ${f.knownSources.join(', ') || 'none'}`
    case 'NETWORK_ERROR':
      return f.status ? `${f.message} (HTTP ${f.status})` : f.message
    case 'MALFORMED_RESPONSE':
      return `${f.message}\nReceived: ${f.received}`
    case 'FIELD_MISSING':
      return `Expected field "${f.field}".\nAvailable fields: ${f.availableFields.join(', ') || 'none'}`
    case 'TYPE_MISMATCH':
      return `Expected "${f.field}" to be ${f.expected}, received ${f.received} (e.g. ${f.sample}) in ${f.badRows} of ${f.totalRows} rows.`
    case 'EMPTY_RESULT':
      return f.message
    case 'AGGREGATE_INCOMPLETE':
      return `${f.badRows} of ${f.totalRows} rows have an unusable "${f.field}". A total over the remaining rows would understate the true value, so none is shown.`
    case 'RENDER_CRASH':
      return f.message
  }
}

/** Only transient (server/network) faults are worth an automatic retry. */
export function isRetryable(f: WidgetFailure): boolean {
  return f.kind === 'NETWORK_ERROR' || f.kind === 'MALFORMED_RESPONSE'
}
