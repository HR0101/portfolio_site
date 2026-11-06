'use client';

import type { ReactNode } from 'react';

// Grid tracks interpolate between zero and the content's natural height.
// Inert removes closing content from keyboard navigation immediately, while
// visibility lets the visual exit finish before hiding it completely.
export function MotionDisclosure({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return <div ref={node => { if (node) node.inert = !open; }} id={id} className="motion-disclosure" data-open={open} aria-hidden={!open}>
    <div className="motion-disclosure-inner">{children}</div>
  </div>;
}
