import { ImageResponse } from 'next/og';

// EkiHub 専用の共有カード（Next.js のファイル規約に従う）
export const alt = 'EkiHub — Find the station that is fair for everyone.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 内容がリクエストに依存しないため，ビルド時に画像として書き出す
export const dynamic = 'force-static';

// 中心へ集まる4人の駅（カード右側の図）
const MEMBERS = [
  { x: 40, y: 60, color: '#2fd3b5' },
  { x: 330, y: 40, color: '#7c8bff' },
  { x: 360, y: 300, color: '#ffb547' },
  { x: 70, y: 320, color: '#ff7a9a' },
];
const CENTER = { x: 200, y: 180 };

// 共有カードは日本語フォントを埋め込めないため，表記はすべて欧文でそろえる
export default function EkiHubOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'radial-gradient(circle at 75% 40%, #123a3f 0%, #0b1220 60%)',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 620 }}>
          <div style={{ display: 'flex', fontSize: 24, color: '#2fd3b5', letterSpacing: 6 }}>FIND THE FAIR MIDDLE</div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 104, fontWeight: 800, color: '#eef2fb', letterSpacing: -3 }}>
            EkiHub
          </div>
          <div style={{ display: 'flex', marginTop: 18, fontSize: 34, color: '#c4cce0', lineHeight: 1.4 }}>
            Not the middle of the map, but the middle for everyone.
          </div>
          <div style={{ display: 'flex', marginTop: 36, fontSize: 24, color: '#8f9bb6' }}>ekihub.jp</div>
        </div>
        <svg width="400" height="360" viewBox="0 0 400 360">
          {MEMBERS.map((member, index) => (
            <line
              key={`line-${index}`}
              x1={member.x}
              y1={member.y}
              x2={CENTER.x}
              y2={CENTER.y}
              stroke={member.color}
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}
          {MEMBERS.map((member, index) => (
            <circle key={`dot-${index}`} cx={member.x} cy={member.y} r="18" fill={member.color} />
          ))}
          <circle cx={CENTER.x} cy={CENTER.y} r="44" fill="#0b1220" stroke="#2fd3b5" strokeWidth="16" />
          <line x1={CENTER.x} y1={CENTER.y + 52} x2={CENTER.x} y2={CENTER.y + 112} stroke="#7c8bff" strokeWidth="16" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
