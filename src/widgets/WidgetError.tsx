import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { failureDetail, failureTitle, isRetryable, type WidgetFailure } from '../domain/errors'

type Props = {
  failure: WidgetFailure
  onRetry?: () => void
}

/**
 * The single place a widget's refusal is rendered.
 *
 * It always names the specific reason -- which field, what type was expected,
 * what was actually received. A generic "Something went wrong" would leave the
 * user unable to tell a broken config from a broken backend, and Retry only
 * appears where retrying could actually help.
 */
export function WidgetError({ failure, onRetry }: Props) {
  const isEmpty = failure.kind === 'EMPTY_RESULT'
  const tone = isEmpty ? 'text.secondary' : 'error.main'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
        minHeight: 120,
        justifyContent: 'center',
        p: 1.5,
        borderRadius: 2,
        bgcolor: isEmpty ? 'action.hover' : 'rgba(179, 38, 30, 0.06)',
        border: '1px solid',
        borderColor: isEmpty ? 'divider' : 'rgba(179, 38, 30, 0.24)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tone }}>
        {isEmpty ? (
          <SearchOffOutlinedIcon fontSize="small" />
        ) : (
          <ReportProblemOutlinedIcon fontSize="small" />
        )}
        <Typography variant="subtitle2" sx={{ color: tone }}>
          {isEmpty ? failureTitle(failure) : 'Unable to display this widget'}
        </Typography>
      </Box>

      {!isEmpty && (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {failureTitle(failure)}
        </Typography>
      )}

      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', whiteSpace: 'pre-line', wordBreak: 'break-word' }}
      >
        {failureDetail(failure)}
      </Typography>

      {onRetry && isRetryable(failure) && (
        <Box>
          <Button size="small" variant="outlined" color="error" onClick={onRetry} sx={{ mt: 0.5 }}>
            Retry
          </Button>
        </Box>
      )}

      <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5 }}>
        Code: {failure.kind}
      </Typography>
    </Box>
  )
}
