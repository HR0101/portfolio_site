// 自己紹介のカードが「粒子になって，次のカードへ再形成される」動きの計算と描画．
// 粒子はカードの面の上の位置（a, b）をずっと持っているので，出発のカードの形から立ちのぼり，
// 到着のカードの形へ戻って集まる．位置は進み具合（0〜1）だけで決まる純粋な計算なので，
// スクロールの量にそのまま連動でき，逆に戻しても同じ軌道をたどる．

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  w: number;
  h: number;
}

export interface Particle {
  // カードの面の上の位置（0〜1）
  a: number;
  b: number;
  // 散るときの向き（ラジアン）と距離（カードの幅に対する割合）
  angle: number;
  reach: number;
  // 飛んでいる間に向きが回る量（ラジアン）
  swirl: number;
  // 動き出す遅れ（0〜1）．左の粒子から先に動く
  delay: number;
  // 大きさ（px）／色の振り分け（0〜1）／またたきの位相
  size: number;
  tone: number;
  phase: number;
}

export interface ParticleState {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export type Rgb = readonly [number, number, number];

// 4 枚のカードが置かれる場所（カードを動かせる範囲に対する割合）．横は左端（0）か右端（1）のどちらかで，
// 高さだけが段階的に下がる：左上（高さ 0）→ 右（1/3）→ 左（2/3）→ 右下（1）．スクロールするほど，左右へ振れながら下りていく
export const CARD_SLOTS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 / 3 },
  { x: 0, y: 2 / 3 },
  { x: 1, y: 1 },
];

// 粒子の数と，その内訳（面の上に散らす粒子／縁を描く粒子）
export const PARTICLE_COUNT = 3600;
const EDGE_SHARE = 0.2;
// 面の縦横比（粒子を面に均等に配るための目安）
const FACE_ASPECT = 1.45;
// 動き出しの遅れの幅（進み具合に対する割合）．大きいほど，左から右へ崩れていく様子がはっきりする
const DELAY_SPAN = 0.4;
// 左右の位置と乱数のどちらで遅れを決めるか
const DELAY_BY_POSITION = 0.62;
// 散る距離の範囲（カードの幅に対する割合）
const REACH_MIN = 0.04;
const REACH_RANGE = 0.3;
// 縦方向に散る幅の割合（横より少し控えめにする）
const VERTICAL_SPREAD = 0.8;
// 粒子の大きさの範囲（px）と，散っている間に大きくなる割合
const SIZE_MIN = 1.2;
const SIZE_RANGE = 2.1;
const SIZE_GROWTH = 0.6;
// またたきの強さと速さ
const TWINKLE_DEPTH = 0.45;
const TWINKLE_SPEED = 12;
// 墨色（中立の色）で描く粒子の割合．残りは章の色で描く
export const INK_SHARE = 0.3;
// 動いていない（カードが正面にある）と見なす進み具合の幅
const REST_MARGIN = 0.002;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const easeInOutCubic = (value: number) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2);

// 決まった種から同じ並びの乱数を作る（粒子の配置が毎回同じになる）
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// 面の縁（長方形の外周）の上の位置を，0〜1 の通し番号から求める
function getEdgePoint(share: number): Point {
  const total = 2 * (FACE_ASPECT + 1);
  const distance = share * total;
  if (distance < FACE_ASPECT) return { x: distance / FACE_ASPECT, y: 0 };
  if (distance < FACE_ASPECT + 1) return { x: 1, y: distance - FACE_ASPECT };
  if (distance < 2 * FACE_ASPECT + 1) return { x: 1 - (distance - FACE_ASPECT - 1) / FACE_ASPECT, y: 1 };
  return { x: 0, y: 1 - (distance - 2 * FACE_ASPECT - 1) };
}

// 粒子を作る．面の上に偏りなく散らした粒子と，縁をなぞる粒子から成る．
// 墨色で描く粒子（tone が小さいもの）が先頭にまとまるように並べ，描画のときに色の切り替えを 1 回で済ませる
export function createParticles(count: number = PARTICLE_COUNT, seed = 11): Particle[] {
  const random = createRandom(seed);
  const edgeCount = Math.round(count * EDGE_SHARE);
  const innerCount = count - edgeCount;
  const columns = Math.max(1, Math.ceil(Math.sqrt(innerCount * FACE_ASPECT)));
  const rows = Math.max(1, Math.ceil(innerCount / columns));
  const particles: Particle[] = [];
  for (let index = 0; index < count; index++) {
    let a: number;
    let b: number;
    if (index < innerCount) {
      a = ((index % columns) + random()) / columns;
      b = (Math.floor(index / columns) + random()) / rows;
    } else {
      const point = getEdgePoint((index - innerCount + random() * 0.8) / edgeCount);
      a = point.x;
      b = point.y;
    }
    particles.push({
      a: clamp(a),
      b: clamp(b),
      angle: random() * Math.PI * 2,
      reach: REACH_MIN + random() * REACH_RANGE,
      swirl: (random() - 0.5) * 4.4,
      delay: clamp(DELAY_BY_POSITION * a + (1 - DELAY_BY_POSITION) * random()),
      size: SIZE_MIN + random() * SIZE_RANGE,
      tone: random(),
      phase: random() * Math.PI * 2,
    });
  }
  return particles.sort((first, second) => first.tone - second.tone);
}

// 粒子 1 つの，進み具合（0〜1）での位置と見た目．out に書き込むので，毎フレームの割り当てが起きない
export function evaluateParticle(particle: Particle, from: Rect, to: Rect, progress: number, out: ParticleState) {
  const local = clamp((progress - particle.delay * DELAY_SPAN) / (1 - DELAY_SPAN));
  const travel = easeInOutCubic(local);
  // 出発と到着では 0，途中で最も大きくなる
  const bell = Math.sin(Math.PI * local);
  const fromX = from.x + particle.a * from.w;
  const fromY = from.y + particle.b * from.h;
  const toX = to.x + particle.a * to.w;
  const toY = to.y + particle.b * to.h;
  const spread = particle.reach * from.w * bell;
  const heading = particle.angle + particle.swirl * local;
  out.x = fromX + (toX - fromX) * travel + Math.cos(heading) * spread;
  out.y = fromY + (toY - fromY) * travel + Math.sin(heading) * spread * VERTICAL_SPREAD;
  out.alpha = 1 - TWINKLE_DEPTH * (0.5 + 0.5 * Math.sin(particle.phase + progress * TWINKLE_SPEED));
  out.size = particle.size * (1 + SIZE_GROWTH * bell);
}

// 項目の一覧（情報系の学生 …）が立つ場所．カードが左端にあるときは右端，右端にあるときは左端に立ち，
// 縦はカードと同じ高さに合わせる（いずれも動かせる範囲に対する割合．x は 0 が左端，1 が右端）
export function getListSlot(position: number, slots: readonly Point[] = CARD_SLOTS): Point {
  const last = Math.max(0, slots.length - 1);
  const value = Math.min(last, Math.max(0, position));
  const from = Math.min(Math.max(0, last - 1), Math.floor(value));
  const to = Math.min(last, from + 1);
  const amount = smoothstep(clamp(value - from));
  const side = (slot: Point) => (slot.x < 0.5 ? 1 : 0);
  return {
    x: side(slots[from]) + (side(slots[to]) - side(slots[from])) * amount,
    y: slots[from].y + (slots[to].y - slots[from].y) * amount,
  };
}

// カードの位置（0〜count-1 の実数）から，いま粒子が動いている区間を求める．
// カードが正面にあるとき（動いていないとき）は null
export function getTransit(position: number, count: number) {
  const last = Math.max(0, Math.floor(count) - 1);
  if (last === 0 || !(position > 0) || !(position < last)) return null;
  const from = Math.min(last - 1, Math.floor(position));
  const progress = position - from;
  if (progress < REST_MARGIN || progress > 1 - REST_MARGIN) return null;
  return { from, to: from + 1, progress };
}

// 受け渡される主役（惑星）の通り道．出発の位置から到着の位置へ，少し弧を描いて進む
export function getCoreTrail(from: Point, to: Point, progress: number, arc: number): Point {
  const travel = easeInOutCubic(clamp(progress));
  const lift = Math.sin(Math.PI * clamp(progress)) * arc;
  return { x: from.x + (to.x - from.x) * travel, y: from.y + (to.y - from.y) * travel - lift };
}

export function parseHexColor(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(letter => letter + letter).join('') : value;
  const number = parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

export function mixColors(first: Rgb, second: Rgb, amount: number): Rgb {
  return [
    Math.round(first[0] + (second[0] - first[0]) * amount),
    Math.round(first[1] + (second[1] - first[1]) * amount),
    Math.round(first[2] + (second[2] - first[2]) * amount),
  ];
}

export interface TransitView {
  // 描画面の大きさ（CSS px）と，画面の密度
  width: number;
  height: number;
  pixelRatio: number;
  // 描画面の左上から見た，カードを置く場所の原点（粒子が枠の外へ散れるよう余白を取るため）
  origin: Point;
  // カードの幅を基準にした拡大率（粒子の大きさにかける）
  scale: number;
}

export interface TransitColors {
  from: Rgb;
  to: Rgb;
  ink: Rgb;
}

const scratch: ParticleState = { x: 0, y: 0, alpha: 1, size: 1 };
const rgba = (color: Rgb) => `rgb(${color[0]} ${color[1]} ${color[2]})`;
// 受け渡される主役（惑星）が次のカードへ運ばれるときの，弧の高さ（px．カードの幅 560px のとき）
export const PLANET_ARC = 70;
// 光をまとう粒子の大きさの下限（px）と，光の濃さ・広がり
const GLOW_SIZE = SIZE_MIN + SIZE_RANGE * 0.7;
const GLOW_ALPHA = 0.16;
const GLOW_SCALE = 2.6;

// 粒子を描く．visibility（0〜1）は，カード本体がどれだけ消えているか（消えているほど粒子が見える）
export function drawTransit(
  context: CanvasRenderingContext2D,
  particles: readonly Particle[],
  from: Rect,
  to: Rect,
  progress: number,
  visibility: number,
  view: TransitView,
  colors: TransitColors,
) {
  context.setTransform(view.pixelRatio, 0, 0, view.pixelRatio, 0, 0);
  context.clearRect(0, 0, view.width, view.height);
  if (visibility <= 0.003) return;
  const shiftedFrom: Rect = { ...from, x: from.x + view.origin.x, y: from.y + view.origin.y };
  const shiftedTo: Rect = { ...to, x: to.x + view.origin.x, y: to.y + view.origin.y };
  const accent = rgba(mixColors(colors.from, colors.to, smoothstep(clamp(progress))));
  const ink = rgba(colors.ink);
  let lastIsInk: boolean | null = null;
  for (const particle of particles) {
    evaluateParticle(particle, shiftedFrom, shiftedTo, progress, scratch);
    const isInk = particle.tone < INK_SHARE;
    if (isInk !== lastIsInk) {
      context.fillStyle = isInk ? ink : accent;
      lastIsInk = isInk;
    }
    const alpha = scratch.alpha * visibility;
    const radius = (scratch.size * view.scale) / 2;
    // 大きめの粒子は，まわりにうっすら光をまとう
    if (!isInk && particle.size > GLOW_SIZE) {
      context.globalAlpha = alpha * GLOW_ALPHA;
      context.beginPath();
      context.arc(scratch.x, scratch.y, radius * GLOW_SCALE, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = alpha * (isInk ? 0.5 : 0.95);
    context.beginPath();
    context.arc(scratch.x, scratch.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

export function clearTransit(context: CanvasRenderingContext2D, view: TransitView) {
  context.setTransform(view.pixelRatio, 0, 0, view.pixelRatio, 0, 0);
  context.clearRect(0, 0, view.width, view.height);
}
