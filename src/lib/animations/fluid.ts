// 流体の背景の計算（解像度・注入量・眠りの判定・色・出す条件）．
// 画面にも WebGL にも触れない純粋な関数だけを置く．
// 他のファイルを読み込まない（テストが TS をそのまま読み込めるようにするため）．

// ===== 出す条件 =====
// 幅がこれ未満では出さない（CursorRing の引力と同じ基準）
export const FLUID_MIN_VIEWPORT_WIDTH_PX = 761;
// 紹介ページ（/apps/<app>/）は各ページが自前の背景を持つので出さない．例外は一覧の /apps/others
const FLUID_HIDDEN_PATH_PREFIX = '/apps/';
const FLUID_VISIBLE_APPS_PATH = '/apps/others';

// ===== 時間 =====
export const FLUID_MAX_FPS = 60;
// 1 コマで進める時間の上限（秒）．タブが止まっていた直後などに大きく進めない
export const FLUID_MAX_STEP_SEC = 1 / 30;
// 1 コマで進める時間の下限（秒）．速さの計算で 0 割りを避ける
export const FLUID_MIN_STEP_SEC = 1 / 240;
// コマの間引きで許す誤差（ms）．60Hz の描画間隔が 16.67ms なので，ちょうどの間隔でも通す
export const FLUID_FRAME_SLACK_MS = 1;
// ポインタの動きがこの時間以上途切れたら，新しい筆致として扱う（再入場の飛びを線にしない）
export const FLUID_STROKE_GAP_MS = 200;

// ===== 品質（端末に合わせて下げる）=====
export interface FluidQuality {
  // 速度場の短辺側のマス数
  velocityCells: number;
  // 染料の短辺側のマス数
  dyeCells: number;
  // 圧力のヤコビ反復の回数
  jacobiIterations: number;
}

export const FLUID_QUALITY_TIERS: readonly FluidQuality[] = [
  { velocityCells: 128, dyeCells: 512, jacobiIterations: 20 },
  { velocityCells: 96, dyeCells: 384, jacobiIterations: 16 },
  { velocityCells: 64, dyeCells: 256, jacobiIterations: 12 },
];
// 描画間隔の平均がこれを超えたら，1 段階下げる（ms．60Hz の 16.7ms に余裕を足した値）
export const FLUID_SLOW_FRAME_MS = 22;
// 平均を測るのに必要な最小のコマ数
export const FLUID_MEASURE_FRAMES = 45;
// 縦横比の上限（超横長の画面でマスが増えすぎないように）
export const FLUID_MAX_ASPECT = 3;
// メモリがこれ以下の端末，コア数がこれ以下の端末は品質を下げて始める（GB／個）
const FLUID_LOW_MEMORY_GB = 2;
const FLUID_LOW_CORES = 2;
const FLUID_MID_CORES = 4;

// ===== 注入（ポインタの動き → 速度と染料）=====
export const FLUID_MIN_MOVE_PX = 0.5;
// 1 コマでこれ以上飛んだ動きは，ワープ（再入場など）とみなして描かない
export const FLUID_MAX_JUMP_PX = 700;
// 染料の広がり（ガウスの標準偏差相当）の上限の，短辺に対する割合．
// Lusion は 1 コマに動いた距離をそのまま筆の半径にする（ゆっくりなら細く，速いほど太く，上限あり）．それに合わせて，動きに比例させて上限で止める
export const FLUID_SPLAT_RADIUS_RATIO = 0.02;
// 染料の広がりの下限の，短辺に対する割合（ゆっくり動かしたときの細さ）
export const FLUID_SPLAT_MIN_RADIUS_RATIO = 0.006;
// 1 コマに動いた距離（px）に対する，染料の広がり（標準偏差）の倍率
export const FLUID_SPLAT_RADIUS_PER_MOVE = 0.4;
// 動きの線に沿って染料を置く間隔の，半径に対する割合．小さいほど途切れない
export const FLUID_SPLAT_SPACING_RATIO = 0.6;
export const FLUID_MAX_SAMPLES = 24;
// 速度へ注入する倍率（ポインタの速さに対する）
export const FLUID_FORCE_GAIN = 0.9;
// 速さの上限（短辺／秒）
export const FLUID_MAX_SPEED = 8;
// 動いた距離 1px あたりに置く染料の量と，1 回に置く量の上限
export const FLUID_DENSITY_PER_PX = 0.012;
export const FLUID_DENSITY_PER_SAMPLE_MAX = 0.35;
// 画素ごとの染料の上限．これを超えて溜めない（眠るまでの時間の見積もりにも使う）
export const FLUID_DENSITY_CAP = 1;

// ===== 薄れ方 =====
// 1 秒あたりに残る割合
export const FLUID_DYE_RETENTION_PER_SEC = 0.25;
export const FLUID_VELOCITY_RETENTION_PER_SEC = 0.1;
// これ未満の染料は見えない（描画のしきい値）
export const FLUID_VISIBLE_DENSITY = 0.02;
// 見積もりに足す余裕（ms）
const FLUID_FADE_MARGIN_MS = 400;
// 見積もりができないときの，眠るまでの時間（ms）
const FLUID_FALLBACK_FADE_MS = 8000;

// ===== 層 =====
// 'behind'：本文の背後（z-index: -1）．カード・画像・文字の上には出ない＝何もない所だけで見える．
//   ただし不透明な背景をもつ章（Hero・Showcase・About・Skills・GitHub・Contact など）の裏では見えない．
// 'overlay'：本文の上にブレンドで薄く重ねる（ライトは multiply，ダークは screen）．どの章でも見えるが，カードにも薄く乗る．
export type FluidLayerMode = 'behind' | 'overlay';
export const FLUID_LAYER_MODE: FluidLayerMode = 'overlay';
// 層ごとの z-index．overlay は本文（main．10）より上，ナビ（50）より下
export const FLUID_LAYER_Z_INDEX: Record<FluidLayerMode, number> = { behind: -1, overlay: 20 };

// ===== 色 =====
// 染料の色相の移ろい（rad／秒）．筆致に沿って，シャボン玉の虹色の位相がゆっくり変わる
const FLUID_HUE_RATE = 0.9;

export type FluidRgb = readonly [number, number, number];

export interface FluidColors {
  // シャボン玉の虹色に混ぜる，淡い水色（サイトのアクセントには依存しない）
  primary: FluidRgb;
  // シャボン玉の虹色に混ぜる，淡いピンク紫
  secondary: FluidRgb;
  // 最も濃いところの不透明度（控えめ）
  maxAlpha: number;
}

// Lusion 風のシャボン玉（薄膜干渉）の虹色に混ぜる，淡い 2 色．虹色そのものはシェーダー側で作る．
// サイトのアクセント色には引っ張られない
const FLUID_TINT_CYAN = { light: '#8fd3ff', dark: '#8fe0ff' } as const;
const FLUID_TINT_PINK = { light: '#d9a8ff', dark: '#ffb8e8' } as const;
// 最大の不透明度．虹色は淡い色なので，ライト（乗算）でも見えるよう少し持ち上げ，ダークは暗い面の上で少し明るく．
// overlay は本文にも乗るので，behind より薄くする
// ページを歪ませる層が使えるとき，染料の絵は縁の虹色を足すだけなので，さらに淡くする
const FLUID_MAX_ALPHA = {
  behind: { light: 0.4, dark: 0.46 },
  overlay: { light: 0.16, dark: 0.18 },
} as const;
// ページを歪ませる層が使えないブラウザ（Safari・Firefox）では，染料の絵だけで見せるので，濃さをこの倍率で戻す
export const FLUID_ALPHA_GAIN_WITHOUT_DISTORTION = 2;

// ===== 数の補助 =====
const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

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

// ===== 解像度 =====
export interface FluidGridSize {
  width: number;
  height: number;
}

// 画面の縦横比に合わせたマスの数．短辺が shortCells，長辺は比に応じて増える（上限あり）
export function getFluidGridSize(viewportWidth: number, viewportHeight: number, shortCells: number): FluidGridSize {
  const short = Math.max(1, Math.round(finiteOr(shortCells, 1)));
  const width = Math.max(1, finiteOr(viewportWidth, 1));
  const height = Math.max(1, finiteOr(viewportHeight, 1));
  const ratio = clamp(width / height, 1 / FLUID_MAX_ASPECT, FLUID_MAX_ASPECT);
  if (ratio >= 1) return { width: Math.round(short * ratio), height: short };
  return { width: short, height: Math.round(short / ratio) };
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

// ===== 時間 =====
// 描画を間引くか．前のコマからの経過が足りないとき true（最大 FLUID_MAX_FPS）
export function shouldSkipFrame(nowMs: number, lastFrameMs: number, maxFps: number = FLUID_MAX_FPS): boolean {
  if (!(maxFps > 0) || !Number.isFinite(lastFrameMs)) return false;
  return nowMs - lastFrameMs < 1000 / maxFps - FLUID_FRAME_SLACK_MS;
}

// 1 コマで進める時間（秒）．極端に短い・長い間隔は丸める
export function getFluidStepSec(frameMs: number): number {
  return clamp(finiteOr(frameMs, 1000 / FLUID_MAX_FPS) / 1000, FLUID_MIN_STEP_SEC, FLUID_MAX_STEP_SEC);
}

// 1 秒あたりに残る割合 retention を，dt 秒ぶんの係数にする
export function getDecayFactor(stepSec: number, retentionPerSec: number): number {
  const retention = clamp(finiteOr(retentionPerSec, 1), 0, 1);
  return retention ** Math.max(0, finiteOr(stepSec, 0));
}

// 染料が最大の濃さから見えなくなるまでの時間（ms）．移流は染料を増やさないので，減衰だけで上から押さえられる
export function getFluidFadeMs(
  maxDensity: number = FLUID_DENSITY_CAP,
  retentionPerSec: number = FLUID_DYE_RETENTION_PER_SEC,
  visibleDensity: number = FLUID_VISIBLE_DENSITY,
): number {
  if (!(visibleDensity > 0) || !(maxDensity > visibleDensity)) return 0;
  if (!(retentionPerSec > 0 && retentionPerSec < 1)) return FLUID_FALLBACK_FADE_MS;
  const seconds = Math.log(visibleDensity / maxDensity) / Math.log(retentionPerSec);
  return Math.ceil(seconds * 1000) + FLUID_FADE_MARGIN_MS;
}

// 最後に染料を置いてから十分に時間がたち，描画を止めて眠ってよいか
export function isFluidAsleep(nowMs: number, lastInjectMs: number, fadeMs: number = getFluidFadeMs()): boolean {
  if (!Number.isFinite(lastInjectMs)) return true;
  return nowMs - lastInjectMs >= fadeMs;
}

// ===== 注入 =====
export interface FluidPoint {
  x: number;
  y: number;
}

export interface FluidViewport {
  width: number;
  height: number;
}

// 1 か所に置く染料と速度．x, y は 0〜1（y は上向き）．
// velocityX, velocityY は短辺／秒（y は上向き）．hue は 0〜1（虹色の位相のずれ）．
// radiusPx は染料の広がり（px）．ポインタの動きの大きさで変わる
export interface FluidSplat {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  density: number;
  hue: number;
  radiusPx: number;
}

// 染料の広がりの半径（px）の上限
export function getFluidSplatRadiusPx(viewport: FluidViewport): number {
  return Math.min(finiteOr(viewport.width, 1), finiteOr(viewport.height, 1)) * FLUID_SPLAT_RADIUS_RATIO;
}

// 1 コマに distancePx 動いたときの，染料の広がりの半径（px）．動きに比例し，下限と上限（getFluidSplatRadiusPx）で止める
export function getFluidSplatRadiusForMovePx(viewport: FluidViewport, distancePx: number): number {
  const shortSide = Math.min(finiteOr(viewport.width, 1), finiteOr(viewport.height, 1));
  const maximum = getFluidSplatRadiusPx(viewport);
  const minimum = Math.min(shortSide * FLUID_SPLAT_MIN_RADIUS_RATIO, maximum);
  return clamp(finiteOr(distancePx, 0) * FLUID_SPLAT_RADIUS_PER_MOVE, minimum, maximum);
}

// ポインタが from から to へ dtSec かけて動いたときの，染料と速度の置き場所．
// 動きに沿って間隔をあけて並べるので，速く動かしても線が途切れない．動かなかった・ワープしたときは空
export function getPointerSplats(
  from: FluidPoint,
  to: FluidPoint,
  dtSec: number,
  viewport: FluidViewport,
  hue: number,
): FluidSplat[] {
  const width = finiteOr(viewport.width, 0);
  const height = finiteOr(viewport.height, 0);
  if (!(width > 0 && height > 0)) return [];
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (!Number.isFinite(distance) || distance < FLUID_MIN_MOVE_PX || distance > FLUID_MAX_JUMP_PX) return [];

  const shortSide = Math.min(width, height);
  const stepSec = Math.max(finiteOr(dtSec, FLUID_MIN_STEP_SEC), FLUID_MIN_STEP_SEC);
  const speed = Math.min(distance / shortSide / stepSec, FLUID_MAX_SPEED);
  // 画面の座標は下向きが正なので，y を反転して上向きにそろえる
  const velocityX = (deltaX / distance) * speed;
  const velocityY = (-deltaY / distance) * speed;

  const radiusPx = getFluidSplatRadiusForMovePx(viewport, distance);
  const spacing = radiusPx * FLUID_SPLAT_SPACING_RATIO;
  const count = clamp(Math.ceil(distance / spacing), 1, FLUID_MAX_SAMPLES);
  const density = Math.min(FLUID_DENSITY_PER_SAMPLE_MAX, (FLUID_DENSITY_PER_PX * distance) / count);
  const safeHue = clamp(finiteOr(hue, 0), 0, 1);

  const splats: FluidSplat[] = [];
  for (let index = 1; index <= count; index += 1) {
    const progress = index / count;
    splats.push({
      x: clamp((from.x + deltaX * progress) / width, 0, 1),
      y: clamp(1 - (from.y + deltaY * progress) / height, 0, 1),
      velocityX,
      velocityY,
      density,
      hue: safeHue,
      radiusPx,
    });
  }
  return splats;
}

// 染料の色相（0〜1）．虹色の位相のずれとして使い，時間とともにゆるやかに行き来する
export function getDyeHue(timeSec: number): number {
  return 0.5 + 0.5 * Math.sin(finiteOr(timeSec, 0) * FLUID_HUE_RATE);
}

// ===== 色 =====
// '#rgb'・'#rrggbb'・'rgb(r, g, b)' を 0〜1 の色にする．読めなければ null
export function parseCssColor(value: string): FluidRgb | null {
  const text = (value || '').trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    const channel = (offset: number) => Number.parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return [channel(0), channel(2), channel(4)];
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(text);
  if (rgb) {
    const channel = (text: string) => clamp(Number(text) / 255, 0, 1);
    return [channel(rgb[1]), channel(rgb[2]), channel(rgb[3])];
  }
  return null;
}

// テーマに合わせた染料の色．虹色は Lusion に合わせて固定し，サイトのアクセント色（--site-accent）は使わない
// （accentCss は呼び出し側との互換のために受け取るだけ）
export function getFluidColors(isDark: boolean, _accentCss?: string, layer: FluidLayerMode = FLUID_LAYER_MODE): FluidColors {
  const mode = isDark ? 'dark' : 'light';
  const primary = parseCssColor(FLUID_TINT_CYAN[mode]) as FluidRgb;
  const secondary = parseCssColor(FLUID_TINT_PINK[mode]) as FluidRgb;
  return { primary, secondary, maxAlpha: FLUID_MAX_ALPHA[layer][mode] };
}
