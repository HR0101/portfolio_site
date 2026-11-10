// 流体の動きに合わせて，ページそのものを歪ませる層．React には依存しない．
// Lusion の「screen paint」は，描き終えた画面を速度の向きにずらして混ぜ，色ごとに少しずらして虹色の縁を作る．
// DOM は WebGL に取り込めないので，Chromium の backdrop-filter: url(#…) と SVG の feDisplacementMap で同じことをする．
//   ・流体エンジンが作る小さな「ずらしの地図」（R・G がずらす向き）を，毎コマ feImage に差し替える
//   ・赤・緑・青を別々の強さでずらして重ね，色ずれ（RGB シフト）を作る
// 対応していないブラウザ（Safari・Firefox）では何もせず null を返す．既存の要素には触らず，body に 2 つの要素を足すだけ．
import type { FluidDisplacementMap } from './fluidEngine';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FILTER_ID = 'fluid-distortion-filter';
// 速度が最大のときにずらす距離（px）
const DISTORTION_SCALE_PX = 72;
// 赤と青の，ずらす距離の差の割合（大きいほど色ずれが強い）
const RGB_SHIFT = 0.1;
// ずらしの地図をぼかす大きさ（px）
const MAP_BLUR_PX = 8;
// 本文（main．10）より上，流体の canvas（20）より下
const DISTORTION_Z_INDEX = 19;

export interface FluidDistortion {
  // 最新の地図に差し替えて，歪みを見せる
  update: (map: FluidDisplacementMap) => void;
  // 歪みを止める（眠るとき）
  hide: () => void;
  dispose: () => void;
}

// backdrop-filter に SVG フィルターを渡せるのは Chromium だけ（Safari は url() を無視し，Firefox は backdrop-filter の url() を描かない）
export function isFluidDistortionSupported(): boolean {
  if (typeof window === 'undefined' || typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  if (!CSS.supports('backdrop-filter', `url(#${FILTER_ID})`)) return false;
  return /(Chrome|Chromium|CriOS|Edg)\//.test(navigator.userAgent);
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

// 1 つの色の成分だけを取り出す行列（各行は「R G B A 定数」．アルファは 1 のまま）
const CHANNEL_MATRIX = {
  r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
} as const;

export function createFluidDistortion(): FluidDistortion | null {
  if (!isFluidDistortionSupported()) return null;
  try {
    return buildDistortion();
  } catch {
    return null;
  }
}

function buildDistortion(): FluidDistortion | null {
  const mapCanvas = document.createElement('canvas');
  const mapContext = mapCanvas.getContext('2d');
  if (!mapContext) return null;

  // SVG：地図 → 赤・緑・青を別々にずらす → 重ねる
  const svg = createSvgElement('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
  svg.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;';
  const filter = createSvgElement('filter', {
    id: FILTER_ID,
    x: '0',
    y: '0',
    width: '1',
    height: '1',
    'color-interpolation-filters': 'sRGB',
  });
  const neutral = createSvgElement('feFlood', { 'flood-color': 'rgb(128,128,128)', 'flood-opacity': '1', result: 'neutral' });
  const image = createSvgElement('feImage', {
    x: '0',
    y: '0',
    width: String(window.innerWidth),
    height: String(window.innerHeight),
    preserveAspectRatio: 'none',
    result: 'image',
  });
  // 地図の読み込みが間に合わなくても，ずらさない灰色の上に載せるので，画面が跳ねない
  const merge = createSvgElement('feMerge', { result: 'merged' });
  merge.append(createSvgElement('feMergeNode', { in: 'neutral' }), createSvgElement('feMergeNode', { in: 'image' }));
  // 地図を少しぼかして，ずらしの境目で文字が千切れないようにする
  const soften = createSvgElement('feGaussianBlur', { in: 'merged', stdDeviation: String(MAP_BLUR_PX), result: 'map' });
  filter.append(neutral, image, merge, soften);

  const channels = [
    { channel: 'r' as const, scale: DISTORTION_SCALE_PX * (1 + RGB_SHIFT) },
    { channel: 'g' as const, scale: DISTORTION_SCALE_PX },
    { channel: 'b' as const, scale: DISTORTION_SCALE_PX * (1 - RGB_SHIFT) },
  ];
  channels.forEach(({ channel, scale }) => {
    filter.append(
      createSvgElement('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'map',
        scale: String(scale),
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: `shifted-${channel}`,
      }),
      createSvgElement('feColorMatrix', {
        in: `shifted-${channel}`,
        type: 'matrix',
        values: CHANNEL_MATRIX[channel],
        result: `only-${channel}`,
      }),
    );
  });
  filter.append(
    createSvgElement('feBlend', { in: 'only-r', in2: 'only-g', mode: 'screen', result: 'rg' }),
    createSvgElement('feBlend', { in: 'rg', in2: 'only-b', mode: 'screen' }),
  );
  svg.append(filter);

  // 画面いっぱいの，操作を通す層．この背後にあるものが，フィルターを通して見える
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.fluidDistortion = '';
  layer.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    `z-index:${DISTORTION_Z_INDEX}`,
    'visibility:hidden',
    `backdrop-filter:url(#${FILTER_ID})`,
  ].join(';');

  document.body.append(svg, layer);

  let isShown = false;
  const setShown = (next: boolean) => {
    if (isShown === next) return;
    isShown = next;
    layer.style.visibility = next ? 'visible' : 'hidden';
  };

  const handleResize = () => {
    image.setAttribute('width', String(window.innerWidth));
    image.setAttribute('height', String(window.innerHeight));
  };
  window.addEventListener('resize', handleResize, { passive: true });

  return {
    update: (map) => {
      if (mapCanvas.width !== map.width || mapCanvas.height !== map.height) {
        mapCanvas.width = map.width;
        mapCanvas.height = map.height;
      }
      const pixels = new Uint8ClampedArray(map.data.length);
      pixels.set(map.data);
      mapContext.putImageData(new ImageData(pixels, map.width, map.height), 0, 0);
      image.setAttribute('href', mapCanvas.toDataURL('image/png'));
      setShown(true);
    },
    hide: () => setShown(false),
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      layer.remove();
      svg.remove();
    },
  };
}
