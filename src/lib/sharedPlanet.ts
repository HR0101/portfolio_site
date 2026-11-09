// ProductShowcase が持つ点描の惑星（DotPlanet）を，ほかのセクションと共有するための小さな置き場．
// 惑星の canvas は 1 つだけで，Hero → アプリ紹介 → 自己紹介と，同じ要素がずっと移動していく．
// 自己紹介（About）は，惑星の着地点と，いつから惑星を預かるか（owns）を，ここを通して ProductShowcase へ伝える．
import type { DotPlanetHandle } from '../components/DotPlanet';

// 自己紹介の最初のカードの角（惑星の着地点．ビューポートの座標）
export interface AboutPlanetTarget {
  left: number;
  top: number;
  size: number;
  // 自己紹介の固定表示が始まるスクロール位置（px）．アプリ紹介を抜けてここまでの間に，惑星が着地点へ飛ぶ
  startScroll: number;
  // 自己紹介の固定表示が始まっているか．始まっていれば，惑星の位置は自己紹介（と，その後は PlanetTail）が決める
  owns: boolean;
  // 自己紹介の固定表示が終わるスクロール位置（px）．これより先は，惑星をページの最後まで残す PlanetTail が預かる
  endScroll: number;
  // 固定表示が終わるときの，惑星の枠（最後のカードの右下の角．ビューポートの座標．スクロールしても同じ値）
  finalLeft: number;
  finalTop: number;
}

let planet: DotPlanetHandle | null = null;
let provider: (() => AboutPlanetTarget | null) | null = null;

export function registerSharedPlanet(handle: DotPlanetHandle | null) {
  planet = handle;
}

export function getSharedPlanet() {
  return planet;
}

// 自己紹介が固定表示のとき（小画面・動きを減らす設定では null）に，着地点を返す関数を登録する
export function setAboutPlanetProvider(next: (() => AboutPlanetTarget | null) | null) {
  provider = next;
}

export function getAboutPlanetTarget(): AboutPlanetTarget | null {
  return provider ? provider() : null;
}
