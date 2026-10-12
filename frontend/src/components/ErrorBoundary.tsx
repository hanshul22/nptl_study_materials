import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError } from '../api';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** When this value changes while the fallback is showing, the boundary resets (e.g. the route). */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  failed: boolean;
  error: unknown;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  override componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.reset();
  }

  private reset = () => this.setState({ failed: false, error: null });

  override render() {
    if (!this.state.failed) return this.props.children;

    const { error } = this.state;
    return (
      <section role="alert" className="mx-auto max-w-md py-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
        {error instanceof ApiClientError ? (
          <p className="mt-2 text-slate-600">
            {error.message}
            <span className="mt-1 block text-sm text-slate-500">Error code: {error.code}</span>
          </p>
        ) : (
          <p className="mt-2 text-slate-600">An unexpected error occurred. Please try again.</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Try again
          </button>
          {/* Resetting on click too: from "/" the route does not change, so resetKey would not. */}
          <Link
            to="/"
            onClick={this.reset}
            className="text-sm font-medium text-indigo-700 underline hover:text-indigo-900"
          >
            Go to Topics
          </Link>
        </div>
      </section>
    );
  }
}
