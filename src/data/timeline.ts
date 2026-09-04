// GitHub 上のリポジトリ作成時期をもとにした，アプリ開発の年表．
// Apps セクションでスクロールに連動して線が伸びる演出に使う．

export interface TimelineMilestone {
  // 時期の表示（例: '2025.06'）
  period: string;
  // その時期の見出し
  title: string;
  // 何をしていたかの説明
  description: string;
  // 関連するアプリ名（カード内にタグとして並べる）
  apps: string[];
}

export const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    period: '2025.06',
    title: '最初のアプリを公開',
    description:
      '毎日使うバスの時刻表をアプリにしたのが出発点です．SwiftUI と MVVM の基本を，動くものをつくりながら覚えました．',
    apps: ['BusTime'],
  },
  {
    period: '2025.10',
    title: 'iPhone と Mac をつなぐ',
    description:
      'LAN 越しに iPhone から Mac を操作する実験を始めました．同じ時期に，生体認証で守る写真の保管庫もつくっています．',
    apps: ['WiFiKeyboard', 'PhotoVaultApp'],
  },
  {
    period: '2025.11 – 12',
    title: '「遊べるUI」に挑戦',
    description:
      'レコード風の UI で遊ぶイントロクイズや，トレーニング記録アプリを制作．体験そのものを設計する意識が芽生えました．',
    apps: ['IntroDon', 'GymRoutineApp'],
  },
  {
    period: '2026.04 – 06',
    title: 'macOS ユーティリティ期',
    description:
      'Bonjour での自動検出，WebRTC の画面共有，メニューバー常駐など，Mac ならではの仕組みを掘り下げた時期です．',
    apps: ['VideoPlayer', 'Glance × GlanceHost', 'BarPocket', 'MenuDock', 'CIT-Campus-3D'],
  },
  {
    period: '2026.07',
    title: 'カメラと遠隔操作',
    description:
      '骨格推定でフォームを採点する Fomura と，iPad を Mac の操作卓にする TeleDeck．端末をまたぐ体験づくりに踏み込みました．',
    apps: ['Fomura', 'TeleDeck', 'MyDock'],
  },
  {
    period: '2026.08 – 09',
    title: '日常に溶け込む常駐アプリへ',
    description:
      'ノッチで AI CLI を見張る Subghost，通知とウィジェットまで作り込んだ BusTimeApp，記事を端末内で診断する Tsumugi．',
    apps: ['Subghost', 'BusTimeApp', 'Tsumugi', 'AllServerForMac'],
  },
];
