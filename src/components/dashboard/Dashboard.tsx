import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useDashboard, type ConfigChoice } from '../../hooks/useDashboard'
import { DashboardToolbar } from './DashboardToolbar'
import { DiagnosticsBanner } from './DiagnosticsBanner'
import { WidgetRenderer } from './WidgetRenderer'

type Props = {
  configChoice: ConfigChoice
  onConfigChoiceChange: (choice: ConfigChoice) => void
}

/**
 * How much horizontal room each widget type gets in the 3-column grid. Purely
 * presentational, and deliberately not read from the configuration -- an
 * unknown type simply gets the smallest cell.
 */
const SPAN_BY_TYPE: Record<string, number> = {
  kpi: 1,
  'line-chart': 2,
  table: 3,
}

export function Dashboard({ configChoice, onConfigChoiceChange }: Props) {
  const dashboard = useDashboard(configChoice)
  const { outcome } = dashboard

  const toolbar = (
    <DashboardToolbar
      region={dashboard.region}
      onRegionChange={dashboard.setRegion}
      configChoice={configChoice}
      onConfigChoiceChange={onConfigChoiceChange}
      onReload={dashboard.reload}
    />
  )

  // A dashboard whose own envelope is unreadable has no widgets to fall back
  // on, so this is the one case where nothing renders -- but the toolbar stays
  // usable, so you can switch back to a configuration that works.
  if (!outcome.ok) {
    return (
      <Stack spacing={2}>
        {toolbar}
        <Alert severity="error" variant="outlined">
          <AlertTitle sx={{ fontWeight: 600 }}>Invalid dashboard configuration</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            This configuration could not be read, so no widgets were rendered.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {outcome.issues.map((issue) => (
              <li key={issue}>
                <Typography variant="body2">{issue}</Typography>
              </li>
            ))}
          </Box>
        </Alert>
      </Stack>
    )
  }

  const { config, rejected } = outcome

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {config.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip size="small" label={`config v${config.version}`} />
          <Chip size="small" label={`${config.widgets.length} widgets`} />
          <Chip size="small" label={`region: ${dashboard.region}`} />
        </Stack>
      </Box>

      {toolbar}

      <DiagnosticsBanner rejected={rejected} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {config.widgets.map((envelope) => (
          <WidgetRenderer
            key={envelope.id}
            envelope={envelope}
            region={dashboard.region}
            reloadKey={dashboard.reloadKey}
            span={SPAN_BY_TYPE[envelope.type] ?? 1}
          />
        ))}
      </Box>
    </Stack>
  )
}
