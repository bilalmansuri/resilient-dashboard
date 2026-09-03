import { z } from 'zod'

/**
 * The persisted configuration format. Configuration is loaded from JSON, so it
 * is untrusted input: TypeScript types vanish at runtime and cannot stop a
 * saved dashboard from having `widgets: null`. Everything here is checked with
 * Zod's safeParse, and nothing in this file throws.
 */
export const SUPPORTED_CONFIG_VERSION = 1

/**
 * Only the fields every widget must have. Type-specific settings (`field`,
 * `xField`, `fields`, ...) are validated later by the widget definition that
 * owns them, so one misconfigured widget cannot invalidate the dashboard and an
 * unknown type degrades to a single error card.
 */
const WidgetEnvelopeSchema = z.looseObject({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
})

export type WidgetEnvelope = z.infer<typeof WidgetEnvelopeSchema>

const DashboardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  filters: z.object({ region: z.string().optional() }).default({}),
  widgets: z.array(z.unknown()).default([]),
})

export type DashboardConfig = {
  id: string
  name: string
  version: number
  filters: { region?: string }
  widgets: WidgetEnvelope[]
}

/** A widget we refused to accept, and why. Shown in the diagnostics banner. */
export type RejectedWidget = { index: number; id?: string; issues: string[] }

export type ConfigOutcome =
  | { ok: true; config: DashboardConfig; rejected: RejectedWidget[] }
  | { ok: false; issues: string[] }

/**
 * Turn untrusted JSON into either a dashboard we are willing to render, or the
 * reasons we are not.
 *
 * Fatal (nothing renders): the dashboard envelope itself is unreadable, or the
 * config was written against a version this build does not understand.
 *
 * Non-fatal (reported, the rest still renders): individual bad widgets. A
 * broken widget is a local problem and is reported as one.
 */
export function parseDashboardConfig(raw: unknown): ConfigOutcome {
  const parsed = DashboardSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`,
      ),
    }
  }

  const value = parsed.data

  if (value.version !== SUPPORTED_CONFIG_VERSION) {
    return {
      ok: false,
      issues: [
        `Configuration version ${value.version} cannot be read by this build, ` +
          `which understands version ${SUPPORTED_CONFIG_VERSION}. ` +
          `Guessing at its meaning could show numbers that are not what the author intended.`,
      ],
    }
  }

  const widgets: WidgetEnvelope[] = []
  const rejected: RejectedWidget[] = []
  const seenIds = new Set<string>()

  value.widgets.forEach((candidate, index) => {
    const widget = WidgetEnvelopeSchema.safeParse(candidate)
    if (!widget.success) {
      rejected.push({
        index,
        id: readId(candidate),
        issues: widget.error.issues.map(
          (i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`,
        ),
      })
      return
    }

    // Duplicate ids would collide as React keys and make the two widgets
    // indistinguishable in the editor, so the later one is dropped, loudly.
    if (seenIds.has(widget.data.id)) {
      rejected.push({
        index,
        id: widget.data.id,
        issues: [`duplicate widget id "${widget.data.id}" — the first one was kept`],
      })
      return
    }

    seenIds.add(widget.data.id)
    widgets.push(widget.data)
  })

  return {
    ok: true,
    config: {
      id: value.id,
      name: value.name,
      version: value.version,
      filters: value.filters,
      widgets,
    },
    rejected,
  }
}

function readId(candidate: unknown): string | undefined {
  if (candidate && typeof candidate === 'object' && 'id' in candidate) {
    const id = (candidate as { id: unknown }).id
    if (typeof id === 'string') return id
  }
  return undefined
}

