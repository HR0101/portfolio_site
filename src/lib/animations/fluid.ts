// 流体カーソルの計算（解像度・筆の半径・慣性・薄れ・眠りの判定・色・出す条件）．
// 画面にも WebGL にも触れない純粋な関数だけを置く．
// 他のファイルを読み込まない（テストが TS をそのまま読み込めるようにするため）．
//
// 方式：流体の方程式は解かない．画面の 1/4 の解像度で「速度」と「2 種類の重み」を塗るバッファを 1 枚持ち，
// 毎コマ，筆（マウスの移動の線分）を足し，ぼかした低解像度の写しで自分自身を運び，指数的に薄れさせる．
// 表示は，その速度と重みから，位相の違う正弦（淡い虹色の干渉縞）を計算して色を足す．
// 参考の値（60fps 前提のコマあたりの値）を既定にし，経過時間で補正する．

// ===== 出す条件 =====
// 幅がこれ未満では出さない（CursorRing の引力と同じ基準）
export const FLUID_MIN_VIEWPORT_WIDTH_PX = 761;
// 紹介ページ（/apps/<app>/）は各ページが自前の背景を持つので出さない．例外は一覧の /apps/others
const FLUID_HIDDEN_PATH_PREFIX = '/apps/';
const FLUID_VISIBLE_APPS_PATH = '/apps/others';

// ===== 数の補助 =====
const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

// ===== 時間 =====
export const FLUID_MAX_FPS = 60;
// 参考の「コマあたりの値」が前提にしている描画の速さ（fps）．薄れ・押す力・慣性は，この速さに換算して経過時間で補正する
export const FLUID_REFERENCE_FPS = 60;
// 1 コマで進める時間の上限（秒）．タブが止まっていた直後などに大きく進めない
export const FLUID_MAX_STEP_SEC = 1 / 20;
// 1 コマで進める時間の下限（秒）．速さの計算で 0 割りを避ける
export const FLUID_MIN_STEP_SEC = 1 / 240;
// コマの間引きで許す誤差（ms）．60Hz の描画間隔が 16.67ms なので，ちょうどの間隔でも通す
export const FLUID_FRAME_SLACK_MS = 1;
// ポインタの動きがこの時間以上途切れたら，新しい筆致として扱う（再入場の飛びを線にしない）
export const FLUID_STROKE_GAP_MS = 200;

// 描画を間引くか．前のコマからの経過が足りないとき true（最大 FLUID_MAX_FPS）
export function shouldSkipFrame(nowMs: number, lastFrameMs: number, maxFps: number = FLUID_MAX_FPS): boolean {
  if (!(maxFps > 0) || !Number.isFinite(lastFrameMs)) return false;
  return nowMs - lastFrameMs < 1000 / maxFps - FLUID_FRAME_SLACK_MS;
}

// 1 コマで進める時間（秒）．極端に短い・長い間隔は丸める
export function getFluidStepSec(frameMs: number): number {
  return clamp(finiteOr(frameMs, 1000 / FLUID_MAX_FPS) / 1000, FLUID_MIN_STEP_SEC, FLUID_MAX_STEP_SEC);
}

// 60fps の 1 コマで factor 倍になる量を，stepSec 秒ぶんの倍率にする（0.975 なら 60fps で 0.975，30fps で 0.975²）
export function getFrameDecay(factorPerFrame: number, stepSec: number): number {
  const factor = clamp(finiteOr(factorPerFrame, 1), 0, 1);
  return factor ** (Math.max(0, finiteOr(stepSec, 0)) * FLUID_REFERENCE_FPS);
}

// ===== バッファの薄れ（60fps の 1 コマあたり）=====
// 速度は長く残し，重み 1 はゆっくり，重み 2 は速く薄れる（2 種類の重みで，尾の濃さに段をつける）
export const FLUID_VELOCITY_DECAY = 0.975;
export const FLUID_WEIGHT_A_DECAY = 0.95;
export const FLUID_WEIGHT_B_DECAY = 0.8;

// ===== 筆（マウスの移動の線分）=====
// 1 コマ（60fps 換算）に動いた距離（px）に比例して，筆の半径（px）が決まる．上限はこの値（CSS の px．参考は 100．彗星の細さに合わせて小さくした）
export const FLUID_BRUSH_MAX_PX = 64;
// 動いた距離に対する筆の半径の倍率．参考は 1（0〜100px → 0〜100px）．
// 1 では，ふつうの速さ（秒速 1000px 前後）で筆が細すぎてほとんど見えず，参考の絵の太さにならなかったので 2 にした
export const FLUID_BRUSH_RADIUS_PER_PX = 2;
// これ未満の動きは「止まっている」とみなして何も塗らない（px）
export const FLUID_MIN_MOVE_PX = 0.5;
// 1 コマでこれ以上飛んだ動きは，ワープ（再入場など）とみなして描かない
export const FLUID_MAX_JUMP_PX = 700;
// 筆の慣性．前の値を残す割合（60fps の 1 コマあたり）
export const FLUID_VELOCITY_INERTIA = 0.8;
// 速度の目標値：ポインタの速さ（CSS の px／秒）あたり．参考の「移動量（バッファの画素）× dt × 0.8」の定常値と同じ
export const FLUID_VELOCITY_PER_PX_PER_SEC = 1 / 3600;
// バッファに書ける速度の大きさの上限（0.5 を 0 とするので，±0.5）
export const FLUID_MAX_VELOCITY = 0.5;

// 1 コマに moveDistancePx 動いたときの，筆の半径（CSS の px）．
// 描画の速さによらないよう，動いた距離を 60fps の 1 コマぶんに換算してから，上限で止める．止まっていれば 0
export function getFluidBrushRadiusPx(moveDistancePx: number, stepSec: number): number {
  const move = finiteOr(moveDistancePx, 0);
  if (move < FLUID_MIN_MOVE_PX) return 0;
  const step = Math.max(finiteOr(stepSec, 1 / FLUID_REFERENCE_FPS), FLUID_MIN_STEP_SEC);
  const perReferenceFrame = (move * (1 / FLUID_REFERENCE_FPS)) / step;
  return clamp(perReferenceFrame * FLUID_BRUSH_RADIUS_PER_PX, 0, FLUID_BRUSH_MAX_PX);
}

export interface FluidVelocity {
  x: number;
  y: number;
}

// 慣性つきの速度を 1 コマ進める．deltaX・deltaY はそのコマに動いた距離（CSS の px）
export function advanceFluidVelocity(
  previous: FluidVelocity,
  deltaX: number,
  deltaY: number,
  stepSec: number,
): FluidVelocity {
  const step = Math.max(finiteOr(stepSec, 1 / FLUID_REFERENCE_FPS), FLUID_MIN_STEP_SEC);
  const keep = getFrameDecay(FLUID_VELOCITY_INERTIA, step);
  const toTarget = (delta: number) => clamp((finiteOr(delta, 0) / step) * FLUID_VELOCITY_PER_PX_PER_SEC, -FLUID_MAX_VELOCITY, FLUID_MAX_VELOCITY);
  const blend = (before: number, delta: number) => clamp(finiteOr(before, 0) * keep + toTarget(delta) * (1 - keep), -FLUID_MAX_VELOCITY, FLUID_MAX_VELOCITY);
  return { x: blend(previous.x, deltaX), y: blend(previous.y, deltaY) };
}

// ===== 移流（ぼかした低解像度の写しで，自分自身を運ぶ）=====
// 速度 1（= 0.5 ぶん）あたりに前のコマから読みにいく距離（CSS の px．60fps の 1 コマあたり）．
// 参考は，バッファの 25 画素（= 100px）．100px では尾が扇のように広がるので，彗星の細さに合わせて半分にした
export const FLUID_PUSH_PX = 50;
// 細い舌を作る勾配ノイズ：1 周期の長さ（CSS の px．参考は，バッファの位置 × 0.02 ＝ 画素 50 個ぶん）と，微分成分に掛ける倍率（CSS の px）
// 参考の倍率は，バッファの 3 画素（= 12px）．この実装では 12px だと，画素の歪みが急に変わる所で鋭い折れ目（切り取ったような平らな縁）が出るので 3px にした
export const FLUID_NOISE_PERIOD_PX = 200;
export const FLUID_NOISE_GAIN_PX = 3;
// ノイズの位置を速度・重みで少し歪める大きさ（ノイズの 1 周期を 1 とする）．大きいと速度の境目で縞が細かく乱れる
export const FLUID_NOISE_WARP_VELOCITY = 0.3;
export const FLUID_NOISE_WARP_WEIGHT = 0.1;
// ぼかした写しのガウスぼかしの半径（CSS の px．参考は 1/8 解像度で半径 8 ＝ 64px）．標準偏差は半径の 1/3
export const FLUID_BLUR_RADIUS_PX = 64;
export const FLUID_BLUR_SIGMA_RATIO = 1 / 3;

// ===== 品質（端末に合わせて下げる）=====
export interface FluidQuality {
  // バッファの大きさ：画面の幅・高さを，この数で割る（参考は 4．1/4 の解像度）
  bufferDivisor: number;
  // 画面へ描く canvas の，CSS の 1px あたりの画素数（参考どおり 1/2 以下．やわらかい絵なので CSS で拡大しても粗さは目立たない）
  displayScale: number;
}

export const FLUID_QUALITY_TIERS: readonly FluidQuality[] = [
  { bufferDivisor: 4, displayScale: 0.5 },
  { bufferDivisor: 6, displayScale: 0.4 },
  { bufferDivisor: 8, displayScale: 0.3 },
];
// ぼかした写しは，バッファのさらに 1/2 の解像度（参考は 1/8）
export const FLUID_BLUR_DIVISOR_RATIO = 2;
// 描画間隔の平均がこれを超えたら，1 段階下げる（ms．60Hz の 16.7ms に余裕を足した値）
export const FLUID_SLOW_FRAME_MS = 22;
// 平均を測るのに必要な最小のコマ数
export const FLUID_MEASURE_FRAMES = 45;
// メモリがこれ以下の端末，コア数がこれ以下の端末は品質を下げて始める（GB／個）
const FLUID_LOW_MEMORY_GB = 2;
const FLUID_LOW_CORES = 2;
const FLUID_MID_CORES = 4;

// 描画の粗さの下限（CSS の 1px あたりの画素数）
export const FLUID_MIN_DISPLAY_SCALE = 0.25;

export interface FluidSize {
  width: number;
  height: number;
}

// 画面の大きさを divisor で割った大きさ（1 以上の整数）
export function getFluidScaledSize(viewportWidth: number, viewportHeight: number, divisor: number): FluidSize {
  const safeDivisor = Math.max(1, finiteOr(divisor, 1));
  return {
    width: Math.max(1, Math.round(Math.max(1, finiteOr(viewportWidth, 1)) / safeDivisor)),
    height: Math.max(1, Math.round(Math.max(1, finiteOr(viewportHeight, 1)) / safeDivisor)),
  };
}

// 画面へ描く canvas の大きさ（CSS の画素数 × 倍率．端末の倍率には依らない）
export function getFluidDisplaySize(viewportWidth: number, viewportHeight: number, displayScale: number): FluidSize {
  const scale = clamp(finiteOr(displayScale, 0.5), FLUID_MIN_DISPLAY_SCALE, 1);
  return getFluidScaledSize(viewportWidth, viewportHeight, 1 / scale);
}

// 端末の余力から，最初の品質の段階を決める（0 が最高）
export function pickInitialQualityTier(hardware: { cores?: number; memoryGb?: number }): number {
  const cores = finiteOr(hardware.cores ?? Number.NaN, Number.POSITIVE_INFINITY);
  const memory = finiteOr(hardware.memoryGb ?? Number.NaN, Number.POSITIVE_INFINITY);
  if (memory <= FLUID_LOW_MEMORY_GB || cores <= FLUID_LOW_CORES) return FLUID_QUALITY_TIERS.length - 1;
  if (cores <= FLUID_MID_CORES) return 1;
  return 0;
}

// 描画間隔の平均が長いとき，1 段階だけ下げる．上げ直さない（行き来して揺れないように）
export function getNextQualityTier(currentTier: number, averageFrameMs: number): number {
  const lastTier = FLUID_QUALITY_TIERS.length - 1;
  const tier = clamp(Math.round(finiteOr(currentTier, 0)), 0, lastTier);
  if (Number.isFinite(averageFrameMs) && averageFrameMs > FLUID_SLOW_FRAME_MS) return Math.min(tier + 1, lastTier);
  return tier;
}

// ===== 眠り =====
// 色の振れ幅の上限が，この値（0〜1．8 ビットで 1.5 段階ぶん）を下回ったら，ほぼ見えない（眠る）
export const FLUID_INVISIBLE_LEVEL = 1.5 / 255;
// 眠る直前に，層の不透明度をなだらかに 0 へ下げる時間（ms）．この時点の色はすでにごく薄いので，段差は見えない
export const FLUID_LAYER_FADE_MS = 400;

// 始点 > 終点でも決まる smoothstep．表示のシェーダーの falloff と同じ式
export function getFluidFalloff(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// 最後に筆を置いてから，色の振れ幅が見えなくなるまでの時間（ms）．
// 重み (z + w) / 2 は，足し込まれても 1 で止まるので，最大 0.5 から指数的に薄れる．
// 速度 |0.5 − xy| × 2 も同じ速さで薄れるので，振れ幅の上限は
//   陰影 × 重み 0 での減衰の値 × 色の倍率 × 0.5 × (速度の薄れ × 重み 1 の薄れ)^コマ数
export function getFluidSleepMs(colorMultiplier: number = FLUID_LOOKS.light.colorMultiplier): number {
  const ceiling = FLUID_SHADE * getFluidFalloff(FLUID_FALLOFF_START, FLUID_FALLOFF_END, 0) * Math.max(0, finiteOr(colorMultiplier, 0)) * 0.5;
  if (!(ceiling > FLUID_INVISIBLE_LEVEL)) return 0;
  const frames = Math.log(FLUID_INVISIBLE_LEVEL / ceiling) / Math.log(FLUID_VELOCITY_DECAY * FLUID_WEIGHT_A_DECAY);
  return Math.ceil((frames / FLUID_REFERENCE_FPS) * 1000);
}

// 最後に筆を置いてから十分に時間がたち，描画を止めて眠ってよいか
export function isFluidAsleep(nowMs: number, lastInjectMs: number, sleepMs: number = getFluidSleepMs()): boolean {
  if (!Number.isFinite(lastInjectMs)) return true;
  return nowMs - lastInjectMs >= sleepMs;
}

// 最後に筆を置いてからの経過（ms）に対する，層の不透明度（0〜1）．眠る直前だけ，なだらかに 0 へ下げる
// （それまでは，バッファ自身の指数的な薄れに任せる）
export function getFluidLayerOpacity(sinceInjectMs: number, sleepMs: number = getFluidSleepMs()): number {
  const t = clamp((sleepMs - finiteOr(sinceInjectMs, 0)) / FLUID_LAYER_FADE_MS, 0, 1);
  return t * t * (3 - 2 * t);
}

// ===== 層 =====
// 本文の上（main．10）で，ナビ（50）より下に，通常のアルファ合成（乗算済み）で重ねる．mix-blend-mode は使わない
export const FLUID_LAYER_Z_INDEX = 20;

// ===== 表示（色を足す）=====
// 参考の式：足す色 = sin((vel.x + vel.y) × 位相の倍率 + (0, 2, 4) × RGB のずれ)
//                    × smoothstep(始点, 終点, 重み) × 陰影 × max(|vel.x|, |vel.y|) × 色の倍率
// 重み = (z + w) / 2，vel = (0.5 − xy) × 2 × 重み．RGB で位相が違うので，淡い虹色の干渉縞になる
// 位相の倍率．参考は 40．40 だと，筆の縁で縞が細かく乱れ（低い解像度のバッファでは階段状に見える），虹色が強く出すぎる．
// 縞がなめらかなまま，頭に淡い紫が出る 28 にした（18 だと水色一色に寄る）
export const FLUID_PHASE_SCALE = 28;
export const FLUID_RGB_SHIFT = 0.5;
export const FLUID_SHADE = 1.25;
// 重みが多いほど色が弱まる．重み FLUID_FALLOFF_START で 0，FLUID_FALLOFF_END で 1（始点 > 終点なので，逆向きの smoothstep）
export const FLUID_FALLOFF_START = 0.4;
export const FLUID_FALLOFF_END = -0.9;

// テーマごとの見た目の強さ．
// 明るい背景は，正の成分が頭打ち（白はそれ以上明るくならない）なので，負の成分が作る淡い色の筋が主役になる．
// 暗い背景は，加算がよく見えるので，強さを別に持つ
export interface FluidLook {
  // 色の倍率（参考のトップページは 10）
  colorMultiplier: number;
  // 彩度（1 で正弦のまま，小さいほど白っぽい光に寄る）
  saturation: number;
}

// 強さは，参考の画像と見比べて決めた値
export const FLUID_LOOKS: Record<'light' | 'dark', FluidLook> = {
  light: { colorMultiplier: 24, saturation: 1 },
  dark: { colorMultiplier: 50, saturation: 0.55 },
};

export function getFluidLook(isDark: boolean): FluidLook {
  return isDark ? FLUID_LOOKS.dark : FLUID_LOOKS.light;
}

// ===== 出す条件 =====
export interface FluidEnvironment {
  // FEATURES.fluidCursor
  featureEnabled: boolean;
  // prefers-reduced-motion: reduce
  reducedMotion: boolean;
  // (hover: hover) and (pointer: fine)
  hoverFine: boolean;
  viewportWidth: number;
  // html.is-preloading（読み込み画面の間）
  preloading: boolean;
  // 出してよいページか（isFluidPath）
  pathAllowed: boolean;
}

// 出してよい条件がそろっているか
export function isFluidEnvironmentAllowed(environment: FluidEnvironment): boolean {
  return (
    environment.featureEnabled &&
    !environment.reducedMotion &&
    environment.hoverFine &&
    finiteOr(environment.viewportWidth, 0) >= FLUID_MIN_VIEWPORT_WIDTH_PX &&
    !environment.preloading &&
    environment.pathAllowed
  );
}

// 共通レイアウトのページだけで出す．紹介ページ（/apps/<app>/）は各ページの配色を守るため出さない
export function isFluidPath(pathname: string): boolean {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  if (path === FLUID_VISIBLE_APPS_PATH) return true;
  return !(path + '/').startsWith(FLUID_HIDDEN_PATH_PREFIX);
}

// ===== ポインタ =====
export interface FluidPoint {
  x: number;
  y: number;
}

// 前のコマから今のコマへのポインタの動きが，筆として使えるか（動いていて，ワープではない）
export function isFluidStroke(from: FluidPoint, to: FluidPoint): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return Number.isFinite(distance) && distance >= FLUID_MIN_MOVE_PX && distance <= FLUID_MAX_JUMP_PX;
}
