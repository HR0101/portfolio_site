// BusTimeApp の紹介ページで，録画の枠が小さな状態から大きな枠へ育つ動きの純粋関数．
// 他のファイルを import しない自己完結のモジュールで，DOM にも触れない（単体テストは tests/anim-growing-reel.test.mjs）．
//
// スクロール量（場面の上端が固定位置を通り過ぎた量）
//   → getReelProgress で「育つ進み」と「再生の進み」に分ける（育ち切ってから動画が進み始める）
//   → getReelState で枠の translate・scale・角丸・再生表示の濃さへ
//   → toReelTransform で transform の文字列へ
// という流れで使う．

// 育ち始めの大きさ（育ち切ったときの幅に対する倍率）
export const REEL_START_SCALE = 0.38;
// 育つ区間の長さ（画面の高さに対する割合）．product.module.css の --reel-grow（70vh）と同じ値にそろえる
export const REEL_GROW_VIEWPORT_RATIO = 0.7;
// 育つ区間の最後で，育ち切ったまま保つ割合．この間に再生の表示が最も濃くなる
export const REEL_GROW_HOLD_RATIO = 0.12;
// 育ち方の曲線（ease-out．べき乗の指数）
export const REEL_EASE_POWER = 2;
// 角丸（見た目の大きさ，px）．育ち始めは少し丸く，育ち切ると元の枠の角丸（.videoFrame の 38px）になる
export const REEL_RADIUS_START_PX = 22;
export const REEL_RADIUS_END_PX = 38;
// 枠の縁（padding 4px + border 1px）．内側の動画の角丸は，外側から縁の分だけ引く
export const REEL_BEZEL_PX = 5;
// 再生の表示：育つ進みがこの値を超えると現れはじめ，1 で最も濃くなる
export const REEL_PLAY_FADE_IN_START = 0.7;
// 再生の表示：再生の進みがこの値まで進む間に消える
export const REEL_PLAY_FADE_OUT_END = 0.04;
// 再生の表示の最大の濃さ（薄く出す）
export const REEL_PLAY_MAX_OPACITY = 0.92;
// transform の文字列の桁数
const TRANSFORM_TRANSLATE_DIGITS = 2;
const TRANSFORM_SCALE_DIGITS = 4;
// 単位変換と，ほぼ 0 とみなす値
const IDENTITY_EPSILON = 0.0005;

export interface ReelSize {
  width: number;
  height: number;
}

export interface ReelProgress {
  // 枠が育つ進み（0〜1）．1 で大きな枠
  grow: number;
  // 動画の再生の進み（0〜1）．育ち切ってから進み始める
  play: number;
}

export interface ReelStateInput {
  // 育つ進み（0〜1）
  grow: number;
  // 再生の進み（0〜1）．再生の表示を消すのに使う
  play: number;
  // 育ち切ったときの枠のレイアウト上の寸法（px）．transform の影響を受けない値を渡す
  frame: ReelSize;
  // 育ち始めの横のずれ（px．正で右）．既定は 0
  startOffsetX?: number;
}

export interface ReelState {
  // 枠の移動（px）．transform-origin が中央のときの値
  translateX: number;
  translateY: number;
  // 枠の倍率
  scale: number;
  // 枠（外側）の border-radius（px）．scale をかけたあとの見た目が REEL_RADIUS_* になる値
  borderRadius: number;
  // 内側の動画の border-radius（px）
  innerRadius: number;
  // 再生の表示の濃さ（0〜1）
  playOpacity: number;
}

// 数でない値（NaN）と -0 を 0 にそろえる
function toSafeNumber(value: number): number {
  return Number.isFinite(value) ? value || 0 : 0;
}

// 0〜1 に丸める
export function clampUnit(value: number): number {
  return Math.min(Math.max(toSafeNumber(value), 0), 1);
}

// 2 つの値のあいだを，進み具合 amount（0〜1）で混ぜる
function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

// ease-out．最初は速く，終わりに向けてゆっくり止まる
export function easeOutPower(value: number): number {
  return 1 - Math.pow(1 - clampUnit(value), REEL_EASE_POWER);
}

// なめらかな 0→1（両端でゆるやか）
function smoothStep(value: number): number {
  const t = clampUnit(value);
  return t * t * (3 - 2 * t);
}

// スクロール量から，育つ進みと再生の進みを求める．
// scrollInto は，場面の上端が固定位置を通り過ぎた量（px．固定される前は負）．
// 育つ区間（growDistance）の終わりの holdRatio 分は，育ち切ったまま保つ．
// growDistance が 0 以下なら育つ区間はなく，再生の進みだけが 0→1 になる（これまでの場面と同じ）．
export function getReelProgress(
  scrollInto: number,
  growDistance: number,
  playDistance: number,
  holdRatio: number = REEL_GROW_HOLD_RATIO,
): ReelProgress {
  const into = toSafeNumber(scrollInto);
  const growLength = Math.max(toSafeNumber(growDistance), 0);
  const playLength = toSafeNumber(playDistance);
  const hold = Math.min(Math.max(toSafeNumber(holdRatio), 0), 0.9);

  const growActiveLength = growLength * (1 - hold);
  // 保つ割合の上限は 0.9 なので，育つ区間があるかぎり growActiveLength は 0 にならない
  const grow = growLength <= 0 ? 1 : clampUnit(into / growActiveLength);
  const play = playLength <= 0 ? 0 : clampUnit((into - growLength) / playLength);

  return { grow, play };
}

// 再生の進みから，それを実現するスクロール量（場面の上端が固定位置を通り過ぎた量）を求める．
// チャプターのボタンから，その場面までスクロールするときに使う（getReelProgress の逆）
export function getScrollForPlay(play: number, growDistance: number, playDistance: number): number {
  const growLength = Math.max(toSafeNumber(growDistance), 0);
  const playLength = Math.max(toSafeNumber(playDistance), 0);
  return growLength + clampUnit(play) * playLength;
}

// 枠の位置・大きさ・角丸・再生の表示を求める．
// 枠は，育ち切ったときの寸法でレイアウトしておき，transform だけで小さく見せる．
// 下端は育つあいだ動かさず（下の進行バーとボタンを避ける），上端が持ち上がるように育つ．
export function getReelState(input: ReelStateInput): ReelState {
  const grow = clampUnit(input.grow);
  const play = clampUnit(input.play);
  const frameHeight = Math.max(toSafeNumber(input.frame.height), 0);
  const startOffsetX = toSafeNumber(input.startOffsetX ?? 0);

  const eased = easeOutPower(grow);
  const scale = lerp(REEL_START_SCALE, 1, eased);
  // 中央を原点に縮めると下端が持ち上がるので，縮めた分の半分だけ下げて下端をそろえる
  const translateY = (frameHeight * (1 - scale)) / 2;
  const translateX = startOffsetX * (1 - eased);

  // 見た目の角丸が一定の割合で大きくなるよう，scale の逆数で補う
  const visualRadius = lerp(REEL_RADIUS_START_PX, REEL_RADIUS_END_PX, eased);
  const borderRadius = visualRadius / scale;
  const innerRadius = Math.max(borderRadius - REEL_BEZEL_PX, 0);

  // 再生の表示は，育ち切る手前で現れ，再生が進み始めると消える
  const fadeIn = smoothStep((grow - REEL_PLAY_FADE_IN_START) / (1 - REEL_PLAY_FADE_IN_START));
  const fadeOut = smoothStep(play / REEL_PLAY_FADE_OUT_END);
  const playOpacity = REEL_PLAY_MAX_OPACITY * fadeIn * (1 - fadeOut);

  return { translateX, translateY, scale, borderRadius, innerRadius, playOpacity };
}

// 状態から transform の文字列を作る．育ち切ったときは none（余計な変形を残さない）
export function toReelTransform(state: ReelState): string {
  const isIdentity =
    Math.abs(state.translateX) < IDENTITY_EPSILON &&
    Math.abs(state.translateY) < IDENTITY_EPSILON &&
    Math.abs(state.scale - 1) < IDENTITY_EPSILON;
  if (isIdentity) {
    return 'none';
  }
  const x = state.translateX.toFixed(TRANSFORM_TRANSLATE_DIGITS);
  const y = state.translateY.toFixed(TRANSFORM_TRANSLATE_DIGITS);
  const scale = state.scale.toFixed(TRANSFORM_SCALE_DIGITS);
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}
