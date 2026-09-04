import { ImageResponse } from 'next/og';
import { SWIFT_APPS } from '../data/apps';

// SNS 共有用カード画像の設定（Next.js のファイル規約に従う）
export const alt = 'Ryuto Hara — iOS & macOS App Portfolio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 画像に載せる数値
const productCount = SWIFT_APPS.length;
const repositoryCount = SWIFT_APPS.reduce((total, app) => total + app.repositories.length, 0);

// 共有カードは日本語フォントを埋め込めないため，表記はすべて欧文でそろえる
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#fbfaf9',
          padding: '72px',
        }}
      >
        {/* 上部のアクセントライン */}
        <div
          style={{
            display: 'flex',
            width: '160px',
            height: '10px',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, #7dd3fc, #a78bfa)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 34, color: '#64748b', letterSpacing: 2 }}>
            iOS &amp; macOS APP PORTFOLIO
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 86,
              fontWeight: 700,
              color: '#313a4b',
              marginTop: 12,
            }}
          >
            Ryuto Hara
          </div>
          <div style={{ display: 'flex', fontSize: 36, color: '#5b677a', marginTop: 16 }}>
            Trust, built into every line.
          </div>
        </div>

        {/* 下部の実績 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, color: '#0369a1' }}>
              {productCount}
            </div>
            <div style={{ display: 'flex', fontSize: 26, color: '#64748b' }}>products</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, color: '#6d28d9' }}>
              {repositoryCount}
            </div>
            <div style={{ display: 'flex', fontSize: 26, color: '#64748b' }}>repositories</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8' }}>github.com/HR0101</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
