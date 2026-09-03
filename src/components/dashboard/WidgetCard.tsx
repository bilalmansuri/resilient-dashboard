import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

type Props = {
  title: string
  span?: number
  children: ReactNode
}

export function WidgetCard({ title, span = 1, children }: Props) {
  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        gridColumn: { xs: 'span 1', md: `span ${span}` },
      }}
    >
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  )
}
