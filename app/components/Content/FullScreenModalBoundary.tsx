'use client';

import { Component, type ReactNode } from 'react';

interface FullScreenModalBoundaryProps {
  children: ReactNode;
}

interface FullScreenModalBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary around the lazily loaded FullScreenModal. A failed chunk load or a render error
 * in the modal renders nothing instead of unmounting the gallery grid beside it.
 */
export class FullScreenModalBoundary extends Component<
  FullScreenModalBoundaryProps,
  FullScreenModalBoundaryState
> {
  state: FullScreenModalBoundaryState = { hasError: false };

  static getDerivedStateFromError(): FullScreenModalBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
