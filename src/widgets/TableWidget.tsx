import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import { fail, ok } from '../domain/errors'
import { formatValue } from '../domain/format'
import { collectFields } from '../domain/readers'
import type { Row } from '../domain/types'
import { defineWidget } from './registry'

const MAX_ROWS = 10

const ConfigSchema = z.object({
  type: z.literal('table'),
  title: z.string().min(1),
  dataSource: z.string().min(1),
  fields: z.array(z.string().min(1)).min(1),
})

type TableData = { fields: string[]; rows: Row[]; total: number }

export const tableWidget = defineWidget<z.infer<typeof ConfigSchema>, TableData>({
  type: 'table',
  label: 'Table',
  schema: ConfigSchema,

  /**
   * Every configured column must exist in the response. Rendering a table with
   * a silently blank column would read as "these records have no customer",
   * which is a different claim from "we cannot read that column".
   */
  select: (rows, config) => {
    if (rows.length === 0) {
      return fail({ kind: 'EMPTY_RESULT', message: 'No records match the current filters.' })
    }

    const availableFields = collectFields(rows)
    const missing = config.fields.find((field) => !availableFields.includes(field))
    if (missing) {
      return fail({ kind: 'FIELD_MISSING', field: missing, availableFields })
    }

    return ok({
      fields: config.fields,
      rows: rows.slice(0, MAX_ROWS),
      total: rows.length,
    })
  },

  render: (data) => (
    <Box>
      <TableContainer sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {data.fields.map((field) => (
                <TableCell key={field} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {field}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((row, index) => (
              <TableRow key={index} hover>
                {data.fields.map((field) => (
                  <TableCell key={field} sx={{ whiteSpace: 'nowrap' }}>
                    <Cell value={row[field]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {data.total > data.rows.length && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          Showing {data.rows.length} of {data.total} records
        </Typography>
      )}
    </Box>
  ),
})

/**
 * A single cell. The column was verified to exist, but an individual value can
 * still be null or an object, so an unreadable cell is marked rather than
 * rendered as an empty one that looks like a legitimately blank value.
 */
function Cell({ value }: { value: unknown }) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return <>{formatValue(value, 'number')}</>
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return <>{String(value)}</>
  }
  return (
    <Typography component="span" variant="body2" sx={{ color: 'error.main', fontStyle: 'italic' }}>
      unreadable
    </Typography>
  )
}
