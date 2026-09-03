import { Component, type ReactNode } from 'react'
import { WidgetError } from '../../widgets/WidgetError'

type Props = { children: ReactNode }
type State = { message: string | null }

/**
 * The last line of defence for widget isolation.
 *
 * `select` catches everything we can check ahead of time, but a throw during
 * React's own render would otherwise unmount the whole dashboard. Error
 * boundaries are the one thing React still requires a class for -- this is the
 * only class in the codebase, and it exists solely so that one crashing widget
 * costs you that widget and nothing else.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || 'The widget threw while rendering.' }
  }

  render() {
    if (this.state.message !== null) {
      return <WidgetError failure={{ kind: 'RENDER_CRASH', message: this.state.message }} />
    }
    return this.props.children
  }
}
