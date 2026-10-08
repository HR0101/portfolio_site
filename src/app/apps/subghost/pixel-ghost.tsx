// Subghost のアイコンにあわせたドット絵のゴースト．
// '#' が体，'o' が目，'m' が口（プロンプト記号の "＞"）を表す．
export const GHOST_PATTERN = [
  '.....####.....',
  '...########...',
  '..##########..',
  '.############.',
  '.############.',
  '.##oo####oo##.',
  '.##oo####oo##.',
  '.############.',
  '.#####m######.',
  '.######m#####.',
  '.#####m######.',
  '.############.',
  '.############.',
  '.###..##..###.',
] as const;

const GRID_SIZE = GHOST_PATTERN.length;

interface PixelGhostProps {
  // 1辺の表示サイズ（ピクセル）
  size?: number;
  // 同じページに複数置くとき，グラデーションの id が衝突しないようにする接頭辞
  idPrefix?: string;
  className?: string;
}

// ドットを1つずつ矩形で描くため，どの拡大率でも輪郭がぼけない
export function PixelGhost({ size = 96, idPrefix = 'ghost', className }: PixelGhostProps) {
  const gradientId = `${idPrefix}-body`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#8fe9f7" />
          <stop offset="55%" stopColor="#79b6f2" />
          <stop offset="100%" stopColor="#a472f0" />
        </linearGradient>
      </defs>
      {GHOST_PATTERN.map((row, y) =>
        row.split('').map((cell, x) => {
          if (cell === '.') {
            return null;
          }
          const fill = cell === 'o' ? '#ffffff' : cell === 'm' ? '#8ff3ff' : `url(#${gradientId})`;
          return <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />;
        }),
      )}
    </svg>
  );
}
