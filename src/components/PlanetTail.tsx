"use client";

import { useEffect, useRef } from 'react';
import { subscribeToScroll } from '../lib/scrollObserver';
import { getAboutPlanetTarget, getSharedPlanet } from '../lib/sharedPlanet';
import { getMergeLook, getSpotScrollRange, getTailState, NAME_PLANET_RATIO, type PlanetFrame } from '../lib/planetTail';
import { WORDMARK_MERGE_EVENT, type WordmarkMergeDetail } from '../lib/particleWordmarkCanvas';

// 惑星から文字が現れるまで，フッターの名前（粒子）を隠しているあいだ，名前に付ける印（particleWordmarkCanvas.ts が見る）
const FORMING_ATTRIBUTE = 'data-wordmark-forming';
// 名前の粒子を描き直させる合図（particleWordmarkCanvas.ts が受け取る）
const WORDMARK_REDRAW_EVENT = 'wordmark-redraw';
// 惑星の球の半径（描画の一辺に対する割合．lib/planetPoints.ts の投影と同じ）
const PLANET_RADIUS_RATIO = 0.43;
// 点を描く重ね canvas の細かさの上限（高密度の画面でも描画が重くならないように）
const PIXEL_RATIO_CAP = 2;

// 自己紹介のあと，ページの最後まで惑星を残す．
// 自己紹介の固定表示が終わると，惑星は画面の左下（ドック）へ移って回り続け，ページの最後が近づくと，
// フッターの大きな名前が現れる場所（まだ何もない）へ向かう．**向かいながら，大きくなりながら，同時にバラバラにほどけ，
// その点が名前の文字になっていく**（すべて，スクロールの進み具合と同時に進む．戻せば，そのまま逆に進む）．
// 画面に何も出さない（点を描く重ね canvas だけを持つ）．小画面・動きを減らす設定（自己紹介が固定表示でないとき）は，何もしない．
// 名前が粒子で描かれていないとき（タッチ・狭い画面など）は，惑星はほどけず，名前は今までどおりに現れる
export function PlanetTail() {
  const overlay = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // 名前を隠しているか
    let forming = false;
    // 惑星がほどけて文字になる進み具合：0 = 惑星のまま，1 = 文字になり終えた（スクロールの進み具合そのもの）
    let merge = 0;
    let dispatchedMerge = 0;
    let loop = 0;
    // いまの惑星の枠
    let lastFrame: PlanetFrame | null = null;

    const getWordmark = () => document.querySelector<HTMLElement>('.footer-wordmark');
    // 名前が粒子で描かれているときだけ，惑星は名前の場所へ行って文字になる
    const particlesReady = () => getWordmark()?.hasAttribute('data-particle-ready') ?? false;

    const sizeOverlay = () => {
      const canvas = overlay.current;
      if (!canvas) return;
      const ratio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP);
      canvas.width = Math.max(1, Math.round(window.innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(window.innerHeight * ratio));
    };

    const setForming = (next: boolean) => {
      if (forming === next) return;
      forming = next;
      const wordmark = getWordmark();
      if (!wordmark) return;
      wordmark.toggleAttribute(FORMING_ATTRIBUTE, next);
      wordmark.dispatchEvent(new Event(WORDMARK_REDRAW_EVENT));
    };

    // 進み具合を，惑星の絵・名前の粒子の表示・点の描画へ反映する
    const applyMerge = () => {
      const planet = getSharedPlanet();
      const wordmark = getWordmark();
      if (!planet || !wordmark) return;
      const look = getMergeLook(merge);
      planet.setOpacity(look.planetOpacity);
      planet.setAutoRotate(look.rotating);
      setForming(particlesReady() && look.nameHidden);
      // ほどけている間は毎回，終えた・戻り終えたときは変わった 1 回だけ，名前の粒子へ知らせる
      const inProgress = merge > 0 && merge < 1;
      if (lastFrame && (inProgress || merge !== dispatchedMerge)) {
        const detail: WordmarkMergeDetail = { progress: merge, frame: lastFrame, view: planet.getView(), overlay: overlay.current };
        wordmark.dispatchEvent(new CustomEvent(WORDMARK_MERGE_EVENT, { detail }));
      }
      dispatchedMerge = merge;
    };
    // スクロールが止まっていても，惑星は回り続けるので，ほどけている間は毎フレーム描き直す
    const tick = () => {
      loop = 0;
      applyMerge();
      if (merge > 0 && merge < 1) loop = requestAnimationFrame(tick);
    };
    const ensureLoop = () => {
      if (!loop && merge > 0 && merge < 1) loop = requestAnimationFrame(tick);
    };

    // 名前の場所（文字が現れる場所の中央）に置く，大きくなった惑星の枠（いまのビューポートの座標）．
    // 球の直径が名前の高さのほぼいっぱいになる大きさにする
    const measureSpot = (): PlanetFrame | null => {
      const text = document.querySelector<HTMLElement>('.footer-wordmark-text');
      if (!text || !particlesReady()) return null;
      const box = text.getBoundingClientRect();
      const diameter = Math.min(box.height * NAME_PLANET_RATIO, box.width * 0.5);
      const size = diameter / (PLANET_RADIUS_RATIO * 2);
      return { left: box.left + box.width / 2 - size / 2, top: box.top + box.height / 2 - size / 2, size };
    };

    const update = () => {
      const planet = getSharedPlanet();
      const target = getAboutPlanetTarget();
      if (reduced.matches || !planet || !target || window.scrollY < target.endScroll) {
        // 自己紹介の中（以前）へ戻ったら，名前も元に戻す
        const wasMerged = merge > 0 || dispatchedMerge > 0;
        merge = 0;
        if (planet && wasMerged) { planet.setOpacity(1); planet.setAutoRotate(true); }
        if (wasMerged) applyMerge();
        dispatchedMerge = 0;
        setForming(false);
        return;
      }
      const spot = measureSpot();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const range = spot ? getSpotScrollRange(window.scrollY + spot.top, window.innerHeight, maxScroll) : { start: 0, end: 1 };
      const state = getTailState({
        scrollY: window.scrollY,
        endScroll: target.endScroll,
        held: { left: target.finalLeft, top: target.finalTop, size: target.size },
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        spot,
        spotStart: range.start,
        spotEnd: range.end,
      });
      planet.setDetail(0);
      planet.setHeroVisibility(0);
      // 暗い球の本体と白い点のまま（自己紹介のカードの中と同じ見え方で，最後まで変えない）
      planet.setTone(0);
      planet.setFrame(state.frame);
      lastFrame = state.frame;
      // 名前の場所へ向かう進み具合と同時に，惑星がほどけて文字になる．粒子で描かれていないときは，ほどけない
      merge = spot ? state.arrival : 0;
      applyMerge();
      ensureLoop();
    };

    sizeOverlay();
    const onResize = () => { sizeOverlay(); update(); };
    window.addEventListener('resize', onResize);
    const unsubscribe = subscribeToScroll(update);
    const resize = new ResizeObserver(update);
    resize.observe(document.body);
    reduced.addEventListener('change', update);
    // 名前の粒子の準備が整った（または外れた）ときも，名前を隠すか・惑星を動かすかを決め直す（スクロールが止まっていても）
    const readiness = new MutationObserver(update);
    const wordmark = getWordmark();
    if (wordmark) readiness.observe(wordmark, { attributes: true, attributeFilter: ['data-particle-ready'] });
    update();
    return () => {
      window.removeEventListener('resize', onResize);
      unsubscribe(); resize.disconnect(); readiness.disconnect(); reduced.removeEventListener('change', update);
      cancelAnimationFrame(loop);
      setForming(false);
    };
  }, []);

  // 惑星がほどけた点を描く，画面いっぱいの重ね canvas（惑星と同じく，ページの内容の上）
  return <canvas ref={overlay} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }} />;
}
