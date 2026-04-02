'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import styles from './ErrorBoundary.module.scss';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary
 *
 * Generic React error boundary that catches rendering errors in its subtree.
 * Renders a fallback UI when an error occurs, preventing the entire page from
 * crashing. Accepts an optional custom fallback and an optional error callback.
 *
 * @param children - The subtree to protect
 * @param fallback - Optional custom fallback UI (defaults to built-in error state)
 * @param onError - Optional callback invoked with error details on catch
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={styles.errorContainer} role="alert">
          <p className={styles.errorMessage}>Something went wrong.</p>
          <button type="button" className={styles.retryButton} onClick={this.handleReset}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
