import type { Region, Row } from '../domain/types'
import salesData from '../mocks/salesData.json'

/**
 * A closed registry of the data sources a configuration is allowed to name.
 * Lookup is a property read on this map -- never a dynamic import or a fetch of
 * a config-supplied string -- so a config asking for "../../etc/passwd"
 * resolves to nothing instead of reaching anything.
 */
const SOURCES: Record<string, Row[]> = {
  sales: salesData as Row[],
}

export const DATA_SOURCE_IDS = Object.keys(SOURCES)

export const hasDataSource = (id: string): boolean => Object.hasOwn(SOURCES, id)

/** Distinguishes a transport failure from a genuine bug in our own code. */
export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The mock transport.
 *
 * The return type is `unknown` deliberately. This is the seam where data stops
 * being trustworthy; typing it as `Row[]` would be a promise we cannot keep,
 * and the compiler would then help us believe it.
 */
export async function fetchDashboardData(source: string, region: Region): Promise<unknown> {
  await delay(500 + Math.random() * 500)

  if (!hasDataSource(source)) {
    throw new ApiError(`The "${source}" data source does not exist.`, 404)
  }

  const all = SOURCES[source]
  const rows = region === 'All' ? all : all.filter((row) => row.region === region)

  return { source, fetchedAt: new Date().toISOString(), rows }
}
