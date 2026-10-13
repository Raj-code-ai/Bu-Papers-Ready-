import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { message: '' };
  }

  static getDerivedStateFromError(error) {
    return { message: error?.message || 'The page failed to load.' };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4">
        <div className="panel">
          <p className="font-display text-2xl font-semibold">Something went wrong</p>
          <p className="mt-2 text-sm text-ink-700/80 dark:text-sand-100/80">{this.state.message}</p>
          <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
