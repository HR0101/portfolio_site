import { ImageResponse } from 'next/og';

// Tsumugi 専用の共有カード（Next.js のファイル規約に従う）
export const alt = 'Tsumugi — Every article, woven into one fabric.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 内容がリクエストに依存しないため，ビルド時に画像として書き出す
export const dynamic = 'force-static';

// 右側に描く布の大きさと，糸の本数
const CLOTH_SIZE = 400;
const THREAD_COUNT = 16;
const PITCH = CLOTH_SIZE / THREAD_COUNT;
const WARP_WIDTH = PITCH * 0.6;
const WEFT_HEIGHT = PITCH * 0.58;
// 経糸（信頼度）と緯糸（鮮度）の色
const WARP_COLOR = '#3f5c78';
const WEFT_COLOR = '#a3763a';

const indices = Array.from({ length: THREAD_COUNT }, (_, index) => index);
// 平織りで経糸が上にくるマスだけを拾う
const crossings = indices.flatMap((row) =>
  indices.filter((column) => (row + column) % 2 === 0).map((column) => ({ row, column })),
);

// 共有カードは日本語フォントを埋め込めないため，表記はすべて欧文でそろえる
export default function TsumugiOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f6f2ea',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 620 }}>
          <div style={{ display: 'flex', fontSize: 26, color: '#7b7263', letterSpacing: 4 }}>
            SAVE, THEN UNDERSTAND
          </div>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: '#322e27', marginTop: 18 }}>
            Tsumugi
          </div>
          <div style={{ display: 'flex', fontSize: 36, color: '#4d5f70', marginTop: 14, lineHeight: 1.4 }}>
            Every article, woven into one fabric.
          </div>
          <div style={{ display: 'flex', gap: 30, marginTop: 44 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', width: 8, height: 34, backgroundColor: WARP_COLOR }} />
              <div style={{ display: 'flex', fontSize: 24, color: '#6d675c' }}>Warp — Credibility</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', width: 34, height: 8, backgroundColor: WEFT_COLOR }} />
              <div style={{ display: 'flex', fontSize: 24, color: '#6d675c' }}>Weft — Freshness</div>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#9a9184', marginTop: 34 }}>
            github.com/HR0101/Tsumugi
          </div>
        </div>

        {/* 経糸と緯糸を重ね，上になる経糸を描き足して平織りに見せる */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: CLOTH_SIZE,
            height: CLOTH_SIZE,
            backgroundColor: '#ece3d2',
            borderRadius: 24,
            overflow: 'hidden',
          }}
        >
          {indices.map((column) => (
            <div
              key={`warp-${column}`}
              style={{
                position: 'absolute',
                display: 'flex',
                top: 0,
                left: column * PITCH + (PITCH - WARP_WIDTH) / 2,
                width: WARP_WIDTH,
                height: CLOTH_SIZE,
                backgroundColor: WARP_COLOR,
                opacity: 0.82,
              }}
            />
          ))}
          {indices.map((row) => (
            <div
              key={`weft-${row}`}
              style={{
                position: 'absolute',
                display: 'flex',
                left: 0,
                top: row * PITCH + (PITCH - WEFT_HEIGHT) / 2,
                width: CLOTH_SIZE,
                height: WEFT_HEIGHT,
                backgroundColor: WEFT_COLOR,
                opacity: 0.88,
              }}
            />
          ))}
          {crossings.map(({ row, column }) => (
            <div
              key={`cross-${row}-${column}`}
              style={{
                position: 'absolute',
                display: 'flex',
                left: column * PITCH + (PITCH - WARP_WIDTH) / 2,
                top: row * PITCH,
                width: WARP_WIDTH,
                height: PITCH,
                backgroundColor: WARP_COLOR,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
