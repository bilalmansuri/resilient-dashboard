import { z } from 'zod'
import { fail, ok, type Result } from './errors'
import { describe, type Row } from './types'

const ResponseSchema = z.object({
  source: z.string().optional(),
  fetchedAt: z.string().optional(),
  rows: z.array(z.unknown()),
})

/**
 * Checks the response envelope before any widget reads a field from it, so that
 * "the server returned an HTML error page" is reported as exactly that, rather
 * than surfacing later as a baffling missing-field error.
 */
export function readDataResponse(raw: unknown): Result<Row[]> {
  const parsed = ResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return fail({
      kind: 'MALFORMED_RESPONSE',
      message: 'The response did not contain a readable "rows" array.',
      received: describe(raw),
    })
  }

  const rows: Row[] = []
  for (const [index, candidate] of parsed.data.rows.entries()) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return fail({
        kind: 'MALFORMED_RESPONSE',
        message: `Row ${index} is not an object, so no field can be read from it.`,
        received: describe(candidate),
      })
    }
    rows.push(candidate as Row)
  }

  return ok(rows)
}
