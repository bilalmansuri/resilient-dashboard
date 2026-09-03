import RefreshIcon from '@mui/icons-material/Refresh'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import { REGIONS, type Region } from '../../domain/types'
import { CONFIG_CHOICES, type ConfigChoice } from '../../hooks/useDashboard'

type Props = {
  region: Region
  onRegionChange: (region: Region) => void
  configChoice: ConfigChoice
  onConfigChoiceChange: (choice: ConfigChoice) => void
  onReload: () => void
}

const CONFIG_LABELS: Record<ConfigChoice, string> = {
  valid: 'Sales Dashboard (valid)',
  hostile: 'Broken Dashboard (hostile)',
}

export function DashboardToolbar({
  region,
  onRegionChange,
  configChoice,
  onConfigChoiceChange,
  onReload,
}: Props) {
  return (
    <Paper sx={{ p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      <TextField
        select
        size="small"
        label="Region"
        value={region}
        onChange={(event) => onRegionChange(event.target.value as Region)}
        sx={{ minWidth: 140 }}
      >
        {REGIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Configuration"
        value={configChoice}
        onChange={(event) => onConfigChoiceChange(event.target.value as ConfigChoice)}
        sx={{ minWidth: 230 }}
      >
        {CONFIG_CHOICES.map((option) => (
          <MenuItem key={option} value={option}>
            {CONFIG_LABELS[option]}
          </MenuItem>
        ))}
      </TextField>

      <Button variant="outlined" size="medium" startIcon={<RefreshIcon />} onClick={onReload}>
        Reload dashboard
      </Button>
    </Paper>
  )
}
