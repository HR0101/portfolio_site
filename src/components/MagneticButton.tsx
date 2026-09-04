"use client";

import React, { useCallback, useRef } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// カーソルに引き寄せられる最大距離（ピクセル）
const MAGNET_STRENGTH_PX = 7;

interface MagneticButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  // 外部リンクとして開くかどうか
  isExternal?: boolean;
}

// カーソルに少しだけ吸い寄せられるリンクボタン
export function MagneticButton({
  href,
  children,
  className = '',
  ariaLabel,
  isExternal = false,
}: MagneticButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      const element = anchorRef.current;
      if (!element || prefersReducedMotion) {
        return;
      }

      const bounds = element.getBoundingClientRect();
      // ボタン中心からのずれを -1〜1 に正規化して移動量に変換する
      const offsetX = (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2);
      const offsetY = (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2);

      element.style.transform = `translate(${(offsetX * MAGNET_STRENGTH_PX).toFixed(1)}px, ${(
        offsetY * MAGNET_STRENGTH_PX
      ).toFixed(1)}px)`;
    },
    [prefersReducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    const element = anchorRef.current;
    if (element) {
      element.style.transform = 'translate(0, 0)';
    }
  }, []);

  const externalProps = isExternal
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a
      ref={anchorRef}
      href={href}
      aria-label={ariaLabel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out ${className}`}
      {...externalProps}
    >
      {children}
    </a>
  );
}
