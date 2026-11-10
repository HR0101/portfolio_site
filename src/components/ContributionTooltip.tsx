"use client";

import { useEffect, useState, type RefObject } from 'react';
import { subscribeToScroll } from '../lib/scrollObserver';
import styles from '../sections/DevLog.module.css';

// 吹き出しの中身と，置く位置（container の左上からの距離）
interface TooltipState {
  date: string;
  label: string;
  dateLabel: string;
  x: number;
  y: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
const TOOLTIP_EXIT_MS = 80;

// "YYYY-MM-DD" を，時差でずれないよう日付だけの Date にして「10月27日(月)」の形にする
function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return DATE_FORMATTER.format(new Date(year, month - 1, day));
}

// Contribution Graph のマスにカーソルを重ねると，その日の数を吹き出しで出す．
// マスからマスへは位置をすぐ合わせ，面はマスを起点に開閉する．
// マスには data-contribution-date / data-contribution-count を付けておく
export function ContributionTooltip({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      setVisible(false);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setTooltip(null), TOOLTIP_EXIT_MS);
    };
    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const cell = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-contribution-date]') : null;
      if (!cell) {
        close();
        return;
      }
      clearTimeout(closeTimer);
      const containerBounds = container.getBoundingClientRect();
      const cellBounds = cell.getBoundingClientRect();
      const date = cell.dataset.contributionDate ?? '';
      const count = Number(cell.dataset.contributionCount ?? 0);
      setTooltip({
        date,
        label: count === 0 ? 'No contributions' : `${count} contribution${count === 1 ? '' : 's'}`,
        dateLabel: formatDayLabel(date),
        x: cellBounds.left + cellBounds.width / 2 - containerBounds.left,
        y: cellBounds.top - containerBounds.top,
      });
      setVisible(true);
    };
    container.addEventListener('pointerover', handlePointerOver);
    container.addEventListener('pointerleave', close);
    const unsubscribe = subscribeToScroll(close);
    return () => {
      container.removeEventListener('pointerover', handlePointerOver);
      container.removeEventListener('pointerleave', close);
      unsubscribe();
      clearTimeout(closeTimer);
    };
  }, [containerRef]);

  if (!tooltip) {
    return null;
  }

  // 数はグラフ全体の説明（aria-label）で伝えているため，この吹き出しは読み上げから外す
  return (
    <span className={`contribution-tooltip ${styles.tooltip}`} data-open={visible} style={{ left: tooltip.x, top: tooltip.y }} aria-hidden="true">
      <span className={`contribution-tooltip-body ${styles.tooltipBody}`}>
        <strong>{tooltip.label}</strong>
        <span>{tooltip.dateLabel}</span>
      </span>
    </span>
  );
}
