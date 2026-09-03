import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Failures are surfaced to the user with an explicit Retry rather than
      // retried silently -- a spinner that hides three failed attempts is a
      // worse lie than an error card.
      retry: 0,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})
