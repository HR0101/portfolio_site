import { ArrowUpRight } from 'lucide-react';

// The parent link owns the hover target; both copies are decorative.
export function ArrowSwap({ size = 16 }: { size?: number }) {
  return (
    <span className="arrow-swap" style={{ width: size, height: size }} aria-hidden="true">
      <ArrowUpRight size={size} className="arrow-swap-front" />
      <ArrowUpRight size={size} className="arrow-swap-back" />
    </span>
  );
}
