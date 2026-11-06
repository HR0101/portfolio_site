import type { ReactNode } from 'react';

// NavigationTransitions owns the viewport and shared-element snapshots.
// A stable wrapper avoids starting a second native transition inside it.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div data-page-content>{children}</div>
  );
}
