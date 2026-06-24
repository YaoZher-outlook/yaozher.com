import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render failed', error, info)
  }

  private reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-[rgb(var(--bg))] px-6 py-10 text-[rgb(var(--fg))]">
        <div className="glass mx-auto max-w-xl rounded-2xl p-6 shadow-2xl">
          <div className="text-lg font-semibold">Page failed to render</div>
          <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
            A browser-side rendering error was caught before the page went blank. Reloading usually restores the session.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-[var(--glass-border)] bg-black/25 p-3 text-xs text-[rgb(var(--muted))]">
            {this.state.error.message}
          </pre>
          <button type="button" onClick={this.reload} className="btn-primary mt-5 rounded-md px-4 py-2 text-sm font-semibold">
            Reload
          </button>
        </div>
      </div>
    )
  }
}
