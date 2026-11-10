export const NOTES_PATH = '/notes';
export const NOTES_REPOSITORY = 'https://github.com/HR0101/portfolio_site';

export type NoteFigure = 'operating-day' | 'privacy' | 'hooks' | 'fairness' | 'planet' | 'verification';

export interface Note {
  slug: string;
  title: string;
  summary: string;
  // 記事の公開日を推測せず，git log で確認した元資料の初出日を記録します．
  date: string;
  dateSource: string;
  product?: string;
  productHref: string;
  repository: string;
  readingMinutes: number;
  tags: string[];
  figure: NoteFigure;
  sources: string[];
}

export const NOTES: Note[] = [
  {
    slug: 'planet-handoff',
    title: '惑星をページ全体で引き継ぐ',
    summary: 'Hero の球から，フッターの名前まで．同じ惑星をどのセクションが預かるかを追います．',
    date: '2026-11-09',
    dateSource: 'src/lib/sharedPlanet.ts',
    product: 'このサイト',
    productHref: '/',
    repository: NOTES_REPOSITORY,
    readingMinutes: 4,
    tags: ['描画', '状態', '設計'],
    figure: 'planet',
    sources: ['CLAUDE.md', 'src/lib/sharedPlanet.ts', 'src/lib/planetTail.ts', 'src/lib/wordmarkMerge.ts', 'src/lib/scrollObserver.ts', 'src/lib/dotPlanetCanvas.ts'],
  },
  {
    slug: 'meeting-station-fairness',
    title: '集合駅の公平さをどう測るか',
    summary: '近い駅と，負担のそろう駅．説明用の移動時間を並べて，最大と最小の差を比べます．',
    date: '2026-10-26',
    dateSource: 'src/app/apps/ekihub/page.tsx',
    product: 'EkiHub',
    productHref: '/apps/ekihub/',
    repository: 'https://github.com/HR0101/EkiHub',
    readingMinutes: 3,
    tags: ['比較', '検証', '設計'],
    figure: 'fairness',
    sources: ['src/app/apps/ekihub/page.tsx', 'src/lib/hubRoutes.ts', 'src/data/works.ts', 'src/lib/notes/fairness.ts', 'tests/notes-logic.test.mjs'],
  },
  {
    slug: 'operating-day-boundary',
    title: '午前4時の運行日境界',
    summary: '日付が変わっても，運行日はまだ続きます．時刻を動かして，参照する日と残り便を確かめます．',
    date: '2026-10-08',
    dateSource: 'src/app/apps/bustimeapp/page.tsx',
    product: 'BusTimeApp',
    productHref: '/apps/bustimeapp/',
    repository: 'https://github.com/HR0101/BusTimeApp',
    readingMinutes: 3,
    tags: ['時刻', '状態', '設計'],
    figure: 'operating-day',
    sources: ['src/app/apps/bustimeapp/page.tsx', 'src/lib/busProcess.ts', 'src/data/apps.ts', 'src/lib/notes/operatingDay.ts', 'tests/notes-operating-day.test.mjs'],
  },
  {
    slug: 'on-device-diagnosis',
    title: '診断を端末内で完結させる',
    summary: '記事から要約とスコアまで．既定の診断と，端末の外に処理を置く場合の違いを図にします．',
    date: '2026-10-08',
    dateSource: 'src/app/apps/tsumugi/page.tsx',
    product: 'Tsumugi',
    productHref: '/apps/tsumugi/',
    repository: 'https://github.com/HR0101/Tsumugi',
    readingMinutes: 3,
    tags: ['プライバシー', 'データの流れ', '設計'],
    figure: 'privacy',
    sources: ['src/app/apps/tsumugi/page.tsx', 'src/data/apps.ts'],
  },
  {
    slug: 'observe-without-sending',
    title: 'CLIへ送らない，監視専用の設計',
    summary: 'イベントを受け取り，Working と Done を切り替える．入力や承認を CLI に戻さない流れです．',
    date: '2026-10-08',
    dateSource: 'src/app/apps/subghost/page.tsx',
    product: 'Subghost',
    productHref: '/apps/subghost/',
    repository: 'https://github.com/HR0101/subghost',
    readingMinutes: 3,
    tags: ['プライバシー', 'データの流れ', '状態', '設計'],
    figure: 'hooks',
    sources: ['src/app/apps/subghost/page.tsx', 'src/app/apps/subghost/hook-flow.tsx', 'src/lib/notes/hookEvents.ts'],
  },
  {
    slug: 'verification-before-publishing',
    title: '公開までの検証',
    summary: '型，lint，本番ビルド，E2E．公開の前に何を確かめるかを，順番にたどります．',
    date: '2026-10-08',
    dateSource: 'DEPLOY.md',
    product: 'このサイト',
    productHref: '/',
    repository: NOTES_REPOSITORY,
    readingMinutes: 3,
    tags: ['検証', '設計'],
    figure: 'verification',
    sources: ['DEPLOY.md', 'package.json', '.github/workflows/ci.yml', 'CLAUDE.md', 'tests/e2e.test.mjs', 'src/lib/notes/verification.ts'],
  },
];
