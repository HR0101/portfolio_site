export const recordingHoldMs = 5000;
export type RecordingIntent = 'auto' | 'play' | 'pause';

export interface RecordingConditions {
  pinned: boolean;
  open: boolean;
  inView: boolean;
  hidden: boolean;
  reduced: boolean;
  intent: RecordingIntent;
  suspended?: boolean;
}

// 一覧では明示操作だけを許可し，壁では開いているパネルだけを再生対象にする．
export function getRecordingPolicy(conditions: RecordingConditions) {
  const { pinned, open, inView, hidden, reduced, intent } = conditions;
  const eligible = !pinned || open;
  const requested = intent === 'play' || (intent === 'auto' && pinned && !reduced);
  return {
    shouldPlay: eligible && inView && !hidden && requested && !conditions.suspended,
    shouldReset: pinned && !open,
  };
}

// 停止中の時間を含めず，結果を見せる静止時間の残りを求める．
export function getRemainingRecordingHold(remainingMs: number, elapsedMs: number) {
  const remaining = Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : recordingHoldMs;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  return Math.max(0, remaining - elapsed);
}
