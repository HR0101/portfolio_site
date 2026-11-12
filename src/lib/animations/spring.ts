// 物理的なばね（質量 1）の純粋な計算．
// 「応答時間（response）」と「減衰比（damping ratio）」から剛性と減衰を決め，目標値へ向かう動きを進める．
// 他のファイルを読み込まない（テストが TS をそのまま読み込めるようにするため）．

// 減衰比の既定値．1.0 は臨界減衰で，目標を行き過ぎない
export const DEFAULT_DAMPING_RATIO = 1;
// 応答時間が不正なときの代わりの値（秒）
const FALLBACK_RESPONSE_SEC = 0.4;
// 1 回の計算に含める時間の上限（秒）．長いフレームはこの幅に分割する
export const MAX_SUBSTEP_SEC = 0.008;
// 止まったとみなす，目標との差と速さの既定のしきい値
export const REST_POSITION_EPSILON = 0.001;
export const REST_VELOCITY_EPSILON = 0.01;
// 減衰比が 1 とみなせる範囲（臨界減衰の式を使う）
const CRITICAL_TOLERANCE = 1e-6;

export interface SpringConfig {
  // 剛性 k（目標との差に比例して戻す力）
  stiffness: number;
  // 減衰 c（速さに比例して止める力）
  damping: number;
}

export interface SpringState {
  value: number;
  // 1 秒あたりの変化量
  velocity: number;
}

export interface SpringRestThresholds {
  position?: number;
  velocity?: number;
}

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

// 応答時間 T（秒）と減衰比 ζ から，k = (2π / T)² と c = 2ζ√k を求める
export function springFromResponse(responseSec: number, dampingRatio: number = DEFAULT_DAMPING_RATIO): SpringConfig {
  const response = isPositiveFinite(responseSec) ? responseSec : FALLBACK_RESPONSE_SEC;
  const ratio = Number.isFinite(dampingRatio) && dampingRatio >= 0 ? dampingRatio : DEFAULT_DAMPING_RATIO;
  const omega = (2 * Math.PI) / response;
  return { stiffness: omega * omega, damping: 2 * ratio * omega };
}

// 1 区間（h 秒）を，解析解でそのまま進める．区間が短くても長くても，数値の誤差で行き過ぎたり発散したりしない
function advance(state: SpringState, target: number, config: SpringConfig, h: number): SpringState {
  const omega = Math.sqrt(config.stiffness);
  const ratio = config.damping / (2 * omega);
  const offset = state.value - target;
  const velocity = state.velocity;

  if (Math.abs(ratio - 1) < CRITICAL_TOLERANCE) {
    // 臨界減衰：y = e^(-ωt) (A + Bt)
    const decay = Math.exp(-omega * h);
    return {
      value: target + decay * (offset * (1 + omega * h) + velocity * h),
      velocity: decay * (velocity * (1 - omega * h) - omega * omega * offset * h),
    };
  }
  if (ratio < 1) {
    // 不足減衰：少し行き過ぎてから収まる
    const damped = omega * Math.sqrt(1 - ratio * ratio);
    const decay = Math.exp(-ratio * omega * h);
    const cos = Math.cos(damped * h);
    const sin = Math.sin(damped * h);
    return {
      value: target + decay * (offset * cos + ((velocity + ratio * omega * offset) / damped) * sin),
      velocity: decay * (velocity * cos - ((ratio * omega * velocity + omega * omega * offset) / damped) * sin),
    };
  }
  // 過減衰：ゆっくり戻る．2 つの実数の根の和で表す
  const root = omega * Math.sqrt(ratio * ratio - 1);
  const slow = -(ratio * omega - root);
  const fast = -(ratio * omega + root);
  const fastWeight = (velocity - slow * offset) / (fast - slow);
  const slowWeight = offset - fastWeight;
  const slowDecay = Math.exp(slow * h);
  const fastDecay = Math.exp(fast * h);
  return {
    value: target + slowWeight * slowDecay + fastWeight * fastDecay,
    velocity: slowWeight * slow * slowDecay + fastWeight * fast * fastDecay,
  };
}

// 時間 dtSec（秒）だけ進めた状態を返す．dt は MAX_SUBSTEP_SEC 以下に分割し，区間ごとに解析解で進める．
// 途中で目標が変わっても，現在の値と速度から続けるので，値も速度も途切れない
export function stepSpring(state: SpringState, target: number, config: SpringConfig, dtSec: number): SpringState {
  if (!Number.isFinite(state.value) || !Number.isFinite(state.velocity) || !Number.isFinite(target)) {
    return { value: Number.isFinite(target) ? target : 0, velocity: 0 };
  }
  if (!isPositiveFinite(dtSec) || !isPositiveFinite(config.stiffness) || !Number.isFinite(config.damping) || config.damping < 0) {
    return { value: state.value, velocity: state.velocity };
  }
  const steps = Math.max(1, Math.ceil(dtSec / MAX_SUBSTEP_SEC));
  const h = dtSec / steps;
  let next = state;
  for (let step = 0; step < steps; step++) next = advance(next, target, config, h);
  return next;
}

// 目標の近くで，ほとんど動いていないか
export function isSpringAtRest(state: SpringState, target: number, thresholds: SpringRestThresholds = {}): boolean {
  const position = thresholds.position ?? REST_POSITION_EPSILON;
  const velocity = thresholds.velocity ?? REST_VELOCITY_EPSILON;
  return Math.abs(target - state.value) < position && Math.abs(state.velocity) < velocity;
}
