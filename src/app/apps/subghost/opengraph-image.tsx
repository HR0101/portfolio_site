import { ImageResponse } from 'next/og';
import { GHOST_PATTERN } from './pixel-ghost';

// Subghost 専用の共有カード（Next.js のファイル規約に従う）
export const alt = 'Subghost — Task status for Claude Code and Codex CLI, right in the notch.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 内容がリクエストに依存しないため，ビルド時に画像として書き出す
export const dynamic = 'force-static';

// ドット1つぶんの大きさ
const DOT = 24;
const GRID = GHOST_PATTERN.length;

// アイコンと同じ配色（上がシアン，下が紫）
function bodyColor(row: number) {
  const ratio = row / (GRID - 1);
  const hue = 188 + ratio * 76;
  const lightness = 74 - ratio * 8;
  return `hsl(${hue.toFixed(0)}, 82%, ${lightness.toFixed(0)}%)`;
}

// 共有カードは日本語フォントを埋め込めないため，表記はすべて欧文でそろえる
export default function SubghostOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#07070d',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 600 }}>
          <div style={{ display: 'flex', fontSize: 24, color: '#8b93ad', letterSpacing: 4 }}>
            WATCHING, NEVER TOUCHING
          </div>
          <div style={{ display: 'flex', fontSize: 94, fontWeight: 700, color: '#f2f4fb', marginTop: 16 }}>
            Subghost
          </div>
          <div style={{ display: 'flex', fontSize: 33, color: '#9fd7ea', marginTop: 14, lineHeight: 1.4 }}>
            Task status in the notch.
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
            <div
              style={{
                display: 'flex',
                padding: '8px 22px',
                borderRadius: 999,
                backgroundColor: '#12333b',
                color: '#7ee8f5',
                fontSize: 24,
              }}
            >
              Working
            </div>
            <div
              style={{
                display: 'flex',
                padding: '8px 22px',
                borderRadius: 999,
                backgroundColor: '#221c3d',
                color: '#b9a3fb',
                fontSize: 24,
              }}
            >
              Done
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 23, color: '#6d748c', marginTop: 34 }}>
            github.com/HR0101/subghost
          </div>
        </div>

        {/* アイコンと同じドット絵を，div のマス目で組み直す */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexShrink: 0,
            width: GRID * DOT,
            height: GRID * DOT + 2,
          }}
        >
          {GHOST_PATTERN.flatMap((row, y) =>
            row.split('').flatMap((cell, x) => {
              if (cell === '.') {
                return [];
              }
              const color = cell === 'o' ? '#ffffff' : cell === 'm' ? '#8ff3ff' : bodyColor(y);
              return [
                <div
                  key={`${x}-${y}`}
                  style={{
                    position: 'absolute',
                    display: 'flex',
                    left: x * DOT,
                    top: y * DOT,
                    width: DOT,
                    height: DOT,
                    backgroundColor: color,
                  }}
                />,
              ];
            }),
          )}
        </div>
      </div>
    ),
    size,
  );
}
