// 「/」で区切った語の明度です．進捗は呼び出し側の共有スクロール監視から渡します．
const MIN_OPACITY = 0.62;
const HIGHLIGHT_LEAD = 0.05;

export function statementWords(text: string): string[] {
  return text.split('/').filter(word => word.length > 0);
}

export function statementOpacity(index: number, wordCount: number, progress: number): number {
  const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const illumination = Math.max(0, Math.min(1, (safeProgress + HIGHLIGHT_LEAD) * wordCount - index));
  return MIN_OPACITY + illumination * (1 - MIN_OPACITY);
}

// 本数はデータから渡し，全作品にソースがあるという断定はしません．
export const STATEMENT_EXAMPLES = {
  apps: (count: number) => `${Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0))} のアプリ．/個人開発です．`,
  works: (count: number) => `Web とゲーム，/${Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0))} の作品．`,
  source: 'ソースコードを/GitHub に/公開しています．',
} as const;
