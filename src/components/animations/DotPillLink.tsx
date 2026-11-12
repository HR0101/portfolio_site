import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import styles from './DotPillLink.module.css';

// http(s) で始まる行き先は外部リンクとして扱う（新しいタブで開く）
const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

type DotPillSize = 'md' | 'sm';

interface DotPillLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  href: string;
  // ラベル（文字だけを渡す．塗りの上に重ねる同じ文字の層にも使う）
  children: ReactNode;
  // ラベルの後ろに置く飾りのアイコン（aria-hidden にして渡す）
  icon?: ReactNode;
  size?: DotPillSize;
  // 省略すると，http(s) で始まる行き先だけ外部リンクになる
  external?: boolean;
}

interface PillFaceProps {
  children: ReactNode;
  icon?: ReactNode;
  // true のとき，塗りの上に重ねる反転の層（読み上げには出さない）
  fill?: boolean;
}

// ピルの中身 1 組．通常の層と塗りの層で，同じ並び（点・ラベル・アイコン）を使うので，文字の位置が重なる
function PillFace({ children, icon, fill = false }: PillFaceProps) {
  return (
    <span className={fill ? `${styles.face} ${styles.fill}` : styles.face} aria-hidden={fill || undefined}>
      <span className={styles.dot} />
      <span className={styles.label}>{children}</span>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
    </span>
  );
}

// 点つきの丸いボタン（リンク）．左に小さな点があり，ラベルが続く．
// ホバー（とキーボードのフォーカス）で，点を起点に円が広がってピル全体を塗り，文字が反転する．
// 塗りは，同じ並びを別の層（clip-path で円形に切り出す）に重ねて見せるので，文字の色は塗りの上でも読める．
// next/link を包んでいる．外部リンクのときは，新しいタブで開く．
export function DotPillLink({ href, children, icon, size = 'md', external, className = '', ...anchorProps }: DotPillLinkProps) {
  const isExternal = external ?? EXTERNAL_URL_PATTERN.test(href);
  const classNames = [styles.pill, 'press-effect', className].filter(Boolean).join(' ');
  const content = (
    <>
      <PillFace icon={icon}>{children}</PillFace>
      <PillFace icon={icon} fill>{children}</PillFace>
    </>
  );

  if (isExternal) {
    return (
      <a {...anchorProps} href={href} target="_blank" rel="noopener noreferrer" className={classNames} data-size={size}>
        {content}
      </a>
    );
  }
  return (
    <Link {...anchorProps} href={href} className={classNames} data-size={size}>
      {content}
    </Link>
  );
}
