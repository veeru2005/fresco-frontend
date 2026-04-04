import React from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // log to console or remote logging
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      const rawMessage =
        this.state.error instanceof Error
          ? this.state.error.message
          : String(this.state.error ?? 'Unknown error');
      const isDynamicImportError =
        /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed/i.test(
          rawMessage,
        );

      return (
        <section className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10 sm:px-6">
          <div className="w-full max-w-xl rounded-2xl border bg-background px-5 py-8 text-center shadow-sm sm:px-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Error</p>
            <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {isDynamicImportError
                ? 'The app was updated. Please go back home and open the page again.'
                : 'Please go back home and try again.'}
            </p>

            <a href="/" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 w-full sm:w-auto')}>
              Back to Home
            </a>

            {import.meta.env.DEV && rawMessage && (
              <pre className="mt-6 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
                {rawMessage}
              </pre>
            )}
          </div>
        </section>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
