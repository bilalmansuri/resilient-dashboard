import { useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { Dashboard } from './components/dashboard/Dashboard'
import type { ConfigChoice } from './hooks/useDashboard'

export default function App() {
  const [configChoice, setConfigChoice] = useState<ConfigChoice>('valid')

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Typography variant="h6">Configurable Dashboard</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Widgets are driven by JSON configuration. Each one shows verified data, or says why it
            cannot.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Keyed so switching configuration resets the dashboard's own state. */}
        <Dashboard
          key={configChoice}
          configChoice={configChoice}
          onConfigChoiceChange={setConfigChoice}
        />
      </Container>
    </Box>
  )
}
