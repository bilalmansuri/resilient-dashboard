import { useQuery } from '@tanstack/react-query'
import type { WidgetFailure } from '../domain/errors'
import { readDataResponse } from '../domain/response'
import type { Region, Row } from '../domain/types'
import { ApiError, fetchDashboardData } from '../services/mockDataApi'

type WidgetDataState = {
  isLoading: boolean
  rows: Row[] | null
  /** A transport or envelope failure. Field-level failures come from `select`. */
  failure: WidgetFailure | null
  retry: () => void
}

/**
 * Fetches and vets one widget's data.
 *
 * The region and `reloadKey` are part of the query key, so changing the filter
 * or hitting Reload refetches instead of serving the previous cached answer.
 * Widgets sharing a source and region share one request.
 */
export function useWidgetData(
  dataSource: string,
  region: Region,
  reloadKey: number,
): WidgetDataState {
  const query = useQuery({
    queryKey: ['widget-data', dataSource, region, reloadKey],
    queryFn: () => fetchDashboardData(dataSource, region),
  })

  if (query.isPending) {
    return { isLoading: true, rows: null, failure: null, retry: () => void query.refetch() }
  }

  if (query.error) {
    const error = query.error
    return {
      isLoading: false,
      rows: null,
      failure: {
        kind: 'NETWORK_ERROR',
        message: error.message || 'The request failed.',
        status: error instanceof ApiError ? error.status : undefined,
      },
      retry: () => void query.refetch(),
    }
  }

  // The response is `unknown` until it passes the envelope contract.
  const parsed = readDataResponse(query.data)
  if (!parsed.ok) {
    return {
      isLoading: false,
      rows: null,
      failure: parsed.failure,
      retry: () => void query.refetch(),
    }
  }

  return {
    isLoading: false,
    rows: parsed.value,
    failure: null,
    retry: () => void query.refetch(),
  }
}
