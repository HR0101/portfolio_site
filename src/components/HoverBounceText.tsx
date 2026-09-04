"use client";

interface HoverBounceTextProps {
  // 1文字ずつ分解して表示する文字列
  text: string;
  className?: string;
  // 1文字ごとのクラス（グラデーション文字などに使う）
  characterClassName?: string;
}

// 文字にカーソルを乗せると，その文字だけがぴょこんと跳ねるテキスト．
// 読み上げ時は元の文字列として扱われるよう aria-label を付ける．
export function HoverBounceText({
  text,
  className = '',
  characterClassName = '',
}: HoverBounceTextProps) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((character, index) => (
        <span
          key={`${character}-${index}`}
          aria-hidden="true"
          className={`inline-block transition-transform duration-200 ease-out hover:-translate-y-2 hover:scale-110 ${characterClassName}`}
        >
          {character}
        </span>
      ))}
    </span>
  );
}
