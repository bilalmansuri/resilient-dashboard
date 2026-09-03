import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import { fail, ok } from '../domain/errors'
import { formatValue, VALUE_FORMATS } from '../domain/format'
import { AGGREGATE_OPTIONS, aggregateField } from '../domain/readers'
import { defineWidget } from './registry'

const ConfigSchema = z.object({
  type: z.literal('kpi'),
  title: z.string().min(1),
  dataSource: z.string().min(1),
  field: z.string().min(1),
  aggregate: z.enum(AGGREGATE_OPTIONS).default('sum'),
  format: z.enum(VALUE_FORMATS).default('currency'),
})

type KpiData = { value: number; rowCount: number }

export const kpiWidget = defineWidget<z.infer<typeof ConfigSchema>, KpiData>({
  type: 'kpi',
  label: 'KPI',
  schema: ConfigSchema,

  /**
   * `aggregateField` refuses on a missing field or a partially unreadable
   * column rather than totalling what it can read. A sum over the readable
   * two-thirds of a revenue column is wrong in the one direction nobody
   * checks -- too low, but entirely plausible.
   */
  select: (rows, config) => {
    const value = aggregateField(rows, config.field, config.aggregate)
    if (!value.ok) return fail(value.failure)
    return ok({ value: value.value, rowCount: rows.length })
  },

  render: (data, config) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: 120 }}>
      <Typography sx={{ fontSize: 38, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        {formatValue(data.value, config.format)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
        {config.aggregate} of “{config.field}” across {data.rowCount}{' '}
        {data.rowCount === 1 ? 'record' : 'records'}
      </Typography>
    </Box>
  ),
})
