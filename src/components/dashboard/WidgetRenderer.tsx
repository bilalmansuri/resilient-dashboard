import type { WidgetEnvelope } from '../../domain/dashboard.schema'
import type { Region } from '../../domain/types'
import { useWidgetData } from '../../hooks/useWidgetData'
import { lookupWidget, registeredTypes, type PreparedWidget } from '../../widgets/registry'
import { WidgetError } from '../../widgets/WidgetError'
import { WidgetLoading } from '../../widgets/WidgetLoading'
import { WidgetCard } from './WidgetCard'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'

type Props = {
  envelope: WidgetEnvelope
  region: Region
  reloadKey: number
  span: number
}

/**
 * Resolves one widget: type -> config -> data -> output.
 *
 * Each step can only produce a rendered widget or an explained refusal, and the
 * refusal is rendered inside the same card. Nothing here can propagate a
 * failure up to the dashboard.
 */
export function WidgetRenderer({ envelope, region, reloadKey, span }: Props) {
  const runtime = lookupWidget(envelope.type)

  if (!runtime) {
    return (
      <WidgetCard title={envelope.title} span={span}>
        <WidgetError
          failure={{
            kind: 'UNKNOWN_WIDGET_TYPE',
            requestedType: envelope.type,
            knownTypes: registeredTypes(),
          }}
        />
      </WidgetCard>
    )
  }

  const prepared = runtime.prepare(envelope)
  if (!prepared.ok) {
    return (
      <WidgetCard title={envelope.title} span={span}>
        <WidgetError failure={prepared.failure} />
      </WidgetCard>
    )
  }

  // Split so the data hook is only reached once we know the widget is viable --
  // hooks cannot be called conditionally.
  return (
    <WidgetCard title={envelope.title} span={span}>
      <WidgetErrorBoundary>
        <WidgetBody prepared={prepared.value} region={region} reloadKey={reloadKey} />
      </WidgetErrorBoundary>
    </WidgetCard>
  )
}

function WidgetBody({
  prepared,
  region,
  reloadKey,
}: {
  prepared: PreparedWidget
  region: Region
  reloadKey: number
}) {
  const { isLoading, rows, failure, retry } = useWidgetData(
    prepared.dataSource,
    region,
    reloadKey,
  )

  if (isLoading) return <WidgetLoading />
  if (failure) return <WidgetError failure={failure} onRetry={retry} />
  if (!rows) return <WidgetError failure={{ kind: 'MALFORMED_RESPONSE', message: 'No rows were returned.', received: 'nothing' }} onRetry={retry} />

  const built = prepared.build(rows)
  if (!built.ok) return <WidgetError failure={built.failure} onRetry={retry} />

  return <>{built.value}</>
}
