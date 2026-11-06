import { ImageResponse } from 'next/og';

// Ark Server 専用の共有カード（Next.js のファイル規約に従う）
export const alt = 'Ark Server — Carry everything. Keep it safe.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 内容がリクエストに依存しないため，ビルド時に画像として書き出す
export const dynamic = 'force-static';

// 方舟の船体は，積み重なったサーバーの段（アイコンと同じ形）
const TIERS = [
  { x: 20, y: 0, width: 360 },
  { x: 56, y: 40, width: 288 },
  { x: 96, y: 80, width: 208 },
];
const TIER_HEIGHT = 30;
const GOLD = '#e3a43c';
const CREAM = '#f6f1e7';

// 共有カードは日本語フォントを埋め込めないため，表記はすべて欧文でそろえる
export default function ArkServerOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #0b2340 0%, #1b4f82 58%, #f0b85c 100%)',
          padding: '72px',
          position: 'relative',
        }}
      >
        {/* 海 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 170,
            display: 'flex',
            background: 'linear-gradient(180deg, #2a6fb0 0%, #0d2f55 100%)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 600, position: 'relative' }}>
          <div style={{ display: 'flex', fontSize: 24, color: '#ffd98a', letterSpacing: 6 }}>YOUR LIBRARY, ABOARD</div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 112, fontWeight: 800, color: '#ffffff', letterSpacing: -3 }}>
            Ark Server
          </div>
          <div style={{ display: 'flex', marginTop: 16, fontSize: 36, color: '#dbe8f7', lineHeight: 1.4 }}>
            Carry everything. Keep it safe.
          </div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: 24, color: '#b8cbe4' }}>macOS · iPhone · Browser</div>
        </div>
        <svg width="400" height="400" viewBox="0 0 400 400" style={{ position: 'relative' }}>
          {/* 灯 */}
          <circle cx="86" cy="40" r="22" fill="none" stroke="#ffd98a" strokeOpacity="0.55" strokeWidth="3" />
          <circle cx="86" cy="40" r="9" fill="#ffd98a" />
          {/* マスト */}
          <rect x="83" y="50" width="6" height="204" rx="3" fill={CREAM} />
          {/* 帆：右向きの三角は，そのまま再生ボタン */}
          <path d="M98 74 L98 238 L258 156 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="12" strokeLinejoin="round" />
          {/* 船体 */}
          <g transform="translate(0 262)">
            {TIERS.map((tier) => (
              <g key={tier.y}>
                <rect x={tier.x} y={tier.y} width={tier.width} height={TIER_HEIGHT} rx="15" fill={CREAM} />
                <circle cx={tier.x + 22} cy={tier.y + TIER_HEIGHT / 2} r="4.5" fill={GOLD} />
              </g>
            ))}
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
