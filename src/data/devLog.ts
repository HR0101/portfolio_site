// 日付は表示用の YYYY-MM-DD．同日の記録は新しく編集したものを先頭に置く．
export interface DevLogEntry {
  id: string;
  date: string;
  title: string;
  change: string;
  benefit: string;
  link?: {
    href: string;
    label: string;
  };
}

// git log の cb6a1d9 を基準とした作業ツリーの差分を確認して手動で記録する．
// API やコミット日時から生成せず，新しい日付の記録を先頭へ追加する．
export const devLog: readonly DevLogEntry[] = [
  {
    id: 'processExhibits',
    date: '2026-11-09',
    title: '制作工程の再現と操作録画を追加',
    change: 'Skills に BusTimeApp の工程の再現，Works に EkiHub の路線図の再現，Apps に BusTimeApp の操作録画を追加しました．',
    benefit: '入力から結果までの流れとアプリの操作を，再現・録画の注記と一緒に確認できます．',
    link: { href: '/#skills', label: '制作工程を見る' },
  },
  {
    id: 'appEntrances',
    date: '2026-11-09',
    title: 'アプリとゲームの入口を整理',
    change: 'Apps はアイコン素材のある6本の壁にし，残り11本を「その他のアプリ」，ゲームを専用ページへ分けました．',
    benefit: 'トップの展示に加え，別ページでその他のアプリとゲームをそれぞれ一覧できます．',
    link: { href: '/apps/others', label: 'その他のアプリを見る' },
  },
  {
    id: 'sharedDesign',
    date: '2026-11-09',
    title: '共通の色・影・文字の太さを調整',
    change: '共通トークンの操作色を1色の青にし，カードの影を外して製品画像用の影を定義し，共通見出しとフォームのラベルを600にそろえました．',
    benefit: '共通トークンを使う部分では，操作先を青，情報の区切りを面と細い線で見分けられます．',
  },
];
