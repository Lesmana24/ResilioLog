import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ResilioLog UI error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            margin: 16,
            padding: 16,
            border: '2px solid #dc2626',
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ marginTop: 0, color: '#991b1b' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#7f1d1d' }}>{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '8px 14px' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
