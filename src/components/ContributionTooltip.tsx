"use client";

import { useEffect, useState, type RefObject } from 'react';

// 吹き出しの中身と，置く位置（container の左上からの距離）
interface TooltipState {
  date: string;
  label: string;
  dateLabel: string;
  x: number;
  y: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

// "YYYY-MM-DD" を，時差でずれないよう日付だけの Date にして「10月27日(月)」の形にする
function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return DATE_FORMATTER.format(new Date(year, month - 1, day));
}

// Contribution Graph のマスにカーソルを重ねると，その日の数を吹き出しで出す．
// 吹き出しはマスからマスへ滑って移り，中身は日付が変わるたびに差し替わる．
// マスには data-contribution-date / data-contribution-count を付けておく
export function ContributionTooltip({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const handlePointerOver = (event: PointerEvent) => {
      const cell = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-contribution-date]') : null;
      if (!cell) {
        setTooltip(null);
        return;
      }
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
    };
    const handlePointerLeave = () => setTooltip(null);
    container.addEventListener('pointerover', handlePointerOver);
    container.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      container.removeEventListener('pointerover', handlePointerOver);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef]);

  if (!tooltip) {
    return null;
  }

  // 数はグラフ全体の説明（aria-label）で伝えているため，この吹き出しは読み上げから外す
  return (
    <span className="contribution-tooltip" style={{ left: tooltip.x, top: tooltip.y }} aria-hidden="true">
      <span key={tooltip.date} className="contribution-tooltip-body">
        <strong>{tooltip.label}</strong>
        <span>{tooltip.dateLabel}</span>
      </span>
    </span>
  );
}
