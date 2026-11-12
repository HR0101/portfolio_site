"use client";

import { useEffect, useLayoutEffect, useState } from 'react';
import {
  isSpringAtRest,
  springFromResponse,
  stepSpring,
  type SpringConfig,
  type SpringRestThresholds,
  type SpringState,
} from '../../../lib/animations/spring';

// ばねで動く値（複数）を，1 本の requestAnimationFrame で進めるフック．
// 動いている間だけフレームを回し，止まったら rAF を止める．React の state は更新せず，
// 各フレームの値は onFrame へ渡すので，呼び出し側は DOM（transform や opacity）へ直接書き込む．

// 1 フレームで進める時間の上限（秒）．タブを離れて戻ったときなど，止まっていた時間を一気に消化しない
const MAX_FRAME_SEC = 0.05;
// 最初のフレームで仮定する間隔（秒）
const FIRST_FRAME_SEC = 1 / 60;

export interface SpringChannelOptions {
  // 応答時間（秒）
  response: number;
  // 減衰比（既定は 1 = 臨界減衰）
  dampingRatio?: number;
  // 止まったとみなすしきい値（既定は目標との差 0.001・速さ 0.01）
  rest?: SpringRestThresholds;
}

export type SpringChannels<K extends string> = Record<K, SpringChannelOptions>;
export type SpringValues<K extends string> = Readonly<Record<K, SpringState>>;
export type SpringFrameCallback<K extends string> = (values: SpringValues<K>, moving: boolean) => void;

export interface SpringGroupControls<K extends string> {
  // 目標を変えて動かす．いまの値と速度から続けるので，途中で向きを変えても途切れない
  setTarget: (key: K, target: number) => void;
  setTargets: (targets: Partial<Record<K, number>>) => void;
  // アニメーションなしで，値と目標を同時に置き換える（速度は 0）
  jump: (values: Partial<Record<K, number>>) => void;
  // 現在の値で onFrame をもう一度呼ぶ（寸法が変わったときなど）
  refresh: () => void;
  read: (key: K) => SpringState;
  isMoving: () => boolean;
}

interface SpringGroupInternals<K extends string> {
  controls: SpringGroupControls<K>;
  setFrameCallback: (callback: SpringFrameCallback<K> | null) => void;
  attach: () => void;
  detach: () => void;
}

function createSpringGroup<K extends string>(channels: SpringChannels<K>): SpringGroupInternals<K> {
  const keys = Object.keys(channels) as K[];
  const configs = {} as Record<K, SpringConfig>;
  const rests = {} as Record<K, SpringRestThresholds | undefined>;
  const states = {} as Record<K, SpringState>;
  const targets = {} as Record<K, number>;
  for (const key of keys) {
    configs[key] = springFromResponse(channels[key].response, channels[key].dampingRatio);
    rests[key] = channels[key].rest;
    states[key] = { value: 0, velocity: 0 };
    targets[key] = 0;
  }
  let callback: SpringFrameCallback<K> | null = null;
  let frame = 0;
  let previous = 0;
  let attached = false;
  let moving = false;

  const isAtRest = () => keys.every(key => isSpringAtRest(states[key], targets[key], rests[key]));
  const emit = () => { callback?.(states, moving); };

  const settle = () => {
    for (const key of keys) states[key] = { value: targets[key], velocity: 0 };
    moving = false;
    previous = 0;
  };

  const tick = (now: number) => {
    frame = 0;
    if (!attached) return;
    const elapsed = previous ? Math.min(Math.max((now - previous) / 1000, 0), MAX_FRAME_SEC) : FIRST_FRAME_SEC;
    previous = now;
    for (const key of keys) states[key] = stepSpring(states[key], targets[key], configs[key], elapsed);
    if (isAtRest()) {
      settle();
      emit();
      return;
    }
    moving = true;
    emit();
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!attached || frame) return;
    moving = true;
    previous = 0;
    // 動き出した瞬間にも 1 度呼び，動いている印（data-moving など）を最初のフレームから付ける
    emit();
    frame = requestAnimationFrame(tick);
  };

  const controls: SpringGroupControls<K> = {
    setTarget(key, target) {
      if (!Number.isFinite(target) || !(key in targets)) return;
      targets[key] = target;
      if (!isAtRest()) start();
    },
    setTargets(next) {
      for (const key of keys) {
        const target = next[key];
        if (target !== undefined && Number.isFinite(target)) targets[key] = target;
      }
      if (!isAtRest()) start();
    },
    jump(values) {
      for (const key of keys) {
        const value = values[key];
        if (value === undefined || !Number.isFinite(value)) continue;
        states[key] = { value, velocity: 0 };
        targets[key] = value;
      }
      if (isAtRest()) {
        cancelAnimationFrame(frame);
        frame = 0;
        settle();
      }
      emit();
    },
    refresh: emit,
    read: key => states[key],
    isMoving: () => moving,
  };

  return {
    controls,
    setFrameCallback(next) { callback = next; },
    attach() {
      attached = true;
      if (!isAtRest()) start();
    },
    detach() {
      attached = false;
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    },
  };
}

// サーバーでは useLayoutEffect が警告を出すので，その場合は useEffect に切り替える
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// channels は最初の 1 回だけ読む（モジュールの定数として渡すこと）．
// onFrame は毎回の描画で最新のものに差し替わるので，クロージャが古くなる心配はない
export function useSpringGroup<K extends string>(channels: SpringChannels<K>, onFrame: SpringFrameCallback<K>): SpringGroupControls<K> {
  const [group] = useState(() => createSpringGroup(channels));
  useIsomorphicLayoutEffect(() => {
    group.setFrameCallback(onFrame);
  });
  useIsomorphicLayoutEffect(() => {
    group.attach();
    return () => {
      group.detach();
      group.setFrameCallback(null);
    };
  }, [group]);
  return group.controls;
}
