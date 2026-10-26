import type { CSSProperties } from 'react';

interface KineticTextProps {
  text: string;
  // 1文字目が動き出すまでの時間（ミリ秒）
  baseDelayMs?: number;
  // 1文字ごとにずらす時間（ミリ秒）
  stepMs?: number;
  // 登場したあと，文字の上を波が通り続けるかどうか
  wave?: boolean;
  className?: string;
}

// ページを開いた瞬間に，1文字ずつぼかしの中から起き上がる見出し．
// CSS のアニメーションだけで動くので，サーバーコンポーネントからも使える．
// 読み上げ用には元の文字列を視覚的に隠して置き，分割した文字は読み上げから外す．
export function KineticText({ text, baseDelayMs = 120, stepMs = 45, wave = false, className = '' }: KineticTextProps) {
  const characters = Array.from(text);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => (
          <span
            key={`${character}-${index}`}
            className={wave ? 'kinetic-char kinetic-char-wave' : 'kinetic-char'}
            style={
              {
                '--char-delay': `${baseDelayMs + index * stepMs}ms`,
                // 波は左から右へ流れるように，文字の位置でずらす
                '--wave-delay': `${2400 + index * 90}ms`,
              } as CSSProperties
            }
          >
            {character === ' ' ? ' ' : character}
          </span>
        ))}
      </span>
    </span>
  );
}
