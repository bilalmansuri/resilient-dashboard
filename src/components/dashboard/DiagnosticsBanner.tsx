import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { RejectedWidget } from '../../domain/dashboard.schema'

/**
 * Widgets the configuration asked for that we would not accept. Reporting them
 * matters: silently rendering six of seven widgets would leave the author
 * believing the seventh was never configured.
 */
export function DiagnosticsBanner({ rejected }: { rejected: RejectedWidget[] }) {
  if (rejected.length === 0) return null

  return (
    <Alert severity="warning" variant="outlined">
      <AlertTitle sx={{ fontWeight: 600 }}>
        {rejected.length} widget{rejected.length === 1 ? '' : 's'} in this configuration could not
        be loaded
      </AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {rejected.map((entry) => (
          <li key={`${entry.index}-${entry.id ?? 'unknown'}`}>
            <Typography variant="body2">
              <strong>widgets[{entry.index}]</strong>
              {entry.id ? ` (id “${entry.id}”)` : ''}: {entry.issues.join('; ')}
            </Typography>
          </li>
        ))}
      </Box>
    </Alert>
  )
}
