import { useMemo, useState } from 'react'
import { parseDashboardConfig, type ConfigOutcome } from '../domain/dashboard.schema'
import { REGIONS, type Region } from '../domain/types'
import hostileConfig from '../mocks/hostileDashboard.json'
import validConfig from '../mocks/dashboard.json'

export const CONFIG_CHOICES = ['valid', 'hostile'] as const
export type ConfigChoice = (typeof CONFIG_CHOICES)[number]

const CONFIGS: Record<ConfigChoice, unknown> = {
  valid: validConfig,
  hostile: hostileConfig,
}

/**
 * Owns everything dashboard-wide: the validated configuration and the state all
 * widgets share. The region filter lives here rather than inside each widget,
 * so every widget is guaranteed to be looking at the same scope.
 */
export function useDashboard(choice: ConfigChoice) {
  const outcome: ConfigOutcome = useMemo(() => parseDashboardConfig(CONFIGS[choice]), [choice])

  const [region, setRegion] = useState<Region>(() =>
    outcome.ok ? toRegion(outcome.config.filters.region) : 'All',
  )

  // Bumped by Reload; part of every widget's query key so the data is refetched.
  const [reloadKey, setReloadKey] = useState(0)

  return {
    outcome,
    region,
    setRegion,
    reloadKey,
    reload: () => setReloadKey((key) => key + 1),
  }
}

/** The config's region is untrusted text; anything unrecognised means unscoped. */
function toRegion(value: unknown): Region {
  return REGIONS.find((region) => region === value) ?? 'All'
}
