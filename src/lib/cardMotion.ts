export type CardDirection = 'left' | 'right';
export const CARD_ENTRANCE_DURATION_MS = 1200;
export const CARD_ENTRANCE_EASING = 'cubic-bezier(.22, .65, .2, 1)';

// The same travel distance is used by ordinary reveals, viewport snapshots,
// and the fallback animation. CSS declares the matching values in motion.css.
export function cardEntranceFrames(direction: CardDirection, compact: boolean): Keyframe[] {
  const distance = compact ? 180 : 420;
  const sign = direction === 'left' ? -1 : 1;
  return [
    { opacity: .85, transform: `translateX(${sign * distance}px) rotate(${sign * (compact ? 1 : 2)}deg) scale(.985)` },
    { opacity: 1, transform: `translateX(${-sign * 10}px) rotate(0deg) scale(1)`, offset: .8 },
    { opacity: 1, transform: 'translateX(0) rotate(0deg) scale(1)' },
  ];
}
