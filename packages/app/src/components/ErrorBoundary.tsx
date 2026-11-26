import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          <h2 className="font-display text-base font-bold text-red-700">
            Application Error
          </h2>
          <p className="mt-1 text-sm text-red-800">
            {this.state.error?.message ?? 'Unexpected error occurred.'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
