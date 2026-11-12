"use client";

import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  EXPLODED_BACK_LAYER,
  EXPLODED_LAYER_COUNT,
  EXPLODED_POINTER_RESPONSE_SEC,
  EXPLODED_RESPONSE_SEC,
  EXPLODED_SCREEN_LAYER,
  getCalloutPlacements,
  getExplodedPose,
  type CalloutRect,
} from '../../../lib/animations/exploded';
import { useSpringGroup, type SpringChannels, type SpringValues } from '../shared/useSpringValue';
import styles from './ExplodedView.module.css';

// 分解ビュー：実画面を，Z 方向の 4 層へ離して見せる．
// 層 0＝背面の板／層 1＝実画面（children）／層 2＝見どころの領域の枠と番号／層 3＝8px 格子と，領域ラベルの引き出し線．
// 状態は目標値（exploded）だけで，進みは臨界減衰のばね（応答 0.4 秒）で動かす．途中で押し直すと，いまの値と速度から逆向きに進む．
// 層 2・3 は aria-hidden（同じ内容は，見どころのボタンと注釈が持っている）．

type ExplodedChannel = 'progress' | 'pointerX' | 'pointerY';

const EXPLODED_CHANNELS: SpringChannels<ExplodedChannel> = {
  progress: { response: EXPLODED_RESPONSE_SEC },
  pointerX: { response: EXPLODED_POINTER_RESPONSE_SEC },
  pointerY: { response: EXPLODED_POINTER_RESPONSE_SEC },
};

// 同じ奥行きの層が重なって，描画順が揺れないよう，層ごとに足すごく小さな奥行き（px）
const LAYER_DEPTH_BIAS_PX = 0.05;
// 影は背面の板のすぐ手前に置く（px）
const SHADOW_DEPTH_OFFSET_PX = 0.2;
// 分解が始まったとみなす進み（この値を超えると，実画面の影を，ぼかした別要素へ入れ替える）
const ACTIVE_PROGRESS = 0.001;
// 鏡面反射を見せ始める「操作の強さ」の倍率（分解の進み，またはカーソルの傾きがこの 1/4 に達すると全開）
const ENGAGE_GAIN = 4;

export interface ExplodedArea {
  id: string;
  label: string;
  // 画像に対する 0〜1 の割合
  region: CalloutRect;
  markerPosition?: { x: number; y: number };
}

export interface ExplodedViewHandle {
  // アニメーションなしで，重なった状態へ戻す（紹介ページへの移動の直前など）
  snapToRest: () => void;
}

interface ExplodedViewProps {
  id: string;
  // 目標（true で分解する）
  exploded: boolean;
  // true なら 3D を使わず，層 2・3 を 160ms の不透明度で重ねて出す（動きを減らす設定・キーボード操作）
  flat: boolean;
  // 実画面の画像の位置と大きさ，それを入れる枠の大きさ（px．枠の左上が原点）
  image: CalloutRect;
  frame: CalloutRect;
  areas: readonly ExplodedArea[];
  // 領域の番号の字（見どころのボタンと同じもの）
  numbers: readonly string[];
  // 実画面の角丸（px）
  shotRadius: number;
  // 層 1：既存の実画面
  children: ReactNode;
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

// サーバーでは useLayoutEffect が警告を出すので，その場合は useEffect に切り替える
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const ExplodedView = forwardRef<ExplodedViewHandle, ExplodedViewProps>(function ExplodedView(
  { id, exploded, flat, image, frame, areas, numbers, shotRadius, children },
  ref,
) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadowRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(frame.w);
  const flatRef = useRef(flat);

  // 毎フレーム呼ばれる．React の state は使わず，transform と opacity だけを直接書く
  const onFrame = useCallback((values: SpringValues<ExplodedChannel>, moving: boolean) => {
    const stage = stageRef.current;
    const rig = rigRef.current;
    if (!stage || !rig || flatRef.current) return;
    const progress = values.progress.value;
    const pointerX = values.pointerX.value;
    const pointerY = values.pointerY.value;
    const pose = getExplodedPose({ progress, pointerX, pointerY, width: widthRef.current, layerCount: EXPLODED_LAYER_COUNT });
    // 完全に止まって重なっているときは，transform を外す（3D の合成を持ち越さない）
    const atRest = progress === 0 && pointerX === 0 && pointerY === 0;
    rig.style.transform = atRest ? '' : `rotateY(${pose.rotY.toFixed(3)}deg) rotateX(${pose.rotX.toFixed(3)}deg) scale(${pose.scale.toFixed(4)})`;
    pose.layers.forEach((layer, index) => {
      const node = layerRefs.current[index];
      if (!node) return;
      node.style.transform = atRest ? '' : `translateZ(${(layer.z + index * LAYER_DEPTH_BIAS_PX).toFixed(2)}px)`;
      // 実画面の層は常に見える．板・枠・格子は，現れる前は不透明度 0 で隠す
      if (index !== EXPLODED_SCREEN_LAYER) {
        node.style.opacity = layer.opacity.toFixed(3);
        node.style.visibility = layer.opacity > 0 ? 'visible' : 'hidden';
      }
    });
    const shadow = shadowRef.current;
    if (shadow) {
      const backZ = pose.layers[EXPLODED_BACK_LAYER]?.z ?? 0;
      shadow.style.transform = atRest ? '' : `translate3d(${pose.shadow.x.toFixed(2)}px, ${pose.shadow.y.toFixed(2)}px, ${(backZ + SHADOW_DEPTH_OFFSET_PX).toFixed(2)}px)`;
      shadow.style.opacity = pose.shadow.opacity.toFixed(3);
    }
    const glare = glareRef.current;
    if (glare) {
      // 何も触っていないとき（重なっていて，カーソルも外にあるとき）は見せない．
      const engagement = clamp(Math.max(progress, Math.hypot(pointerX, pointerY)) * ENGAGE_GAIN, 0, 1);
      glare.style.opacity = (pose.glare * engagement).toFixed(3);
    }
    const active = progress > ACTIVE_PROGRESS ? 'true' : 'false';
    if (stage.dataset.active !== active) stage.dataset.active = active;
    const movingState = moving ? 'true' : 'false';
    if (stage.dataset.moving !== movingState) stage.dataset.moving = movingState;
  }, []);

  const group = useSpringGroup(EXPLODED_CHANNELS, onFrame);

  // 3D を使わないとき：書き込んだ姿勢を取り除き，CSS の不透明度の切り替えに任せる
  const clearPose = useCallback(() => {
    rigRef.current?.style.removeProperty('transform');
    [...layerRefs.current, shadowRef.current].forEach(node => {
      if (!node) return;
      for (const property of ['transform', 'opacity', 'visibility']) node.style.removeProperty(property);
    });
    glareRef.current?.style.removeProperty('opacity');
    const stage = stageRef.current;
    if (stage) {
      delete stage.dataset.active;
      delete stage.dataset.moving;
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    flatRef.current = flat;
    if (flat) {
      group.jump({ progress: 0, pointerX: 0, pointerY: 0 });
      clearPose();
    } else {
      group.refresh();
    }
  }, [flat, group, clearPose]);

  // 画面の幅が変わると層の間隔も変わる
  useIsomorphicLayoutEffect(() => {
    widthRef.current = frame.w;
    group.refresh();
  }, [frame.w, group]);

  useEffect(() => {
    if (!flat) group.setTarget('progress', exploded ? 1 : 0);
  }, [exploded, flat, group]);

  useImperativeHandle(ref, () => ({
    snapToRest() {
      group.jump({ progress: 0, pointerX: 0, pointerY: 0 });
    },
  }), [group]);

  // カーソルに追う傾き（マウスだけ．タッチ・ペンは追わない）
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (flat || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    group.setTargets({
      pointerX: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      pointerY: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    });
  };
  const onPointerLeave = () => group.setTargets({ pointerX: 0, pointerY: 0 });

  const placements = useMemo(
    () => getCalloutPlacements(image, frame, areas.map(area => ({ id: area.id, region: area.region }))),
    [image, frame, areas],
  );
  const imageStyle: CSSProperties = { left: image.x, top: image.y, width: image.w, height: image.h };

  return (
    <div
      id={id}
      ref={stageRef}
      className={styles.stage}
      data-exploded-stage=""
      data-mode={flat ? 'flat' : 'spatial'}
      data-target={exploded}
      style={{ '--exploded-shot-radius': `${shotRadius}px` } as CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div ref={rigRef} className={styles.rig}>
        {/* 層 0：背面の板（面の色と細い線） */}
        <div ref={node => { layerRefs.current[0] = node; }} className={`${styles.layer} ${styles.plate}`} aria-hidden="true" />
        {/* 実画面の影：ぼかし済みの別要素を，transform と opacity だけで動かす（box-shadow は動かさない） */}
        <div ref={shadowRef} className={styles.shadow} aria-hidden="true" style={{ ...imageStyle, borderRadius: shotRadius }} />
        {/* 層 1：既存の実画面．鏡面反射は，その上の画像の範囲だけに重ねる */}
        <div ref={node => { layerRefs.current[1] = node; }} className={`${styles.layer} ${styles.screen}`}>
          {children}
          <div ref={glareRef} className={styles.glare} aria-hidden="true" style={{ ...imageStyle, borderRadius: shotRadius }} />
        </div>
        {/* 層 2：見どころの領域の枠と番号 */}
        <div ref={node => { layerRefs.current[2] = node; }} className={`${styles.layer} ${styles.frames}`} aria-hidden="true">
          {areas.map((area, position) => (
            <Fragment key={area.id}>
              <span
                className={styles.frame}
                style={{
                  left: image.x + image.w * area.region.x,
                  top: image.y + image.h * area.region.y,
                  width: image.w * area.region.w,
                  height: image.h * area.region.h,
                }}
              />
              <span
                className={styles.badge}
                style={{
                  left: image.x + image.w * (area.markerPosition?.x ?? area.region.x),
                  top: image.y + image.h * (area.markerPosition?.y ?? area.region.y),
                }}
              >
                <span>{numbers[position]}</span>
              </span>
            </Fragment>
          ))}
        </div>
        {/* 層 3：8px 格子と，領域ラベルの引き出し線 */}
        <div ref={node => { layerRefs.current[3] = node; }} className={`${styles.layer} ${styles.guides}`} aria-hidden="true">
          <span className={styles.grid} style={imageStyle} />
          <svg className={styles.leaders} width={frame.w} height={frame.h} viewBox={`0 0 ${frame.w} ${frame.h}`} focusable="false">
            {placements.map(placement => (
              <g key={placement.id}>
                <line x1={placement.anchorX} y1={placement.anchorY} x2={placement.tipX} y2={placement.tipY} />
                <circle cx={placement.anchorX} cy={placement.anchorY} r={2.5} />
              </g>
            ))}
          </svg>
          {placements.map(placement => (
            <span
              key={placement.id}
              className={styles.chip}
              style={{ left: placement.chipX, top: placement.chipY, width: placement.chipWidth, height: placement.chipHeight }}
            >
              <span>{areas.find(area => area.id === placement.id)?.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
