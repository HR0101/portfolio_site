"use client";

import { Reveal } from './Reveal';
import { useScrollLinked } from '../hooks/useScrollLinked';

// アクセントバーの最小幅・最大幅（ピクセル）
const ACCENT_BAR_MIN_WIDTH_PX = 24;
const ACCENT_BAR_MAX_WIDTH_PX = 140;

// 各セクション共通の見出しブロック
interface SectionHeadingProps {
  // セクション番号付きの小見出し（例: "01. About Me"）
  label: string;
  // メインタイトル
  title: string;
  // 補足説明（任意）
  description?: string;
}

export function SectionHeading({ label, title, description }: SectionHeadingProps) {
  // スクロールが進むほどアクセントバーが伸びる
  const { ref, progress } = useScrollLinked<HTMLDivElement>('enter');
  const accentBarWidthPx =
    ACCENT_BAR_MIN_WIDTH_PX + (ACCENT_BAR_MAX_WIDTH_PX - ACCENT_BAR_MIN_WIDTH_PX) * progress;

  return (
    <Reveal className="mb-12 md:mb-16">
      <div ref={ref}>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-sky-700 dark:text-sky-400 uppercase mb-3">
          <span
            className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-glow-pulse"
            aria-hidden="true"
          />
          <span lang="en">{label}</span>
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h2>
        {/* スクロールに合わせて伸びるアクセントバー */}
        <span
          className="mt-4 block h-1 rounded-full animate-gradient bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400"
          style={{ width: `${accentBarWidthPx.toFixed(1)}px` }}
          aria-hidden="true"
        />
        {description && (
          <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </Reveal>
  );
}
