export type CardDirection = 'left' | 'right';
export const CARD_ENTRANCE_DURATION_MS = 1200;
export const CARD_ENTRANCE_EASING = 'cubic-bezier(.22, .65, .2, 1)';

// The same travel distance is used by ordinary reveals, viewport snapshots,
// and the fallback animation. CSS declares the matching values in motion.css.
// A card starts entirely outside the viewport: a card on the left half only
// needs half the viewport plus half of its own width to clear the left edge
// (mirrored for the right half). The extra 96px covers the tilt and shadow, and
// a card in a middle grid column (Skills' Python card sits ~60px past centre).
// A fixed distance would leave a half-visible card floating mid-page on wide
// screens, so the reach is expressed in viewport and card-relative units.
export const CARD_ENTRANCE_REACH = '(50vw + 50% + 96px)';

export function cardEntranceFrames(direction: CardDirection, compact: boolean): Keyframe[] {
  const sign = direction === 'left' ? -1 : 1;
  return [
    { opacity: 0, transform: `translateX(calc(${sign} * ${CARD_ENTRANCE_REACH})) rotate(${sign * (compact ? 1 : 2)}deg) scale(.985)` },
    // Fully opaque well before the card's edge crosses into the viewport.
    { opacity: 1, offset: .12 },
    { opacity: 1, transform: `translateX(${-sign * 10}px) rotate(0deg) scale(1)`, offset: .8 },
    { opacity: 1, transform: 'translateX(0) rotate(0deg) scale(1)' },
  ];
}
