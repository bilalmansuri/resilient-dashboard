export const VALUE_FORMATS = ['number', 'currency', 'percent', 'compact'] as const
export type ValueFormat = (typeof VALUE_FORMATS)[number]

const FORMATTERS: Record<ValueFormat, Intl.NumberFormat> = {
  number: new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }),
  currency: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
  percent: new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }),
  compact: new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }),
}

export function formatValue(value: number, format: ValueFormat): string {
  return FORMATTERS[format].format(value)
}

/** Short axis label for an ISO date, falling back to the raw text unchanged. */
export function formatDateLabel(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
