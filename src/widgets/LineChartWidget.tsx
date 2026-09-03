import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { z } from 'zod'
import { fail, ok } from '../domain/errors'
import { formatDateLabel, formatValue } from '../domain/format'
import { labelAt, numberAt, requireLabelField, requireNumericField } from '../domain/readers'
import { defineWidget } from './registry'

const ConfigSchema = z.object({
  type: z.literal('line-chart'),
  title: z.string().min(1),
  dataSource: z.string().min(1),
  xField: z.string().min(1),
  yField: z.string().min(1),
})

type Point = { x: string; y: number }

export const lineChartWidget = defineWidget<z.infer<typeof ConfigSchema>, Point[]>({
  type: 'line-chart',
  label: 'Line chart',
  schema: ConfigSchema,

  /**
   * Both axes are verified across every row before a single point is plotted.
   * A line missing a third of its points still reads as a complete trend, so a
   * partially unreadable column refuses outright instead of drawing a gap.
   */
  select: (rows, config) => {
    if (rows.length === 0) {
      return fail({ kind: 'EMPTY_RESULT', message: 'No records match the current filters.' })
    }

    const xCheck = requireLabelField(rows, config.xField)
    if (!xCheck.ok) return fail(xCheck.failure)

    const yCheck = requireNumericField(rows, config.yField)
    if (!yCheck.ok) return fail(yCheck.failure)

    // Several records can share one x value (one per region), so sum per x.
    const totals = new Map<string, number>()
    for (const row of rows) {
      const x = labelAt(row, config.xField)
      totals.set(x, (totals.get(x) ?? 0) + numberAt(row, config.yField))
    }

    const points = [...totals.entries()]
      .map(([x, y]) => ({ x, y }))
      .sort((a, b) => a.x.localeCompare(b.x))

    return ok(points)
  },

  render: (points) => <RevenueLine points={points} />,
})

function RevenueLine({ points }: { points: Point[] }) {
  const theme = useTheme()
  return (
    <Box sx={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey="x"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            stroke={theme.palette.divider}
          />
          <YAxis
            tickFormatter={(value: number) => formatValue(value, 'compact')}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            stroke={theme.palette.divider}
            width={56}
          />
          <Tooltip
            formatter={(value) => formatValue(Number(value), 'currency')}
            labelFormatter={(label) => formatDateLabel(String(label))}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
