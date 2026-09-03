import type { ReactNode } from 'react'
import type { z } from 'zod'
import type { WidgetEnvelope } from '../domain/dashboard.schema'
import { fail, ok, type Result } from '../domain/errors'
import type { Row } from '../domain/types'
import { DATA_SOURCE_IDS, hasDataSource } from '../services/mockDataApi'

/** A widget whose config validated and whose data source exists. */
export type PreparedWidget = {
  dataSource: string
  /** Given verified rows, produce the UI or the reason it cannot render. */
  build: (rows: Row[]) => Result<ReactNode>
}

export type WidgetRuntime = {
  type: string
  label: string
  /** Total: never throws. Returns the prepared widget or an explained refusal. */
  prepare: (envelope: WidgetEnvelope) => Result<PreparedWidget>
}

type BaseConfig = { dataSource: string }

/**
 * Builds one registry entry.
 *
 * Each widget owns three things: the Zod schema for its own settings, a pure
 * `select` that verifies rows against those settings, and a `render` that only
 * ever receives already-verified data. Keeping `select` pure is what makes the
 * truth guarantee testable without rendering anything.
 */
export function defineWidget<TConfig extends BaseConfig, TData>(spec: {
  type: string
  label: string
  schema: { safeParse: (value: unknown) => z.ZodSafeParseResult<TConfig> }
  select: (rows: Row[], config: TConfig) => Result<TData>
  render: (data: TData, config: TConfig) => ReactNode
}): WidgetRuntime {
  return {
    type: spec.type,
    label: spec.label,
    prepare: (envelope) => {
      const parsed = spec.schema.safeParse(envelope)
      if (!parsed.success) {
        return fail({
          kind: 'CONFIG_INVALID',
          message: 'This widget’s configuration is not usable.',
          issues: parsed.error.issues.map(
            (i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`,
          ),
        })
      }

      const config = parsed.data
      if (!hasDataSource(config.dataSource)) {
        return fail({
          kind: 'UNKNOWN_DATA_SOURCE',
          requestedSource: config.dataSource,
          knownSources: DATA_SOURCE_IDS,
        })
      }

      return ok({
        dataSource: config.dataSource,
        build: (rows) => {
          const selected = spec.select(rows, config)
          if (!selected.ok) return selected
          try {
            return ok(spec.render(selected.value, config), selected.warnings)
          } catch (error) {
            return fail({
              kind: 'RENDER_CRASH',
              message: (error as Error).message || 'The widget threw while building its output.',
            })
          }
        },
      })
    },
  }
}

/* ------------------------------------------------------------ the registry */

const registry = new Map<string, WidgetRuntime>()

export function registerWidget(runtime: WidgetRuntime): void {
  registry.set(runtime.type, runtime)
}

/**
 * The only way a configuration can select which code runs. A Map lookup against
 * types we registered ourselves -- so an unknown or hostile `type` yields
 * undefined and becomes one error card, rather than executing anything.
 */
export function lookupWidget(type: unknown): WidgetRuntime | undefined {
  return typeof type === 'string' ? registry.get(type) : undefined
}

export const registeredTypes = (): string[] => [...registry.keys()]
