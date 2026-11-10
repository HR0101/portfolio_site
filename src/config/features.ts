// 追加した要素の表示スイッチ．false の要素は，ホーム・ナビ・⌘K・sitemap から外れる（コードは残してあり，true に戻せば復帰する）．
// lab と notes は，ページ自体を src/disabled/ へ移してある．戻すときは src/disabled/lab・src/disabled/notes を src/app/ へ戻し，ここを true にする．
export const FEATURES = {
  // 実験室 /lab とホームの予告
  lab: false,
  // 制作ノート /notes とホームの予告
  notes: false,
  // Skills の「実装の展示室」（4 タブ）とカードからの導線
  skillLab: false,
  // 制作の姿勢の「EVIDENCE」
  evidence: false,
  // GitHub の「最近の制作記録」
  devLog: false,
  // Contact の「相談できること」
  contactIntro: false,
  // Apps の「順に見る／一覧で見る」の切り替えを，粘って移る流体タブにする（false なら，面が滑る今の表示）
  liquidTabs: true,
  // Apps の壁のパネルの実画面を，Z 方向の 4 層へ離す「分解」ボタン（false なら，今の画面のまま）
  explodedView: true,
  // 何もない所でカーソルに合わせて流れる流体（背景の canvas）
  fluidCursor: true,
  // 章の間を横切る太い曲線（スクロールで描かれる）
  strokeCurves: true,
  // 大きな文字が 1 語ずつ間隔を空けて広がる帯
  spreadWords: true,
  // 画面の枠の四隅の「＋」の印と，点つきの丸いボタン
  cornerMarks: true,
  // BusTimeApp の紹介ページで，録画の枠がスクロールで画面いっぱいに育つ
  growingReel: true,
} as const;
