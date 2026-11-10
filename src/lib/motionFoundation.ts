// 見出し・メニューの遅れを，部品ごとにずれないよう一か所で決めます．
export const HEADING_MOTION = {
  labelMs: 0,
  lineMs: 60,
  titleMs: 120,
  characterMs: 420,
  characterStepMs: 32,
  titleBudgetMs: 600,
  staggerCharacters: 32,
  descriptionOverlap: 0.6,
  descriptionMs: 160,
} as const;

export const NAV_MOTION = {
  openIntentMs: 80,
  closeIntentMs: 120,
  linkStepMs: 25,
  staggerItems: 8,
} as const;

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function headingTiming(characterCount: number) {
  const intervals = Math.min(Math.max(0, Math.floor(nonNegative(characterCount)) - 1), HEADING_MOTION.staggerCharacters - 1);
  const stepMs = intervals === 0 ? 0 : Math.min(HEADING_MOTION.characterStepMs, (HEADING_MOTION.titleBudgetMs - HEADING_MOTION.characterMs) / intervals);
  const titleDurationMs = HEADING_MOTION.characterMs + intervals * stepMs;
  return {
    stepMs,
    titleDurationMs,
    descriptionDelayMs: HEADING_MOTION.titleMs + titleDurationMs * HEADING_MOTION.descriptionOverlap,
    lastCharacterIndex: intervals,
  };
}

export function navLinkDelay(index: number): number {
  return Math.min(Math.floor(nonNegative(index)), NAV_MOTION.staggerItems - 1) * NAV_MOTION.linkStepMs;
}

export function revealDelay(delayMs: number, isCard: boolean): number {
  return Math.min(nonNegative(delayMs) * (isCard ? 1.4 : 1), isCard ? 420 : 480);
}

// フレーム間隔が違っても，同じ時間で傾きが減衰する補間です．
export function decaySkew(skew: number, elapsedMs: number): number {
  const referenceFrameMs = 1000 / 60;
  const retainedPerFrame = 0.86;
  return skew * Math.pow(retainedPerFrame, nonNegative(elapsedMs) / referenceFrameMs);
}
