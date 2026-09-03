import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

export function WidgetLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        minHeight: 120,
        height: '100%',
        color: 'text.secondary',
      }}
    >
      <CircularProgress size={22} thickness={5} />
      <Typography variant="body2">Loading…</Typography>
    </Box>
  )
}
