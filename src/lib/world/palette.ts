// サイト全体で共有する「世界の色」．点描の惑星と線の三角錐（自己紹介・章の立体・章の間の帯・フッター）が同じ色を使う．
// 操作の色（ボタン・リンクの青）は design-tokens.css の --site-accent のまま．ここの 4 色は飾りにだけ使う．
// 他のファイルを import しない純粋なモジュール（テストは tests/world-palette.test.mjs）．

export type WorldTheme = 'light' | 'dark';

// 4 つの章（自己紹介の順：学ぶ・アプリ・組込み・信頼）
export const WORLD_KINDS = ['learn', 'apps', 'hardware', 'trust'] as const;
export type WorldKind = typeof WORLD_KINDS[number];

export interface WorldLook {
  // 線と点の基本の色（ライトは墨色，ダークは温かい白）
  ink: string;
  // 章の色（WORLD_KINDS の順）
  accents: readonly [string, string, string, string];
}

export const WORLD_LOOKS: Record<WorldTheme, WorldLook> = {
  light: { ink: '#16161a', accents: ['#a85d00', '#6938d8', '#0b8468', '#1466d6'] },
  dark: { ink: '#f7f4ee', accents: ['#ffb829', '#9b6bff', '#24d4ac', '#6db2ff'] },
};

export function getWorldLook(theme: WorldTheme | undefined | null): WorldLook {
  return WORLD_LOOKS[theme === 'dark' ? 'dark' : 'light'];
}

// 章の色を 1 つ返す（知らない kind は最初の色）
export function getWorldAccent(theme: WorldTheme | undefined | null, kind: WorldKind): string {
  const index = WORLD_KINDS.indexOf(kind);
  return getWorldLook(theme).accents[index < 0 ? 0 : index];
}

// 色（#rrggbb）に濃さを付けた rgb() の表記．形が違えばそのまま返す
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const value = Number.parseInt(color.slice(1), 16);
  const safeAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  return `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255} / ${safeAlpha})`;
}
