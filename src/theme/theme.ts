import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#f4f6f8', paper: '#ffffff' },
    primary: { main: '#1f5f8b' },
    error: { main: '#b3261e' },
    warning: { main: '#8a5a00' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #e3e7ec' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none' } } },
  },
})
