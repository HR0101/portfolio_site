// スクロールの速さから，タイルの画面のしなり（傾きと縦の伸び）を求める純粋関数と，ばねの 1 ステップ．
// 他のファイルを import しない自己完結のモジュールで，DOM にも触れない（単体テストは tests/anim-scroll-bend.test.mjs）．
//
// 速さ（px/秒．下へスクロールするとき正）
//   → getBendAmount で -1〜1 の「しなり量」へ（tanh で上限へなめらかに近づく）
//   → stepBendSpring で臨界減衰のばねを通す（止まると行き過ぎずに戻る）
//   → getBendFromAmount で傾き（度）と縦の倍率へ
// という流れで使う．

// 傾きの上限（度）．しなり量が ±1 のときの値
export const BEND_MAX_SKEW_DEG = 4;
// 縦の伸びの上限（倍率）．しなり量が ±1 のときの値
export const BEND_MAX_SCALE_Y = 1.04;
// 速さの基準（px/秒）．この速さで，しなり量は上限の約 76%（tanh(1)）になる
export const BEND_REFERENCE_VELOCITY = 2400;
// ばねの応答時間（秒）．この時間で，目標との差が 2% 以下まで縮む
export const BEND_SPRING_RESPONSE_SEC = 0.35;
// 静止とみなす，目標との差としなり量の変化の速さ
export const BEND_REST_DISTANCE = 0.002;
export const BEND_REST_SPEED = 0.01;
// スクロールの速さを測るときの，フレーム間隔の下限と上限（ミリ秒）．
// 間隔が極端に短い・長いときに，速さが暴れないようにする
export const BEND_MIN_SAMPLE_MS = 8;
export const BEND_MAX_SAMPLE_MS = 100;
// 傾きと伸びが，見分けのつかないほど小さいとみなす値
const BEND_NEUTRAL_SKEW_DEG = 0.001;
const BEND_NEUTRAL_SCALE = 0.00005;
const MS_PER_SECOND = 1000;

export interface Bend {
  // 縦方向の傾き（度）．skewY に渡す
  skewDeg: number;
  // 縦の倍率．scaleY に渡す
  scaleY: number;
}

export interface SpringState {
  value: number;
  velocity: number;
}

// 数でない値（NaN）と -0 を 0 にそろえる
function toSafeNumber(value: number): number {
  return Number.isFinite(value) ? value || 0 : 0;
}

// 値を下限・上限の内側に丸める
function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

// スクロールの速さ（px/秒）を，-1〜1 のしなり量にする．正負は進行方向．
// 速いほど上限へ近づくが，超えることはない
export function getBendAmount(velocityPxPerSec: number): number {
  if (Number.isNaN(velocityPxPerSec)) return 0;
  return Math.tanh(velocityPxPerSec / BEND_REFERENCE_VELOCITY) || 0;
}

// しなり量（-1〜1）から，傾きと縦の倍率を求める
export function getBendFromAmount(amount: number): Bend {
  const safeAmount = clampNumber(toSafeNumber(amount), -1, 1);
  return {
    skewDeg: safeAmount * BEND_MAX_SKEW_DEG,
    scaleY: 1 + Math.abs(safeAmount) * (BEND_MAX_SCALE_Y - 1),
  };
}

// スクロールの速さ（px/秒）から，傾きと縦の倍率を直接求める
export function getBend(velocityPxPerSec: number): Bend {
  return getBendFromAmount(getBendAmount(velocityPxPerSec));
}

// 臨界減衰ばねを dtSec 秒だけ進める．
// 解析解を使うので，フレーム間隔が長くても不安定にならず，行き過ぎない
// （目標より手前から始めて速さ 0 なら，値は目標を超えない）．
export function stepBendSpring(
  state: SpringState,
  target: number,
  dtSec: number,
  responseSec: number = BEND_SPRING_RESPONSE_SEC,
): SpringState {
  const safeTarget = toSafeNumber(target);
  const safeDt = toSafeNumber(dtSec);
  if (safeDt <= 0) {
    return { value: toSafeNumber(state.value), velocity: toSafeNumber(state.velocity) };
  }
  const safeResponse = responseSec > 0 && Number.isFinite(responseSec) ? responseSec : BEND_SPRING_RESPONSE_SEC;
  // 角周波数．応答時間が経つと，目標との差が 2% 以下になるように決める
  const omega = (2 * Math.PI) / safeResponse;
  const distance = toSafeNumber(state.value) - safeTarget;
  const velocity = toSafeNumber(state.velocity);
  const carry = velocity + omega * distance;
  const decay = Math.exp(-omega * safeDt);
  return {
    value: safeTarget + (distance + carry * safeDt) * decay,
    velocity: (velocity - omega * carry * safeDt) * decay,
  };
}

// ばねが，目標の近くで止まったとみなせるか
export function isBendSettled(state: SpringState, target: number): boolean {
  return (
    Math.abs(toSafeNumber(state.value) - toSafeNumber(target)) < BEND_REST_DISTANCE &&
    Math.abs(toSafeNumber(state.velocity)) < BEND_REST_SPEED
  );
}

// スクロール量（px）と経過時間（ミリ秒）から，速さ（px/秒）を求める．
// 経過時間は下限と上限の内側に丸める
export function getScrollVelocity(deltaPx: number, elapsedMs: number): number {
  const safeElapsed = clampNumber(toSafeNumber(elapsedMs), BEND_MIN_SAMPLE_MS, BEND_MAX_SAMPLE_MS);
  return (toSafeNumber(deltaPx) / safeElapsed) * MS_PER_SECOND;
}

// 傾きと倍率を，style.transform に書く文字列にする．
// どちらもほぼ変化がないときは 'none'（静止時に変形を残さない）
export function toBendTransform(bend: Bend): string {
  const skewDeg = toSafeNumber(bend.skewDeg);
  const scaleY = Number.isFinite(bend.scaleY) ? bend.scaleY : 1;
  if (Math.abs(skewDeg) < BEND_NEUTRAL_SKEW_DEG && Math.abs(scaleY - 1) < BEND_NEUTRAL_SCALE) {
    return 'none';
  }
  return `skewY(${skewDeg.toFixed(3)}deg) scaleY(${scaleY.toFixed(4)})`;
}
