// 草の列は 14ms の波で現す．長い年の後半はまとめ，完了まで 600ms を超えない．
export const CONTRIBUTION_WEEK_STEP_MS = 14;
export const CONTRIBUTION_WAVE_CAP_MS = 320;
export const CONTRIBUTION_LEVEL_STEP_MS = 8;
export const CONTRIBUTION_ENTER_MS = 240;
export const CONTRIBUTION_LABEL_DELAY_MS = 200;

export function contributionCellDelay(weekIndex: number, level: number): number {
  const week = Number.isFinite(weekIndex) ? Math.max(0, Math.floor(weekIndex)) : 0;
  const density = Number.isFinite(level) ? Math.min(4, Math.max(0, Math.floor(level))) : 0;
  return Math.min(week * CONTRIBUTION_WEEK_STEP_MS, CONTRIBUTION_WAVE_CAP_MS)
    + density * CONTRIBUTION_LEVEL_STEP_MS;
}
