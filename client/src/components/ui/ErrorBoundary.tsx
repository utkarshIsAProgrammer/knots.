import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <div className="glass max-w-md rounded-2xl p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] text-[var(--danger)]">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-display text-[18px] font-semibold text-[var(--text)]">Something went wrong</h3>
            <p className="mt-2 text-[13px] text-[var(--text-3)]">
              {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button variant="glass" size="sm" onClick={this.reset}>
                <RefreshCw size={14} /> Try again
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  this.reset();
                  window.location.reload();
                }}
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
