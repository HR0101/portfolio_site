"use client";

import type { CSSProperties, ReactNode } from 'react';
import { FEATURES } from '../../config/features';
import { useInView } from '../../hooks/useInView';
import {
  CORNER_MARK_DEFAULT_DIVISIONS,
  getCornerMarkDelay,
  getCornerMarkLayout,
} from '../../lib/animations/cornerMarks';
import styles from './CornerMarks.module.css';

// 枠が画面に入ったとみなす，見えている割合
const IN_VIEW_THRESHOLD = 0.15;

// 印を置く場所．outside は枠の外側（枠から離して置く），inside は枠の内側（親の overflow で外側が切れるとき）
export type CornerMarksPlacement = 'outside' | 'inside';
// 印が現れる合図．view は枠が画面に入ったとき，host は祖先の data-corner-host がホバー（とフォーカス）されたとき
export type CornerMarksTrigger = 'view' | 'host';
// 色．quiet は面の補足色，overlay は画像の上に置く白（淡い縁つき）
export type CornerMarksTone = 'quiet' | 'overlay';

interface CornerMarkSetProps {
  // 下辺の中央に置く小さな英字のラベル（装飾．既存の語だけを渡す）
  label?: string;
  // 上辺・下辺の等分数
  divisions?: number;
  placement?: CornerMarksPlacement;
  trigger?: CornerMarksTrigger;
  tone?: CornerMarksTone;
  // 登場を始めるまでの遅れ（ミリ秒）
  delayMs?: number;
}

// 位置・向き・遅れを CSS 変数で渡す
function toMarkStyle(fraction: number, edge: 'top' | 'bottom', dx: number, dy: number, delayMs: number): CSSProperties {
  return {
    '--mx': fraction,
    '--my': edge === 'top' ? 0 : 1,
    '--dx': dx,
    '--dy': dy,
    '--mark-delay': `${delayMs}ms`,
  } as CSSProperties;
}

// 親（position が static でない要素）いっぱいに重ねる「＋」の印の層．
// 親の大きさは変えない（絶対配置）．親がホバーされると，印が枠から少し離れる．
// 装飾なので aria-hidden．動かすのは transform と opacity だけで，動きを減らす設定では所定の位置へ最初から置く．
export function CornerMarkSet({
  label,
  divisions = CORNER_MARK_DEFAULT_DIVISIONS,
  placement = 'outside',
  trigger = 'view',
  tone = 'quiet',
  delayMs = 0,
}: CornerMarkSetProps) {
  const { ref, isInView } = useInView<HTMLSpanElement>(IN_VIEW_THRESHOLD);
  if (!FEATURES.cornerMarks) return null;

  const marks = getCornerMarkLayout(divisions, Boolean(label));
  const labelStyle = { '--mark-delay': `${getCornerMarkDelay(marks.length, delayMs)}ms` } as CSSProperties;

  return (
    <span
      ref={ref}
      className={styles.set}
      data-placement={placement}
      data-trigger={trigger}
      data-tone={tone}
      data-visible={isInView}
      aria-hidden="true"
    >
      {marks.map((mark) => (
        <span key={mark.key} className={styles.mark} style={toMarkStyle(mark.fraction, mark.edge, mark.dx, mark.dy, getCornerMarkDelay(mark.order, delayMs))}>
          <span className={styles.cross} />
        </span>
      ))}
      {label && <span className={styles.label} style={labelStyle}>{label}</span>}
    </span>
  );
}

interface CornerMarksProps extends CornerMarkSetProps {
  // 印で囲む画面の枠
  children: ReactNode;
  className?: string;
}

// 子（画面の枠）を包み，枠の外側の四隅と上下の辺に「＋」の印を並べる．
// 印は絶対配置で枠の外へはみ出すので，レイアウトは変えない．
// 祖先の overflow で切れる場所では，placement="inside" にして枠の内側へ置く．
// FEATURES.cornerMarks が false のときは，子だけをそのまま返す（包む要素も出さない）．
export function CornerMarks({ children, className, ...markProps }: CornerMarksProps) {
  if (!FEATURES.cornerMarks) return <>{children}</>;
  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      {children}
      <CornerMarkSet {...markProps} />
    </div>
  );
}
