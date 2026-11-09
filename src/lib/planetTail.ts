// 自己紹介のあと，ページの最後まで惑星を残すための計算（描画や DOM は PlanetTail.tsx が受け持つ）．
// 自己紹介の固定表示が終わると，惑星は画面の隅（ドック）へ移って回り続け，
// ページの最後で，フッターの大きな名前が現れる場所（何もない場所）の中央へ移って大きくなり，バラバラにほどけて，文字になる．
export interface PlanetFrame {
  left: number;
  top: number;
  size: number;
}

// ドックの大きさ（px）と，画面の左下の端からの余白
export const DOCK_SIZE = 88;
export const DOCK_SIZE_SMALL = 68;
export const DOCK_MARGIN = 20;
// 幅がこれ未満の画面では，小さいドックを使う
export const DOCK_SMALL_BREAKPOINT = 760;
// 自己紹介を抜けてから，惑星がドックへ着くまでのスクロール量（画面の高さに対する割合）
export const DOCK_FLIGHT_RATIO = 0.8;
// 名前の場所へ向かい始めるときの，その場所の上端の位置（画面の高さに対する割合．この値より下にあるあいだは動かない）
export const SPOT_APPEAR_RATIO = 0.92;
// 名前の場所へ向かう（惑星が移り，大きくなり，ほどけて文字になる）スクロール量の下限（画面の高さに対する割合）．
// フッターが見え始める前から動き出し，ページの最後まで，同時に進む
export const SPOT_MIN_FLIGHT_RATIO = 0.9;
// 惑星の球の直径が，名前の高さのどれだけか．ほぼ名前の高さいっぱいまで，大きくなる
export const NAME_PLANET_RATIO = 1.05;
// 名前の場所に着いたとみなす進み具合
export const SPOT_ARRIVED = 0.92;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const mixFrame = (from: PlanetFrame, to: PlanetFrame, amount: number): PlanetFrame => ({
  left: mix(from.left, to.left, amount),
  top: mix(from.top, to.top, amount),
  size: mix(from.size, to.size, amount),
});

// ドックの枠（ビューポートの座標）．画面の左下に置く
export function getDockFrame(viewportWidth: number, viewportHeight: number): PlanetFrame {
  const size = viewportWidth < DOCK_SMALL_BREAKPOINT ? DOCK_SIZE_SMALL : DOCK_SIZE;
  return { left: DOCK_MARGIN, top: viewportHeight - DOCK_MARGIN - size, size };
}

// 名前の場所へ向かい始めるスクロール位置と，着くスクロール位置．
// spotTop は，その枠の上端のページ上の位置（スクロール量を含む絶対座標）
export function getSpotScrollRange(spotTop: number, viewportHeight: number, maxScroll: number) {
  const end = Math.max(0, maxScroll);
  const start = Math.min(spotTop - viewportHeight * SPOT_APPEAR_RATIO, end - viewportHeight * SPOT_MIN_FLIGHT_RATIO);
  return { start, end };
}

export interface TailInput {
  scrollY: number;
  // 自己紹介の固定表示が終わるスクロール位置と，そのときの惑星の枠（ビューポートの座標）
  endScroll: number;
  held: PlanetFrame;
  viewportWidth: number;
  viewportHeight: number;
  // 名前の場所（中央．大きくなったときの惑星の枠．いまのビューポートの座標）．フッターが無ければ null
  spot: PlanetFrame | null;
  spotStart: number;
  spotEnd: number;
}

export interface TailState {
  frame: PlanetFrame;
  // 名前の場所へ向かう進み具合（0〜1）．惑星は，移りながら，大きくなりながら，同時にほどけて文字になる
  arrival: number;
  // 名前の場所に着いたか
  arrived: boolean;
}

// 自己紹介を抜けたあとの惑星の状態：カードの場所からドックへ → ページの最後で名前の場所へ（大きくなる）
export function getTailState(input: TailInput): TailState {
  const leave = smoothstep(clamp((input.scrollY - input.endScroll) / Math.max(1, input.viewportHeight * DOCK_FLIGHT_RATIO)));
  const dock = getDockFrame(input.viewportWidth, input.viewportHeight);
  let frame = mixFrame(input.held, dock, leave);
  let arrival = 0;
  if (input.spot) {
    arrival = clamp((input.scrollY - input.spotStart) / Math.max(1, input.spotEnd - input.spotStart));
    frame = mixFrame(frame, input.spot, smoothstep(arrival));
  }
  return { frame, arrival, arrived: arrival >= SPOT_ARRIVED };
}

// ===== 惑星がほどけて，名前の文字になる =====
// 名前の場所へ向かう進み具合（arrival）と同時に進む．惑星は，ドックから名前の場所へ移りながら，大きくなりながら，
// 同時にバラバラにほどけ，その点が名前の文字になっていく（0 = 惑星のまま，1 = 文字になった）．スクロールを戻せば，そのまま逆向きに進む
// 惑星の絵（暗い球の本体）が薄れていく範囲（進み具合の 0 からここまで）
export const MERGE_PLANET_FADE = 0.3;

export function getMergeLook(merge: number) {
  const fade = smoothstep(clamp(merge / MERGE_PLANET_FADE));
  return {
    // 惑星の絵の濃さ
    planetOpacity: 1 - fade,
    // 文字になり終えるまでは，惑星は回り続ける（点の流れ出す位置が，回っている惑星の点と重なる）
    rotating: merge < 1,
    // 名前の粒子を隠しているか（惑星が文字になり終えるまでは，粒子は惑星から出てくる点だけ）
    nameHidden: merge < 1,
  };
}
