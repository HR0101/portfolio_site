// 自己紹介の「点の図形」の計算（画面に触れない純粋関数．テストは tests/anim-about-figures.test.mjs）．
// 同じ数の粒が，章ごとに別の立体（脳・携帯・チップ・つながった 2 つの輪）の表面へ並び替わる．
// 座標は中心が原点，縦横とも -1〜1 の箱（y は下向きが正，z は手前が正）．同じ入力からは必ず同じ並びになる．

// 図形を作る点の数（どの図形も同じ数．並び替えのため）
export const FIGURE_POINT_COUNT = 7800;

// 1 章を読ませる長さと，次の章へ並び替える長さの比（並び替えを 1 としたときの，読ませる長さ）
export const HOLD_SHARE = 1.6;
const MOVE_SHARE = 1;

// 点ごとの出発の遅れの幅（0〜1 の並び替えのうち，この割合までばらつかせる）
export const POINT_STAGGER = 0.56;
// 並び替えの途中で，まっすぐな道から横へふくらむ量（箱の座標）
export const POINT_SWIRL = 0.72;
// 文章が消え切る距離（章の番号の差．0.5 で，章と章のちょうど中間で入れ替わる）
export const COPY_FADE_SPAN = 0.5;

// 並び替えの途中で，点が手前・奥へ浮く量（箱の座標）．浮いた点は大きくぼけて見える
export const POINT_LIFT = 1.25;
// 並び替えの途中で，点が四方へ散る量（箱の座標．点ごとの大きさで 0.3〜1 倍にばらつく）
export const POINT_SCATTER = 2.85;
// 視点から図形の板までの距離（箱の座標．小さいほど遠近が強い）
export const CAMERA_DISTANCE = 3.4;
// 最初の立体（脳）のおおよその半径（箱の座標）と，脳を見せる正面寄り水平視点（縦には傾けず横方向へ回す）
export const SPHERE_RADIUS = 0.8;
export const BRAIN_VIEW_X = 0.08;
export const BRAIN_VIEW_Y = 0.56;
// 面からのわずかな浮き沈み（箱の座標）．粒が 1 枚の面にそろいすぎないようにする
const SURFACE_JITTER = 0.012;
// 板の形（携帯・チップ）の粒の配り方：手前の面・奥の面はまばらに，側面・ピン・面の上の線は濃く置く
const FACE_DENSITY = 0.3;
const BACK_DENSITY = 0.12;
const EDGE_DENSITY = 2.4;
const PIN_DENSITY = 2.2;
const DETAIL_WEIGHT = 0.42;
// 寝かせた輪を手前へ起こす角度（ラジアン）
const RING_LEAN = 0.5;
// 線の法線を数値で求めるときの刻み
const NORMAL_STEP = 0.001;

export type AboutFigureKind = 'learn' | 'apps' | 'hardware' | 'trust';

// 立体の図形：表面に置いた粒の位置と，その場所の面の向き（外向きの法線）
export interface AboutFigure {
  // x, y, z を順に並べた座標（長さは 粒の数 × 3）
  points: Float32Array;
  // 面の向き（長さは 粒の数 × 3）．視線に対して縁にあたる粒を見分けるのに使う
  normals: Float32Array;
  // 色の決め方に使う値（0〜1．長さは粒の数）．小さい値は白，大きい値はほかの章の色になる
  tones: Float32Array;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 種から決まる擬似乱数（mulberry32）．0 以上 1 未満
export function createRandom(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== 図形の部品 =====
// 表面の 1 区画：広さ（粒を配る割合）と，その上の 1 点（位置と面の向き）を返す関数
interface Patch {
  area: number;
  sample: (random: () => number) => [number, number, number, number, number, number];
}

// 平面上の線（0〜1 の位置の点を返す）
interface Stroke {
  length: number;
  at: (t: number) => [number, number];
}

function line(x1: number, y1: number, x2: number, y2: number): Stroke {
  return { length: Math.hypot(x2 - x1, y2 - y1), at: t => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] };
}

function arc(cx: number, cy: number, radius: number, from: number, to: number): Stroke {
  return {
    length: Math.abs(to - from) * radius,
    at: t => [cx + Math.cos(from + (to - from) * t) * radius, cy + Math.sin(from + (to - from) * t) * radius],
  };
}

// 角の丸い四角の外周（中心・幅・高さ・角の半径）
function roundedRect(cx: number, cy: number, width: number, height: number, radius: number): Stroke[] {
  const left = cx - width / 2, right = cx + width / 2, top = cy - height / 2, bottom = cy + height / 2;
  const quarter = Math.PI / 2;
  return [
    line(left + radius, top, right - radius, top),
    arc(right - radius, top + radius, radius, -quarter, 0),
    line(right, top + radius, right, bottom - radius),
    arc(right - radius, bottom - radius, radius, 0, quarter),
    line(right - radius, bottom, left + radius, bottom),
    arc(left + radius, bottom - radius, radius, quarter, quarter * 2),
    line(left, bottom - radius, left, top + radius),
    arc(left + radius, top + radius, radius, quarter * 2, quarter * 3),
  ];
}

// 角の丸い四角の内側か
function insideRoundedRect(x: number, y: number, halfWidth: number, halfHeight: number, radius: number): boolean {
  const dx = Math.abs(x) - (halfWidth - radius), dy = Math.abs(y) - (halfHeight - radius);
  if (dx <= 0 || dy <= 0) return Math.abs(x) <= halfWidth && Math.abs(y) <= halfHeight;
  return dx * dx + dy * dy <= radius * radius;
}

// 平らな面（z が一定の，角の丸い四角）．facing は面の向き（1 が手前，-1 が奥），density は粒の濃さ（1 が標準）
function facePatch(cx: number, cy: number, halfWidth: number, halfHeight: number, radius: number, z: number, facing: number, density = 1): Patch {
  return {
    area: halfWidth * halfHeight * 4 * density,
    sample: random => {
      let x = 0, y = 0;
      // 角の外に出た点は取り直す（角は小さいので，数回で決まる）
      for (let attempt = 0; attempt < 8; attempt += 1) {
        x = (random() * 2 - 1) * halfWidth; y = (random() * 2 - 1) * halfHeight;
        if (insideRoundedRect(x, y, halfWidth, halfHeight, radius)) break;
      }
      return [cx + x, cy + y, z, 0, 0, facing];
    },
  };
}

// 線を奥行き方向へ伸ばした帯（側面）．面の向きは，線に直角で中心から遠ざかる向き．density は粒の濃さ
function bandPatch(stroke: Stroke, zFrom: number, zTo: number, density = 1): Patch {
  const originX = 0, originY = 0;
  return {
    area: stroke.length * Math.abs(zTo - zFrom) * density,
    sample: random => {
      const t = random();
      const [x, y] = stroke.at(t);
      const [aheadX, aheadY] = stroke.at(Math.min(1, t + NORMAL_STEP));
      const [behindX, behindY] = stroke.at(Math.max(0, t - NORMAL_STEP));
      let normalX = aheadY - behindY, normalY = -(aheadX - behindX);
      const length = Math.hypot(normalX, normalY) || 1;
      normalX /= length; normalY /= length;
      if (normalX * (x - originX) + normalY * (y - originY) < 0) { normalX = -normalX; normalY = -normalY; }
      return [x, y, zFrom + (zTo - zFrom) * random(), normalX, normalY, 0];
    },
  };
}

// 面の上に描いた線（画面の中の部品など）．weight は，線の長さ 1 あたりの広さ（粒の濃さ）
function tracePatch(stroke: Stroke, z: number, facing: number, weight: number): Patch {
  return {
    area: stroke.length * weight,
    sample: random => {
      const [x, y] = stroke.at(random());
      return [x, y, z, 0, 0, facing];
    },
  };
}

// 輪（トーラス）．plane が 'xy' なら画面と同じ向き，'xz' なら床と同じ向きに寝かせる
function torusPatch(cx: number, radius: number, tube: number, plane: 'xy' | 'xz'): Patch {
  const turn = Math.PI * 2;
  return {
    area: turn * radius * turn * tube,
    sample: random => {
      const around = random() * turn, across = random() * turn;
      const ringX = Math.cos(around), ringY = Math.sin(around);
      const out = Math.cos(across), up = Math.sin(across);
      const x = (radius + tube * out) * ringX, y = (radius + tube * out) * ringY, z = tube * up;
      const normalX = out * ringX, normalY = out * ringY, normalZ = up;
      if (plane === 'xy') return [cx + x, y, z, normalX, normalY, normalZ];
      // 寝かせた輪は，手前へ少し起こす（正面から見ても輪の形が読める）
      const cos = Math.cos(RING_LEAN), sin = Math.sin(RING_LEAN);
      return [cx + x, z * cos + y * sin, y * cos - z * sin, normalX, normalZ * cos + normalY * sin, normalY * cos - normalZ * sin];
    },
  };
}

// 区画の広さに比例して粒を配り，合計をちょうど count にする
function samplePatches(patches: Patch[], count: number, random: () => number): AboutFigure {
  const total = patches.reduce((sum, patch) => sum + patch.area, 0) || 1;
  // 切り捨てで配るので，合計は count 以下．余りは先頭の区画から 1 つずつ足す
  const shares = patches.map(patch => Math.floor(patch.area / total * count));
  let rest = count - shares.reduce((sum, share) => sum + share, 0);
  for (let index = 0; rest > 0; index = (index + 1) % shares.length) {
    shares[index] += 1;
    rest -= 1;
  }
  const points = new Float32Array(count * 3), normals = new Float32Array(count * 3), tones = new Float32Array(count);
  let cursor = 0;
  patches.forEach((patch, patchIndex) => {
    for (let step = 0; step < shares[patchIndex]; step += 1) {
      const [x, y, z, normalX, normalY, normalZ] = patch.sample(random);
      const lift = (random() - 0.5) * SURFACE_JITTER;
      points.set([x + normalX * lift, y + normalY * lift, z + normalZ * lift], cursor * 3);
      normals.set([normalX, normalY, normalZ], cursor * 3);
      tones[cursor] = random();
      cursor += 1;
    }
  });
  return { points, normals, tones };
}

// 中心からの角度の順（同じ角度なら内側から）に並べ直す．図形から図形へ，粒が渦を巻くように流れる
function sortByAngle(figure: AboutFigure): AboutFigure {
  const count = figure.points.length / 3;
  const order = Array.from({ length: count }, (_, index) => index);
  const angle = (index: number) => Math.atan2(figure.points[index * 3 + 1], figure.points[index * 3]);
  const radius = (index: number) => Math.hypot(figure.points[index * 3], figure.points[index * 3 + 1]);
  order.sort((a, b) => angle(a) - angle(b) || radius(a) - radius(b) || a - b);
  const points = new Float32Array(count * 3), normals = new Float32Array(count * 3), tones = new Float32Array(count);
  order.forEach((source, target) => {
    tones[target] = figure.tones[source];
    for (let axis = 0; axis < 3; axis += 1) {
      points[target * 3 + axis] = figure.points[source * 3 + axis];
      normals[target * 3 + axis] = figure.normals[source * 3 + axis];
    }
  });
  return { points, normals, tones };
}

// ===== 学ぶ：脳（参考サイト dala.craftedbygc.com の脳輪郭・皮質の溝・小脳・脳幹・4 色分布に極限まで合わせた造形）=====
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
// 参考サイト（desktop-hero）の外郭極座標 r(θ) を 14 次フーリエ級数で近似した係数（x: 前後, y: 上下）
const BRAIN_FOURIER_A = [
  0.85889, 0.03956, 0.13554, -0.01105, -0.01732, -0.00503, -0.01582, 0.00906,
  -0.00014, 0.00474, 0.00621, -0.00026, -0.00044, -0.00105, -0.00359,
] as const;
const BRAIN_FOURIER_B = [
  0, 0.04988, -0.00105, 0.06738, 0.00205, 0.01365, -0.01759, -0.0091,
  0.00096, -0.00627, 0.00146, 0.00308, 0, 0.00131, -0.00152,
] as const;
const BRAIN_OFFSET_Y = -0.04;
const BRAIN_HEIGHT_SCALE = 0.94;
const BRAIN_HALF_WIDTH = 0.81;
// 大脳皮質のしわ（太く連続した脳回・脳溝）と大脳縦裂（左右半球の真ん中の深い割れ目）・小脳ヒダ
const GYRI_SCALE = 0.092;
const FOLIA_SCALE = 0.042;
const SYLVIAN_DEPTH = 0.058;
const TENTORIAL_DEPTH = 0.078;
const HEMI_CLEFT_DEPTH = 0.096;
const SPIRAL_JITTER = 0.015;
const SULCUS_PUSH = 0.024;
const SULCUS_FLOOR_LIMIT = 0.19;
const HEMI_SPLIT_GAP = 0.044;
const HEMI_TWIN_ARCH = 0.042;
// 脳幹（橋のふくらみを備え，側頭葉と小脳の谷間から自然になだらかへ抜ける）
const STEM_START_Y = 0.5;
const STEM_LENGTH = 0.38;
const STEM_TOP_RADIUS = 0.068;
const STEM_TAPER = 0.46;
const BRAIN_STEM_SHARE = 0.026;
// 色の区分（0〜1 の tone を About.tsx の 4 色＝白・金・紫・ティールへ割り当てる．下段は溝の底で暗く沈める値）
const TONE_BUCKETS: readonly [number, number, number, number] = [0.18, 0.48, 0.74, 0.94];
const TONE_SULCUS_BUCKETS: readonly [number, number, number, number] = [0.06, 0.36, 0.62, 0.85];
const SURFACE_EPS = 0.0022;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function gaussian(value: number, center: number, width: number): number {
  const d = (value - center) / width;
  return Math.exp(-d * d);
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function hash01(index: number): number {
  const s = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function smoothMin(a: number, b: number, k: number): number {
  const h = clamp01(0.5 + 0.5 * (b - a) / k);
  return a * h + b * (1 - h) - k * h * (1 - h);
}

function longitudinalMask(x: number, y: number): number {
  // 前頭〜頭頂〜後頭に加えて前側の下端も左右に分けたまま保ち，中脳・脳幹の付け根付近だけで静かに閉じる
  const stemRoot = smoothstep(0.5, 0.72, y) * smoothstep(-0.18, 0.04, x) * (1 - smoothstep(0.24, 0.42, x));
  return 1 - stemRoot;
}

// 角度 θ の脳輪郭半径（参考サイトのフーリエ輪郭を基準に，前頭葉の張り・側頭葉の膨らみ・小脳と後頭葉の段差を精密に整える）
function brainOutlineRadius(theta: number): number {
  let radius = BRAIN_FOURIER_A[0];
  for (let harmonic = 1; harmonic < BRAIN_FOURIER_A.length; harmonic += 1) {
    radius += BRAIN_FOURIER_A[harmonic] * Math.cos(harmonic * theta) + BRAIN_FOURIER_B[harmonic] * Math.sin(harmonic * theta);
  }
  const frontalCrown = 0.034 * gaussian(Math.sin(theta - 3.68), 0, 0.24) * (Math.cos(theta - 3.68) > 0 ? 1 : 0);
  const frontalPole = 0.048 * gaussian(Math.sin(theta - 2.98), 0, 0.18) * (Math.cos(theta - 2.98) > 0 ? 1 : 0);
  const orbitalStep = -0.11 * gaussian(Math.sin(theta - 2.28), 0, 0.14) * (Math.cos(theta - 2.28) > 0 ? 1 : 0);
  const temporalBelly = 0.064 * gaussian(Math.sin(theta - 1.78), 0, 0.21) * (Math.cos(theta - 1.78) > 0 ? 1 : 0);
  const stemValley = -0.092 * gaussian(Math.sin(theta - 1.28), 0, 0.11) * (Math.cos(theta - 1.28) > 0 ? 1 : 0);
  const cerebellumTuck = -0.02 * gaussian(Math.sin(theta - 0.82), 0, 0.17) * (Math.cos(theta - 0.82) > 0 ? 1 : 0);
  const occipitalNotch = -0.12 * gaussian(Math.sin(theta - 0.45), 0, 0.1) * (Math.cos(theta - 0.45) > 0 ? 1 : 0);
  const parietalSmooth = -0.03 * gaussian(Math.sin(theta - 5.45), 0, 0.28) * (Math.cos(theta - 5.45) > 0 ? 1 : 0);
  return radius + frontalCrown + frontalPole + orbitalStep + temporalBelly + stemValley + cerebellumTuck + occipitalNotch + parietalSmooth;
}

// 皮質の蛇行する脳回・脳溝の高さ（上〜前頭〜後頭は太く連続した筒状の脳回，側頭葉は平行に流れるひだ，小脳は細かなヒダを刻む）
function corticalFoldHeight(dx: number, dy: number, dz: number): { height: number; foliaMask: number; cleftDip: number } {
  const foliaMask = smoothstep(0.22, 0.42, dx) * smoothstep(0.28, 0.48, dy);
  const hemiPhase = dz >= 0 ? 0.38 : -0.38;
  const wx = dx + 0.22 * Math.sin(2.9 * dy + 1.2 * dz + 0.5 + hemiPhase) + 0.09 * Math.cos(4.8 * dz - 3.6 * dx);
  const wy = dy + 0.22 * Math.sin(2.8 * dz + 3.1 * dx - 0.4) + 0.09 * Math.cos(4.5 * dx - 3.4 * dy + hemiPhase);
  const wz = dz + 0.18 * Math.sin(3.1 * dx + 2.8 * dy + 0.9) + 0.08 * Math.cos(4.2 * dy - 3.2 * dz);

  const rA = Math.sqrt(Math.sin(wx * 8.8 + wy * 3.8 - wz * 1.8) ** 2 + 0.028);
  const rB = Math.sqrt(Math.sin(wy * 8.2 - wx * 3.6 + wz * 2.6 + 1.15) ** 2 + 0.028);
  const rC = Math.sqrt(Math.sin(wz * 7.6 + wx * 4.4 - wy * 4.1 + 2.3) ** 2 + 0.045);
  const net = 0.8 * smoothMin(rA, rB, 0.22) + 0.2 * rC;
  const upperCortex = Math.pow(clamp01((net - 0.17) / 0.77), 0.42);

  // 側頭葉（外側溝より下）は前方から後方へ斜めに流れる平行な脳回を強調する
  const sylY = 0.06 - 0.3 * dx + 0.05 * Math.sin(dx * 6.4 + 0.5);
  const temporalMask = smoothstep(-0.04, 0.16, dy - sylY) * smoothstep(-0.58, -0.22, dx) * (1 - foliaMask);
  const tempBand = Math.sqrt(Math.sin((dy + 0.26 * dx - 0.045 * Math.sin(dx * 5 + hemiPhase)) * 13.5 + hemiPhase) ** 2 + 0.032);
  const tempHeight = Math.pow(clamp01((tempBand - 0.18) / 0.8), 0.44);
  const cortexHeight = upperCortex * (1 - 0.75 * temporalMask) + tempHeight * (0.75 * temporalMask);

  // 外側溝（前頭・頭頂葉と側頭葉を分ける主溝）
  const sylMask = smoothstep(-0.68, -0.36, dx) * (1 - smoothstep(0.06, 0.36, dx)) * smoothstep(0.16, 0.48, Math.abs(dz));
  const sylDip = Math.exp(-(((dy - sylY) / 0.044) ** 2)) * sylMask;

  // 真ん中の大脳縦裂（左右半球を 2 つに割る深い溝）
  const cleftRegion = longitudinalMask(dx, dy);
  const cleftDip = Math.exp(-((dz / 0.105) ** 2)) * cleftRegion;

  // 小脳は細かな平行ヒダ（folia）を深く刻む
  const foliaWave = Math.sqrt(Math.sin(dy * 30 - dx * 6 + 0.45 * Math.sin(dx * 7.5)) ** 2 + 0.028);
  const foliaHeight = Math.pow(clamp01((foliaWave - 0.17) / 0.82), 0.5);
  const cerebrum = cortexHeight * (1 - 0.64 * sylDip) * (1 - 0.82 * cleftDip);
  const height = clamp01(cerebrum * (1 - foliaMask) + foliaHeight * foliaMask);
  return { height, foliaMask, cleftDip };
}

// 球面上で左右半球を一様に左右へ広げ（特定の列に粒が溜まらない滑らかな分割），脳溝の勾配に沿って点を脳回の壁・尾根へ寄せる
function warpDirectionForSulci(dx: number, dy: number, dz: number): [number, number, number] {
  const step = 0.01;
  let [x, y, z] = [dx, dy, dz];
  const cleftRegion = longitudinalMask(x, y);
  if (cleftRegion > 0.01) {
    const sign = z >= 0 ? 1 : -1;
    const spread = HEMI_SPLIT_GAP * cleftRegion;
    const targetZ = sign * (spread + (1 - spread) * Math.abs(z));
    [x, y, z] = normalize3(x, y, targetZ);
  }
  const lateral = smoothstep(0.1, 0.4, Math.abs(z));
  if (lateral <= 0.001) return [x, y, z];
  for (let pass = 0; pass < 3; pass += 1) {
    const gx = (corticalFoldHeight(...normalize3(x + step, y, z)).height - corticalFoldHeight(...normalize3(x - step, y, z)).height) / (2 * step);
    const gy = (corticalFoldHeight(...normalize3(x, y + step, z)).height - corticalFoldHeight(...normalize3(x, y - step, z)).height) / (2 * step);
    const gz = (corticalFoldHeight(...normalize3(x, y, z + step)).height - corticalFoldHeight(...normalize3(x, y, z - step)).height) / (2 * step);
    const gradMag = Math.hypot(gx, gy, gz);
    if (gradMag > 0.02) {
      const h = corticalFoldHeight(x, y, z).height;
      const push = SULCUS_PUSH * 0.34 * (1 - smoothstep(0.15, 0.88, h)) * lateral;
      [x, y, z] = normalize3(x + (gx / gradMag) * push, y + (gy / gradMag) * push, z + (gz / gradMag) * push);
    }
  }
  return [x, y, z];
}

// 脳全体の立体表面：左右の半球それぞれを丸く盛り上げて中央に深い縦裂を通し，尾根を基準に深いシワと小脳ヒダを彫り込む
function brainSurface(dx: number, dy: number, dz: number): [number, number, number] {
  const rho = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const targetRadius = brainOutlineRadius(theta);
  const blend = 1 - (1 - rho) ** 2;
  const radialScale = BRAIN_FOURIER_A[0] + (targetRadius - BRAIN_FOURIER_A[0]) * blend;
  const twinArch = HEMI_TWIN_ARCH * Math.exp(-(((Math.abs(dz) - 0.36) / 0.28) ** 2)) * (1 - smoothstep(0.05, 0.48, dy));
  // 下面の中央（脳幹付け根の上）をアーチ状に持ち上げ，左右の下葉を丸く張り出させて正面から見た双葉の谷を作る
  const inferiorSplitArch = 0.14 * Math.exp(-((dz / 0.2) ** 2)) * smoothstep(0.16, 0.58, dy);
  const inferiorLobeSag = 0.032 * Math.exp(-(((Math.abs(dz) - 0.48) / 0.22) ** 2)) * smoothstep(0.24, 0.68, dy) * (1 - smoothstep(0.2, 0.45, dx));
  const x = dx * radialScale;
  const y = BRAIN_OFFSET_Y + dy * radialScale * BRAIN_HEIGHT_SCALE - twinArch - inferiorSplitArch + inferiorLobeSag;

  const { height, foliaMask } = corticalFoldHeight(dx, dy, dz);
  // 前頭極と後頭極は角張らせず丸く絞り，中央〜下部の側頭葉だけ左右へ張り出させることで，斜め視点の眼窩くぼみと正面の鐘型を両立する
  const crownTaper = 1 - 0.12 * smoothstep(-0.28, -0.94, dy);
  const temporalCheek = 1 + 0.14 * smoothstep(-0.16, 0.28, dy) * (1 - smoothstep(0.6, 0.92, dy)) * (1 - smoothstep(0.24, 0.56, dx));
  const anteriorTaper = 1 - 0.15 * smoothstep(-0.36, -0.94, dx);
  const posteriorTaper = 1 - 0.18 * smoothstep(0.42, 0.96, dx);
  const orbitalTuck = 1 - 0.14 * smoothstep(-0.34, -0.84, dx) * smoothstep(0.06, 0.46, dy);
  const cereTuckZ = 1 - 0.36 * foliaMask;
  const zScale = BRAIN_HALF_WIDTH * (0.86 + 0.06 * gaussian(dx, 0, 0.55)) * crownTaper * temporalCheek * anteriorTaper * posteriorTaper * orbitalTuck * cereTuckZ;
  const z = dz * zScale;

  const cleftRegion = longitudinalMask(dx, dy);
  const hemiCleft = HEMI_CLEFT_DEPTH * Math.exp(-((dz / 0.072) ** 2)) * cleftRegion;
  const sylvianY = 0.01 - 0.31 * dx;
  const sylvianMask = smoothstep(-0.68, -0.4, dx) * (1 - smoothstep(0.1, 0.38, dx)) * smoothstep(0.18, 0.46, Math.abs(dz)) * (1 - 0.62 * smoothstep(0.66, 0.92, Math.abs(dz)));
  const sylvianGroove = SYLVIAN_DEPTH * Math.exp(-(((y - sylvianY) / 0.046) ** 2)) * sylvianMask;

  // 後頭葉と小脳の境目：深いテント切痕で後頭葉の下に独立した丸い小脳ポッドをくっきり切り分ける
  const tentY = 0.25 - 0.14 * (x - 0.35);
  const tentMask = smoothstep(0.16, 0.32, x) * (1 - smoothstep(0.84, 0.97, x)) * smoothstep(0.12, 0.44, Math.abs(dz));
  const tentGroove = TENTORIAL_DEPTH * Math.exp(-(((y - tentY) / 0.048) ** 2)) * tentMask;
  const cerePod = 0.048 * foliaMask * Math.exp(-(((dx - 0.4) / 0.19) ** 2) - (((dy - 0.56) / 0.2) ** 2));

  const rimAtten = 0.54 + 0.46 * Math.max(smoothstep(0.14, 0.44, Math.abs(dz)), 0.72 * smoothstep(-0.28, -0.78, dx));
  const gyri = ((height - 0.84) * GYRI_SCALE * (1 - foliaMask) + (height - 0.78) * FOLIA_SCALE * foliaMask) * rimAtten;

  const disp = gyri + cerePod - sylvianGroove - tentGroove;
  const radial = Math.hypot(x, y - BRAIN_OFFSET_Y, z) || 1;
  // 縦裂は Z を中心へ引き戻さず，XY 方向の内側へだけ深く凹ませて左右半球の明確な割れ目を保つ．外側溝は側面をえぐりすぎないよう Z 押しを控える
  const xyRadial = Math.hypot(x, y - BRAIN_OFFSET_Y) || 1;
  const zFactor = Math.max(0.45, 1 - 0.65 * (sylvianGroove / SYLVIAN_DEPTH));
  return [
    x + (x / radial) * disp - (x / xyRadial) * hemiCleft,
    y + ((y - BRAIN_OFFSET_Y) / radial) * disp - ((y - BRAIN_OFFSET_Y) / xyRadial) * hemiCleft,
    z + (z / radial) * disp * zFactor,
  ];
}

// 球面上の座標変換関数から，外向きの単位法線を数値微分で求める
function surfaceNormal(
  surface: (dx: number, dy: number, dz: number) => [number, number, number],
  dx: number,
  dy: number,
  dz: number,
): [number, number, number] {
  const refX = Math.abs(dx) < 0.8 ? 1 : 0;
  const refY = 1 - refX;
  const [t1x, t1y, t1z] = normalize3(-dz * refY, dz * refX, dx * refY - dy * refX);
  const t2x = dy * t1z - dz * t1y;
  const t2y = dz * t1x - dx * t1z;
  const t2z = dx * t1y - dy * t1x;

  const [px1, py1, pz1] = surface(...normalize3(dx + SURFACE_EPS * t1x, dy + SURFACE_EPS * t1y, dz + SURFACE_EPS * t1z));
  const [mx1, my1, mz1] = surface(...normalize3(dx - SURFACE_EPS * t1x, dy - SURFACE_EPS * t1y, dz - SURFACE_EPS * t1z));
  const [px2, py2, pz2] = surface(...normalize3(dx + SURFACE_EPS * t2x, dy + SURFACE_EPS * t2y, dz + SURFACE_EPS * t2z));
  const [mx2, my2, mz2] = surface(...normalize3(dx - SURFACE_EPS * t2x, dy - SURFACE_EPS * t2y, dz - SURFACE_EPS * t2z));

  const ux = px1 - mx1, uy = py1 - my1, uz = pz1 - mz1;
  const vx = px2 - mx2, vy = py2 - my2, vz = pz2 - mz2;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return normalize3(nx, ny, nz);
}

// 脳の色の分け方（0: 白，1: 金，2: 紫，3: ティール）．特定の斜め視点に偏らず 3D の各葉・外周（下部〜頭頂〜側頭）に沿って自然な分布にする
function brainColorBucket(x: number, y: number, z: number, index: number): number {
  const jitter = hash01(index);
  const shell3D = Math.hypot(x / 0.96, (y - BRAIN_OFFSET_Y) / 0.74, z / 0.88);
  const absZ = Math.abs(z);
  const waveA = Math.sin(4.2 * x + 2.5 * y + 1.8 * z) * 0.6 + Math.cos(6.1 * x - 4.5 * y + 2.4 * z) * 0.4;
  const waveB = Math.cos(3.7 * x - 3.9 * y + 2.1 * z) * 0.6 + Math.sin(5.4 * y + 3.2 * x - 1.6 * z) * 0.4;

  // 下縁（側頭葉下部・小脳外周・前頭底縁）：前頭下面先端に白/紫のにじみを置き，側頭〜小脳下縁を濃い金で囲む
  if (y > 0.16 && (shell3D > 0.73 || absZ > 0.56)) {
    if (x < -0.58 && y < 0.36) return jitter < 0.54 ? 0 : jitter < 0.8 ? 2 : jitter < 0.92 ? 3 : 1;
    if (x > 0.36 && y < 0.48 && jitter < 0.28) return 2;
    if (z > 0.18 && x < -0.1 && waveA > 0.18 && jitter < 0.24) return 3;
    return jitter < 0.76 ? 1 : jitter < 0.9 ? 2 : jitter < 0.96 ? 0 : 3;
  }

  // 上部の冠（頭頂〜前頭上部）：最頂部（y <= -0.62）に金の縁を残しつつ，前頭外眉に紫・右冠に白ハイライトを置く
  if (y < -0.22 && shell3D > 0.76) {
    if (z < 0.08 && x < -0.44 && x > -0.78 && y > -0.62 && shell3D > 0.82 && jitter < 0.65) return waveA > -0.1 ? 2 : 1;
    if (z > 0.08 && x < 0.34 && jitter < 0.66) return jitter < 0.54 ? 0 : 1;
    if (y <= -0.62 && shell3D > 0.82) return jitter < 0.68 ? 1 : jitter < 0.88 ? 0 : 2;
    if (z < -0.08 && x < 0.16 && jitter < 0.54) return waveA > 0.14 ? 2 : 1;
    return jitter < 0.56 ? 1 : jitter < 0.8 ? 0 : jitter < 0.94 ? 2 : 3;
  }

  // 前・後・外側の縁取り（正面・斜めどちらから見ても外周に薄い光の殻として色彩が出るよう 3D 外殻の細い帯を見る）
  if (absZ > 0.64 || Math.hypot(x / 0.94, (y - BRAIN_OFFSET_Y) / 0.7) > 0.84) {
    if (x < -0.45 && y > -0.08 && y < 0.25) return jitter < 0.5 ? 0 : jitter < 0.76 ? 1 : 2;
    if (x > 0.52 && y < 0.26) return jitter < 0.56 ? 1 : jitter < 0.86 ? 0 : 2;
    if (x < -0.2 && waveA > 0.18 && jitter < 0.32) return 2;
    return jitter < 0.56 ? 1 : jitter < 0.82 ? 0 : jitter < 0.93 ? 2 : 3;
  }

  // 内部の皮質（前頭・側頭・頭頂の内側面）：中心右・前頭に白粒を多く残し，金・紫・ティールを有機的に散らす
  const whiteBias = 0.55 + 0.06 * waveA - 0.05 * Math.max(0, y - 0.18);
  if (jitter < whiteBias) return 0;
  if (jitter < whiteBias + 0.2) return 1;
  if (waveB < -0.1) return 3;
  return waveA > -0.04 ? 2 : 1;
}

// 球の上に，n 個の向きを等間隔に並べたうちの index 番目
function latticeDirection(index: number, total: number): [number, number, number] {
  const y = 1 - (index + 0.5) / total * 2;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = index * GOLDEN_ANGLE;
  return [Math.cos(angle) * ring, y, Math.sin(angle) * ring];
}

function createBrain(count: number): AboutFigure {
  const points = new Float32Array(count * 3), normals = new Float32Array(count * 3), tones = new Float32Array(count);
  const stemCount = Math.floor(count * BRAIN_STEM_SHARE);
  const mainCount = count - stemCount;
  let cursor = 0;
  const put = (x: number, y: number, z: number, normal: readonly [number, number, number], bucket: number, sulcus = false) => {
    points.set([x, y, z], cursor * 3);
    normals.set(normal, cursor * 3);
    tones[cursor] = (sulcus ? TONE_SULCUS_BUCKETS : TONE_BUCKETS)[bucket];
    cursor += 1;
  };

  // 脳本体：らせん列の規則的な縞を抑える微小なゆらぎを入れてから，脳溝を避けつつ立体表面へ写す
  for (let index = 0; index < mainCount; index += 1) {
    const [baseDx, baseDy, baseDz] = latticeDirection(index, mainCount);
    const jx = (hash01(index * 3 + 1) - 0.5) * SPIRAL_JITTER;
    const jy = (hash01(index * 3 + 2) - 0.5) * SPIRAL_JITTER;
    const jz = (hash01(index * 3 + 3) - 0.5) * SPIRAL_JITTER;
    const [rawDx, rawDy, rawDz] = normalize3(baseDx + jx, baseDy + jy, baseDz + jz);
    const [dx, dy, dz] = warpDirectionForSulci(rawDx, rawDy, rawDz);
    const [x, y, z] = brainSurface(dx, dy, dz);
    const normal = surfaceNormal(brainSurface, dx, dy, dz);
    const { height, cleftDip } = corticalFoldHeight(dx, dy, dz);
    const inSulcus = (Math.abs(dz) > 0.16 && height < SULCUS_FLOOR_LIMIT) || cleftDip > 0.72;
    put(x, y, z, normal, brainColorBucket(x, y, z, index), inSulcus);
  }
  // 脳幹：橋（上端前側の自然なふくらみ）から延髄へ向かって緩やかに後方へ抜ける
  for (let step = 0; step < stemCount; step += 1) {
    const along = (step + 0.5) / stemCount, around = step * GOLDEN_ANGLE;
    const normalX = Math.cos(around), normalZ = Math.sin(around);
    const pons = 0.024 * gaussian(along, 0.24, 0.18);
    const centerX = 0.05 + 0.08 * along - pons * 0.6;
    const radius = STEM_TOP_RADIUS * (1 - STEM_TAPER * along) + pons;
    const bucket = step % 2 === 0 ? 2 : step % 3 === 0 ? 3 : 1;
    put(centerX + normalX * radius, STEM_START_Y + STEM_LENGTH * along, normalZ * radius * 0.9, normalize3(normalX * 0.55, 0.2, normalZ * 0.55 - 0.8), bucket);
  }
  return { points, normals, tones };
}

// アプリ：携帯（角の丸い板．手前の面に，上の切り欠き・カード・一覧の行・下の線）
function createPhone(count: number, random: () => number): AboutFigure {
  const halfWidth = 0.5, halfHeight = 0.96, corner = 0.18, halfDepth = 0.07;
  const screen = halfDepth + 0.004;
  const details = [
    ...roundedRect(0, -0.78, 0.3, 0.07, 0.035),
    ...roundedRect(0, -0.3, 0.72, 0.52, 0.08),
    line(-0.36, 0.14, 0.36, 0.14),
    line(-0.36, 0.32, 0.2, 0.32),
    line(-0.36, 0.5, 0.28, 0.5),
    line(-0.17, 0.82, 0.17, 0.82),
  ];
  return samplePatches([
    // 面はまばらに，側面と画面の中の部品は濃く置く（形が読めるように）
    facePatch(0, 0, halfWidth, halfHeight, corner, halfDepth, 1, FACE_DENSITY),
    facePatch(0, 0, halfWidth, halfHeight, corner, -halfDepth, -1, BACK_DENSITY),
    ...roundedRect(0, 0, halfWidth * 2, halfHeight * 2, corner).map(stroke => bandPatch(stroke, -halfDepth, halfDepth, EDGE_DENSITY)),
    ...details.map(stroke => tracePatch(stroke, screen, 1, DETAIL_WEIGHT)),
  ], count, random);
}

// 組込み：チップ（平たい箱．4 辺のピン，上の面に中の回路と向きの印）
function createChip(count: number, random: () => number): AboutFigure {
  const body = 0.58, halfDepth = 0.11, pinLength = 0.3, pinHalf = 0.035;
  const top = halfDepth + 0.004;
  const pinOffsets = [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4];
  // ピンは細い板：上の面と下の面に粒を置く
  const pins = pinOffsets.flatMap(offset => [
    [offset, -body - pinLength / 2, pinHalf, pinLength / 2],
    [offset, body + pinLength / 2, pinHalf, pinLength / 2],
    [-body - pinLength / 2, offset, pinLength / 2, pinHalf],
    [body + pinLength / 2, offset, pinLength / 2, pinHalf],
  ]).flatMap(([cx, cy, halfWidth, halfHeight]) => [
    facePatch(cx, cy, halfWidth, halfHeight, 0, pinHalf, 1, PIN_DENSITY),
    facePatch(cx, cy, halfWidth, halfHeight, 0, -pinHalf, -1, PIN_DENSITY),
  ]);
  const details = [...roundedRect(0, 0, 0.56, 0.56, 0.05), arc(-0.4, -0.4, 0.05, 0, Math.PI * 2)];
  return samplePatches([
    facePatch(0, 0, body, body, 0.08, halfDepth, 1, FACE_DENSITY),
    facePatch(0, 0, body, body, 0.08, -halfDepth, -1, BACK_DENSITY),
    ...roundedRect(0, 0, body * 2, body * 2, 0.08).map(stroke => bandPatch(stroke, -halfDepth, halfDepth, EDGE_DENSITY)),
    ...pins,
    ...details.map(stroke => tracePatch(stroke, top, 1, DETAIL_WEIGHT)),
  ], count, random);
}

// 信頼：鎖のようにつながった 2 つの輪（片方は画面と同じ向き，もう片方は床と同じ向き）
function createRings(count: number, random: () => number): AboutFigure {
  const radius = 0.56, tube = 0.13, offset = 0.3;
  return samplePatches([torusPatch(-offset, radius, tube, 'xy'), torusPatch(offset, radius, tube, 'xz')], count, random);
}

const FIGURE_SEEDS: Record<AboutFigureKind, number> = { learn: 11, apps: 23, hardware: 37, trust: 53 };

// 章の図形を作る（同じ kind・count なら同じ結果）
export function createAboutFigure(kind: AboutFigureKind, count = FIGURE_POINT_COUNT): AboutFigure {
  const total = Math.max(1, Math.floor(count));
  const random = createRandom(FIGURE_SEEDS[kind]);
  switch (kind) {
    case 'learn': return sortByAngle(createBrain(total));
    case 'apps': return sortByAngle(createPhone(total, random));
    case 'hardware': return sortByAngle(createChip(total, random));
    case 'trust': return sortByAngle(createRings(total, random));
  }
}

// 点ごとの性質（出発の遅れ 0〜1，揺らぎの位相，大きさ 0〜1，奥行き -1〜1）．図形によらず同じ
export interface PointTraits {
  delays: Float32Array;
  phases: Float32Array;
  sizes: Float32Array;
  depths: Float32Array;
}

export function createPointTraits(count = FIGURE_POINT_COUNT, seed = 7): PointTraits {
  const total = Math.max(1, Math.floor(count));
  const random = createRandom(seed);
  const delays = new Float32Array(total), phases = new Float32Array(total), sizes = new Float32Array(total), depths = new Float32Array(total);
  for (let index = 0; index < total; index += 1) {
    delays[index] = random();
    phases[index] = random() * Math.PI * 2;
    sizes[index] = random();
    depths[index] = random() * 2 - 1;
  }
  return { delays, phases, sizes, depths };
}

// ===== スクロールの進み → 惑星からの現れ方と，章の進み =====
// 固定表示の最初と最後の，この割合のスクロールで，粒が惑星の点から現れ（最後は惑星の点へ戻る）
export const EMERGE_SHARE = 0.11;

export interface AboutPhase {
  // 0 で粒はすべて惑星の点の上，1 で図形になり切っている
  emerge: number;
  // 章の進み（0〜1．getAboutState などに渡す）
  chapters: number;
}

export function getAboutPhase(progress: number): AboutPhase {
  const value = clamp01(progress);
  return {
    emerge: clamp01(Math.min(value, 1 - value) / EMERGE_SHARE),
    chapters: clamp01((value - EMERGE_SHARE) / (1 - EMERGE_SHARE * 2)),
  };
}

// 章の進み（0〜1）を，固定表示全体のスクロールの進みへ戻す
export function toTrackProgress(chapters: number): number {
  return EMERGE_SHARE + clamp01(chapters) * (1 - EMERGE_SHARE * 2);
}

// ===== 章の進み → 章の状態 =====
export interface AboutState {
  // 0〜count-1 の実数．整数のとき，その章の図形がそろっている
  position: number;
  // いま主役の章
  active: number;
  // 並び替えの元と先の章，その間の進み（0〜1）
  from: number;
  to: number;
  mix: number;
}

function getTimeline(count: number) {
  const total = Math.max(1, Math.floor(count));
  return { total, span: total * HOLD_SHARE + (total - 1) * MOVE_SHARE };
}

export function getAboutState(progress: number, count: number): AboutState {
  const { total, span } = getTimeline(count);
  const cursor = clamp01(progress) * span;
  const step = HOLD_SHARE + MOVE_SHARE;
  const chapter = Math.min(total - 1, Math.floor(cursor / step));
  const local = cursor - chapter * step;
  const moving = chapter < total - 1 && local > HOLD_SHARE;
  const mix = moving ? easeInOutCubic((local - HOLD_SHARE) / MOVE_SHARE) : 0;
  const position = chapter + mix;
  return { position, active: Math.min(total - 1, Math.round(position)), from: chapter, to: Math.min(total - 1, chapter + 1), mix };
}

// その章を読ませる位置（読ませる区間の中央）のスクロールの進み
export function getProgressForChapter(index: number, count: number): number {
  const { total, span } = getTimeline(count);
  const chapter = Math.min(total - 1, Math.max(0, Math.floor(Number.isFinite(index) ? index : 0)));
  return clamp01((chapter * (HOLD_SHARE + MOVE_SHARE) + HOLD_SHARE / 2) / span);
}

// 下の目盛り：その章の区間（読ませる＋次への並び替え）がどこまで進んだか（0〜1）
export function getChapterFill(progress: number, index: number, count: number): number {
  const { total, span } = getTimeline(count);
  const cursor = clamp01(progress) * span;
  const step = HOLD_SHARE + MOVE_SHARE;
  const length = index >= total - 1 ? HOLD_SHARE : step;
  return clamp01((cursor - index * step) / length);
}

// 文章の現れ具合（1 で読める，0 で見えない）と，画面のどちら側にいるか（1 はこれから＝下，-1 は読み終えた＝上）
export function getCopyReveal(position: number, index: number): { reveal: number; side: number } {
  const distance = index - position;
  return { reveal: clamp01(1 - Math.abs(distance) / COPY_FADE_SPAN), side: distance > 0 ? 1 : distance < 0 ? -1 : 0 };
}

// ===== 背景立体と交互スクロールの連動 =====
// 各章の文章（左→右→左→右）と反対側に置く背景立体の水平位置（画面幅に対する割合）
export const CHAPTER_FIGURE_X: readonly number[] = [0.73, 0.27, 0.73, 0.27];
// 各章の中央付近でこの割合だけ立体を静止させ，中間の 52% で反対側へ移動＋変形する
export const ANCHOR_HOLD_EDGE = 0.24;

export interface AnchoredAboutPhase {
  emerge: number;
  state: AboutState;
}

function hasValidAnchors(anchors: readonly number[]): boolean {
  if (anchors.length < 2) return false;
  let previous = 0;
  for (const anchor of anchors) {
    if (!Number.isFinite(anchor) || anchor <= previous || anchor >= 1) return false;
    previous = anchor;
  }
  return true;
}

// 各章の縦スクロール位置（anchors: 0..1）から，惑星⇄立体の出現度と章の変形状態を計算する
export function getAnchoredAboutPhase(progress: number, anchors: readonly number[]): AnchoredAboutPhase {
  const value = clamp01(progress);
  if (!hasValidAnchors(anchors)) {
    const phase = getAboutPhase(value);
    return { emerge: phase.emerge, state: getAboutState(phase.chapters, Math.max(1, anchors.length || 4)) };
  }
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  const entryEnd = Math.max(0.01, Math.min(first * 0.85, 0.16));
  const exitStart = Math.min(0.99, Math.max(last + (1 - last) * 0.18, 0.85));
  const emergeIn = clamp01(value / entryEnd);
  const emergeOut = clamp01((1 - value) / (1 - exitStart));
  const emerge = Math.min(emergeIn, emergeOut);

  let state: AboutState;
  if (value <= first) {
    state = { position: 0, active: 0, from: 0, to: Math.min(1, anchors.length - 1), mix: 0 };
  } else if (value >= last) {
    const end = anchors.length - 1;
    state = { position: end, active: end, from: end, to: end, mix: 0 };
  } else {
    let segment = 0;
    for (let index = 0; index < anchors.length - 1; index += 1) {
      if (anchors[index] <= value && value <= anchors[index + 1]) { segment = index; break; }
    }
    const u = (value - anchors[segment]) / Math.max(1e-6, anchors[segment + 1] - anchors[segment]);
    const mix = u <= ANCHOR_HOLD_EDGE
      ? 0
      : u >= 1 - ANCHOR_HOLD_EDGE
        ? 1
        : easeInOutCubic((u - ANCHOR_HOLD_EDGE) / (1 - ANCHOR_HOLD_EDGE * 2));
    const position = segment + mix;
    state = { position, active: Math.round(position), from: segment, to: segment + 1, mix };
  }
  return { emerge, state };
}

// 背景立体を配置する水平中心位置（0〜1）．変形と同期して左右へ滑らかに移る
export function getFigureCenterX(state: AboutState, positions: readonly number[] = CHAPTER_FIGURE_X): number {
  if (positions.length === 0) return 0.5;
  const maxIndex = positions.length - 1;
  const fromIndex = Math.min(maxIndex, Math.max(0, Math.floor(Number.isFinite(state.from) ? state.from : 0)));
  const toIndex = Math.min(maxIndex, Math.max(0, Math.floor(Number.isFinite(state.to) ? state.to : 0)));
  const fromX = positions[fromIndex];
  const toX = positions[toIndex];
  return fromX + (toX - fromX) * clamp01(state.mix);
}

// 縦スクロールで画面下端から入ってくる各章の出現割合（0〜1）
export function getScrollReveal(top: number, viewportHeight: number): number {
  if (!Number.isFinite(top) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 1;
  return clamp01((viewportHeight * 0.92 - top) / (viewportHeight * 0.36));
}

// ===== 点の位置 =====
// 遅れ（0〜1）のぶんだけ出発を遅らせた，その点の並び替えの進み（0〜1）
export function getPointMix(mix: number, delay: number): number {
  const start = clamp01(delay) * POINT_STAGGER;
  return easeInOutCubic((clamp01(mix) - start) / (1 - POINT_STAGGER));
}

// 元の位置から先の位置へ．途中は，道に対して横へふくらむ（渦を巻いて見える）
export function mixPoint(fromX: number, fromY: number, toX: number, toY: number, amount: number): [number, number] {
  const t = clamp01(amount);
  const bulge = Math.sin(Math.PI * t) * POINT_SWIRL;
  const dx = toX - fromX, dy = toY - fromY;
  return [fromX + dx * t - dy * bulge, fromY + dy * t + dx * bulge];
}

// 並び替えの途中の，点の奥行き（0 で板の上）．行きと帰りで 0 に戻り，途中だけ手前（正）か奥（負）へ浮く
export function getPointLift(amount: number, depth: number): number {
  return Math.sin(Math.PI * clamp01(amount)) * Math.max(-1, Math.min(1, depth)) * POINT_LIFT;
}

// 並び替えの途中で，点が四方へ散るずれ（行きと帰りで 0 に戻る）．向きは点ごとの位相，量は点ごとの大きさ（0〜1）で決まる
export function getPointScatter(amount: number, phase: number, size: number): [number, number] {
  const spread = Math.sin(Math.PI * clamp01(amount)) * POINT_SCATTER * (0.3 + 0.7 * clamp01(size));
  return [Math.cos(phase) * spread, Math.sin(phase) * spread];
}

// ===== 下から崩れて広大な 3D 空間へ拡散し，星雲状に次の立体へ集まる遷移 =====
export const CRUMBLE_WAVE_SPAN = 0.32;
export const CRUMBLE_FALL_DURATION = 0.24;
export const CRUMBLE_REFORM_START = 0.44;

export interface CrumbleWeights {
  from: number;
  sea: number;
  to: number;
}

export interface CloudPosition {
  x: number;
  y: number;
  z: number;
}

const fract = (value: number) => value - Math.floor(value);

// 下側（y が大きい）ほど 0 に近く先に崩れ，上側（y が小さい）ほど 1 に近く最後まで形を保つ遅延を返す
export function getCrumbleDelay(y: number, jitter: number, x = 0): number {
  const safeY = Number.isFinite(y) ? y : 0;
  const safeX = Number.isFinite(x) ? x : 0;
  const safeJitter = clamp01(jitter);
  const heightFromBottom = clamp01((0.78 - safeY) / 1.56);
  const ripple = Math.sin(safeX * 3.6 + safeJitter * 1.4) * 0.04;
  return clamp01(heightFromBottom * 0.85 + safeJitter * 0.12 + ripple + 0.015);
}

// 次の立体へ再集合するときの遅れ（強い有機ばらつき＋わずかに上側先行で星雲のように凝縮する）
export function getReformDelay(y: number, jitter: number, x = 0): number {
  const safeY = Number.isFinite(y) ? y : 0;
  const safeX = Number.isFinite(x) ? x : 0;
  const safeJitter = clamp01(jitter);
  const topFirst = 1 - clamp01((0.78 - safeY) / 1.56);
  return clamp01(topFirst * 0.32 + safeJitter * 0.64 + Math.sin(safeX * 3.0) * 0.02 + 0.02);
}

// mix（0〜1）と元の立体・先の立体の遅れから，元・3D 拡散空間・先の配分重み（合計 1）を計算する
export function getCrumbleWeights(mix: number, fromDelay: number, toDelay: number): CrumbleWeights {
  const t = clamp01(mix);
  if (t <= 0) return { from: 1, sea: 0, to: 0 };
  if (t >= 1) return { from: 0, sea: 0, to: 1 };
  const leaveStart = clamp01(fromDelay) * CRUMBLE_WAVE_SPAN;
  const arriveStart = CRUMBLE_REFORM_START + clamp01(toDelay) * CRUMBLE_WAVE_SPAN;
  const dissolved = easeInOutCubic((t - leaveStart) / CRUMBLE_FALL_DURATION);
  const reformed = easeInOutCubic((t - arriveStart) / CRUMBLE_FALL_DURATION);
  return { from: 1 - dissolved, sea: Math.max(0, dissolved - reformed), to: reformed };
}

// 崩れた粒が画面外へも広がる広大な 3D 雲空間（カメラ空間座標）を返す
export function getCrumbleCloudPoint(
  sourceX: number,
  sourceY: number,
  phase: number,
  size: number,
  depth: number,
  timeSec: number,
  aspectSpan = 2.1,
): CloudPosition {
  const safeSourceX = Number.isFinite(sourceX) ? Math.max(-1.2, Math.min(1.2, sourceX)) : 0;
  const safeSourceY = Number.isFinite(sourceY) ? Math.max(-1.2, Math.min(1.2, sourceY)) : 0;
  const safePhase = Number.isFinite(phase) ? phase : 0;
  const safeSize = clamp01(size);
  const safeTime = Number.isFinite(timeSec) ? timeSec : 0;
  const span = Math.max(1.9, Number.isFinite(aspectSpan) ? aspectSpan : 2.1);

  const rx = fract(Math.sin(safePhase * 12.9898 + safeSize * 78.233) * 43758.5453) * 2 - 1;
  const ry = fract(Math.sin(safePhase * 39.3468 + safeSize * 11.135) * 24634.6345) * 2 - 1;
  const rzUnit = clamp01((Number.isFinite(depth) ? depth : 0) * 0.5 + 0.5);

  const x = rx * (span * 2.05) + safeSourceX * 0.8 + Math.sin(safeTime * 0.32 + safePhase) * 0.14;
  const y = ry * 2.45 + safeSourceY * 0.25 + 0.18 + Math.cos(safeTime * 0.28 + safePhase * 1.3) * 0.12;
  const z = -3.8 + (rzUnit ** 0.95) * 7.2;
  return { x, y, z };
}

// 正四面体の 4 つの頂点（中心が原点，頂点までの距離が 1）と，6 本の辺（頂点の番号の組）
const TETRA_UNIT = 1 / Math.sqrt(3);
export const TETRA_VERTICES: ReadonlyArray<readonly [number, number, number]> = [
  [TETRA_UNIT, TETRA_UNIT, TETRA_UNIT],
  [TETRA_UNIT, -TETRA_UNIT, -TETRA_UNIT],
  [-TETRA_UNIT, TETRA_UNIT, -TETRA_UNIT],
  [-TETRA_UNIT, -TETRA_UNIT, TETRA_UNIT],
];
export const TETRA_EDGES: ReadonlyArray<readonly [number, number]> = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];

// 正四面体を，縦の軸まわりに spin，横の軸まわりに pitch だけ回したときの，4 つの頂点の画面上の位置（x, y を交互に 8 個．out へ書く）
export function projectTetra(spin: number, pitch: number, out: number[]): number[] {
  const cosSpin = Math.cos(spin), sinSpin = Math.sin(spin), cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  for (let index = 0; index < TETRA_VERTICES.length; index += 1) {
    const [x, y, z] = TETRA_VERTICES[index];
    const turnedZ = z * cosSpin - x * sinSpin;
    out[index * 2] = x * cosSpin + z * sinSpin;
    out[index * 2 + 1] = y * cosPitch - turnedZ * sinPitch;
  }
  return out;
}

// ===== マウスによる 3D カメラ視点と背景三角の奥行きパララックス =====
export const CAMERA_MOUSE_YAW = 0.16;
export const CAMERA_MOUSE_PITCH = 0.11;
export const CAMERA_MOUSE_PAN_X = 0.032;
export const CAMERA_MOUSE_PAN_Y = 0.028;
export const DUST_PARALLAX_X = 0.095;
export const DUST_PARALLAX_Y = 0.098;

export interface CameraParallax {
  yaw: number;
  pitch: number;
  panX: number;
  panY: number;
}

const clampSigned = (value: number) => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));

// 画面中央基準の正規化ポインタ位置（nx, ny: -1〜+1）から，3D 視点の回転角と画面割合の視差シフトを返す
export function getCameraParallax(nx: number, ny: number): CameraParallax {
  const sx = clampSigned(nx);
  const sy = clampSigned(ny);
  return {
    yaw: -sx * CAMERA_MOUSE_YAW,
    pitch: sy * CAMERA_MOUSE_PITCH,
    panX: -sx * CAMERA_MOUSE_PAN_X,
    panY: -sy * CAMERA_MOUSE_PAN_Y,
  };
}

// 背景三角（depth: 0=遠景〜1=近景）の視差オフセット（画面幅・高さに対する割合）を返す
export function getDustParallax(nx: number, ny: number, depth: number): { x: number; y: number } {
  const sx = clampSigned(nx);
  const sy = clampSigned(ny);
  const factor = 0.12 + (clamp01(depth) ** 1.65) * 1.15;
  return {
    x: -sx * DUST_PARALLAX_X * factor,
    y: -sy * DUST_PARALLAX_Y * factor,
  };
}

// 図形の板を左右（tiltY）・上下（tiltX）へ回した 3 次元座標（z は奥行きで正が手前）
export function rotatePoint(x: number, y: number, z: number, tiltX: number, tiltY: number): { x: number; y: number; z: number } {
  const turnedX = x * Math.cos(tiltY) + z * Math.sin(tiltY);
  const turnedZ = z * Math.cos(tiltY) - x * Math.sin(tiltY);
  const turnedY = y * Math.cos(tiltX) - turnedZ * Math.sin(tiltX);
  const depth = y * Math.sin(tiltX) + turnedZ * Math.cos(tiltX);
  return { x: turnedX, y: turnedY, z: depth };
}

// 図形の板を左右（tiltY）・上下（tiltX）へ回したときの，画面上の位置・大きさの倍率・奥行き（正が手前）
export function projectPoint(x: number, y: number, z: number, tiltX: number, tiltY: number): { x: number; y: number; scale: number; depth: number } {
  const rotated = rotatePoint(x, y, z, tiltX, tiltY);
  // 視点より手前へ出た点が裏返らないよう，距離の下限を置く
  const scale = CAMERA_DISTANCE / Math.max(CAMERA_DISTANCE * 0.25, CAMERA_DISTANCE - rotated.z);
  return { x: rotated.x * scale, y: rotated.y * scale, scale, depth: rotated.z };
}
