import { Component, ErrorInfo, ReactNode } from 'react';
import { LifeBuoy, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-surface-bg p-6 text-center text-charcoal">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 shadow-soft-md">
            <LifeBuoy className="h-10 w-10 text-rose-400" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Something went wrong</h1>
          <p className="mt-3 max-w-md text-sm text-charcoal/60 leading-relaxed">
            We encountered an unexpected error while trying to load this page. Our team has been notified.
          </p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="group flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-sm font-medium text-cream transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              <RefreshCcw className="h-4 w-4 transition-transform group-hover:-rotate-180 duration-500" />
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-5 py-2.5 text-sm font-medium text-charcoal transition-all hover:bg-charcoal/5 active:scale-95"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
