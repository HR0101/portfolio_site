import {
  Boxes,
  Bus,
  Cast,
  Clapperboard,
  Disc3,
  Dumbbell,
  Inbox,
  Keyboard,
  LayoutDashboard,
  LayoutGrid,
  LockKeyhole,
  Map,
  NotebookPen,
  Radar,
  Server,
  type LucideIcon,
} from 'lucide-react';

// アプリが動作するプラットフォーム
export type AppPlatform = 'ios' | 'macos' | 'both';

// GitHub 上のリポジトリへの参照
export interface AppRepository {
  // リポジトリ名（GitHub 上の名称）
  name: string;
  // 補足ラベル（例: "iOS クライアント"）．2リポジトリ構成のアプリで使う
  role?: string;
}

// 紹介するアプリ 1 件分の定義
export interface SwiftApp {
  // 表示名
  name: string;
  // 対応プラットフォーム
  platform: AppPlatform;
  // 1 行のキャッチコピー
  tagline: string;
  // 詳細説明
  description: string;
  // 使用技術タグ
  tags: string[];
  // 公開・開発年（表示用の文字列）
  year: string;
  // カードのアイコン
  icon: LucideIcon;
  // 公式アプリアイコン（用意できる場合のみ．public からの絶対パス）
  imageSrc?: string;
  // 注目カードに表示する実際のアプリ画面
  screenshotSrc?: string;
  // スクリーンショットの内容を表す代替テキスト
  screenshotAlt?: string;
  // 縦長画面をカード内で切り抜く際の焦点位置
  screenshotPosition?: string;
  // カードヘッダーのグラデーション
  gradient: string;
  // 大きなカードで目立たせるかどうか
  featured: boolean;
  // 関連する GitHub リポジトリ（1〜2件）
  repositories: AppRepository[];
  // サイト内に専用の紹介ページがある場合のパス
  detailHref?: string;
}

// GitHub（HR0101）で公開している Swift 製アプリのカタログ．
// 2リポジトリで 1 プロダクトを構成するもの（サーバー＋クライアント等）はまとめて 1 件として扱う．
export const SWIFT_APPS: SwiftApp[] = [
  {
    name: 'Subghost',
    platform: 'macos',
    tagline: 'AI CLI のタスク状態を Mac のノッチで見張る常駐アプリ',
    description:
      'Claude Code / Codex CLI のフックイベントを受信し，実行中のタスクを「Working」「Done」の2状態でノッチに表示します．完了時はノッチ・通知・サウンドで知らせ，対象ターミナルへのジャンプや完了後のスリープにも対応．CLI へは一切送信しない監視専用の設計です．',
    tags: ['SwiftUI', 'macOS 14+', 'Hook 連携', 'ユーザー通知'],
    year: '2026',
    icon: Radar,
    imageSrc: '/projects/subghost.webp',
    gradient: 'from-violet-300 to-indigo-400',
    featured: true,
    repositories: [{ name: 'subghost' }],
    detailHref: '/apps/subghost',
  },
  {
    name: 'BusTimeApp',
    platform: 'ios',
    tagline: '「次に乗れる便」を最短の操作で示すバス時刻表アプリ',
    description:
      '時刻表を並べるのではなく，現在地・時間帯・前回の行き先・当日の残り便・土日祝・午前4時の運行日境界まで考慮して，いま見るべき経路と便だけを提示します．通知・Live Activity・ウィジェット・Siri が同じ時刻表と経路判断を共有しています．',
    tags: ['SwiftUI', 'WidgetKit', 'Live Activity', 'App Intents'],
    year: '2026',
    icon: Bus,
    imageSrc: '/projects/bustimeapp.webp',
    screenshotSrc: '/projects/bustimeapp-screens/home.png',
    screenshotAlt: 'BusTimeAppで次に乗れるバスを案内しているホーム画面',
    screenshotPosition: '50% 31%',
    gradient: 'from-sky-300 to-blue-400',
    featured: true,
    repositories: [{ name: 'BusTimeApp' }],
    detailHref: '/apps/bustimeapp',
  },
  {
    name: 'Fomura',
    platform: 'ios',
    tagline: 'カメラで骨格を推定し，筋トレのフォームを採点する',
    description:
      'MediaPipe（BlazePose）による33関節のリアルタイムトラッキングでレップを自動カウントし，関節角度や深度から種目ごとにスコアを算出します．ハプティクスと音声でその場でコーチングし，履歴と統計は SwiftData に蓄積されます．',
    tags: ['SwiftUI', 'AVFoundation', 'MediaPipe', 'SwiftData'],
    year: '2026',
    icon: Dumbbell,
    imageSrc: '/projects/fomura.webp',
    gradient: 'from-emerald-300 to-teal-400',
    featured: true,
    repositories: [{ name: 'Fomura' }],
  },
  {
    name: 'AllServerForMac × VideoPlayer',
    platform: 'both',
    tagline: '自宅の Mac を個人用メディアサーバーにする2アプリ構成',
    description:
      'Mac 側が HTTP 配信サーバー・ブラウザ UI・サムネイル自動生成を担い，iPhone 側は Bonjour でサーバーを自動検出して接続します．IP アドレスの手入力は不要で，6桁 PIN 認証とアクセスログにより，同一 Wi‑Fi 内でも安心して使えるようにしました．',
    tags: ['SwiftUI', 'Swifter', 'Bonjour', 'AVFoundation'],
    year: '2025 – 2026',
    icon: Server,
    imageSrc: '/projects/allserverformac.webp',
    screenshotSrc: '/projects/allserverformac-screens/main.png',
    screenshotAlt: 'AllServerForMacのサーバー待機状態を表示したホーム画面',
    screenshotPosition: '50% 45%',
    gradient: 'from-amber-300 to-orange-400',
    featured: true,
    repositories: [
      { name: 'AllServerForMac', role: 'macOS サーバー' },
      { name: 'VideoPlayer', role: 'iOS クライアント' },
    ],
  },
  {
    name: 'TeleDeck',
    platform: 'both',
    tagline: 'iPad を Mac の操作デッキに変えるリモートコントローラ',
    description:
      'iPad 側は自由に組み替えられるボタンパネル・キーボード・トラックパッド・各種クロックを備え，Mac 側は Bonjour で待ち受けてショートカット実行・ウィンドウ配置・クリップボード共有を代行します．ペアリングは QR コードとキーチェーン保存のトークンで行います．',
    tags: ['SwiftUI', 'Bonjour', 'Keychain', 'Accessibility API'],
    year: '2026',
    icon: LayoutDashboard,
    imageSrc: '/projects/teledeck.webp',
    screenshotSrc: '/projects/teledeck-screens/ipad-main.png',
    screenshotAlt: 'TeleDeckのMac接続手順を案内するiPad画面',
    screenshotPosition: '50% 44%',
    gradient: 'from-rose-300 to-pink-400',
    featured: true,
    repositories: [
      { name: 'TeleDeck', role: 'iPad / iOS' },
      { name: 'TeleDeckMac', role: 'macOS エージェント' },
    ],
  },
  {
    name: 'Tsumugi',
    platform: 'ios',
    tagline: '共有シートで保存した記事を，その場で要約・診断する',
    description:
      '共有シート（Share Extension）から保存した Web 記事に対し，要約・信頼度診断・情報の鮮度診断を自動で実行します．レーダーチャートや半減期グラフで判定根拠を可視化し，診断パイプラインはサーバーを持たず端末内で完結させました．',
    tags: ['SwiftUI', 'Share Extension', '端末内解析'],
    year: '2026',
    icon: NotebookPen,
    imageSrc: '/projects/tsumugi.webp',
    screenshotSrc: '/projects/tsumugi-screens/item-summary.png',
    screenshotAlt: 'Tsumugiが記事の要約と信頼度・鮮度を表示している画面',
    screenshotPosition: '50% 34%',
    gradient: 'from-cyan-300 to-sky-400',
    featured: true,
    repositories: [{ name: 'Tsumugi' }],
    detailHref: '/apps/tsumugi',
  },
  {
    name: 'MenuDock',
    platform: 'macos',
    tagline: 'メニューバーから常用アプリを一発で起動するランチャー',
    description:
      'Dock を探す手間を省き，よく使うアプリをメニューバーの一箇所にまとめます．グローバルショートカットでどこからでも呼び出せ，半透明のガラス風 UI がライト・ダークどちらにもなじみます．',
    tags: ['SwiftUI', 'AppKit', 'macOS 14+'],
    year: '2026',
    icon: LayoutGrid,
    gradient: 'from-slate-300 to-slate-500',
    featured: false,
    repositories: [{ name: 'MenuDock' }],
  },
  {
    name: 'MyDock',
    platform: 'macos',
    tagline: 'Dock のアプリをフォルダにまとめるユーティリティ',
    description:
      'iOS のホーム画面フォルダのような「畳んで置く」体験を Dock に持ち込みます．グループアイコンをクリックすると内包アプリが展開し，Dock の配置方向（下・左・右）に追従してレイアウトが切り替わります．',
    tags: ['SwiftUI', 'AppKit', 'NSWorkspace'],
    year: '2026',
    icon: Boxes,
    gradient: 'from-indigo-300 to-violet-400',
    featured: false,
    repositories: [{ name: 'MyDock' }],
  },
  {
    name: 'BarPocket',
    platform: 'macos',
    tagline: 'メニューバーに常駐する一時ファイル置き場',
    description:
      'メニューバーのアイコンやウインドウにファイルをドラッグして一時的にストックし，必要なときに取り出せます．ドラッグで取り出すと消え，コピーなら残るという使い分けができ，専用フォルダに複製するため元ファイルを消しても安全です．',
    tags: ['SwiftUI', 'Drag & Drop', 'ログイン時起動'],
    year: '2026',
    icon: Inbox,
    gradient: 'from-teal-300 to-cyan-400',
    featured: false,
    repositories: [{ name: 'BarPocket' }],
  },
  {
    name: 'Glance × GlanceHost',
    platform: 'both',
    tagline: 'WebRTC で Mac の画面を iPhone に映して遠隔操作',
    description:
      'Mac 側で画面をキャプチャして WebRTC で低遅延に配信し，iPhone 側はトラックパッド風の操作面からマウス・キー入力を送り返します．シグナリングサーバーも自前で内蔵し，外部サービスなしに LAN 内で完結します．',
    tags: ['WebRTC', 'ScreenCaptureKit', 'SwiftUI'],
    year: '2026',
    icon: Cast,
    gradient: 'from-blue-300 to-indigo-400',
    featured: false,
    repositories: [
      { name: 'Glance', role: 'iOS ビューア' },
      { name: 'GlanceHost', role: 'macOS ホスト' },
    ],
  },
  {
    name: 'CIT-Campus-3D',
    platform: 'ios',
    tagline: 'キャンパスの3Dマップと時間割を1つにしたナビアプリ',
    description:
      '大学ポータルや manaba から時間割・課題・休講情報を取り込み，講義と建物を結びつけて次の教室まで案内します．学年暦や時限の情報をモデル化し，キャンパスを3Dで見ながら移動できることを目指しています．',
    tags: ['SwiftUI', 'MapKit', 'SwiftData', 'スクレイピング'],
    year: '2026',
    icon: Map,
    gradient: 'from-lime-300 to-emerald-400',
    featured: false,
    repositories: [{ name: 'CIT-Campus-3D' }],
  },
  {
    name: 'IntroDon',
    platform: 'both',
    tagline: 'レトロな UI で遊ぶイントロ当て音楽クイズ',
    description:
      'イントロを聴いて曲名を当てる音楽クイズアプリです．カタログの選択から出題・回答・採点までを一続きの流れにまとめ，レコードやカセットを思わせる UI で懐かしさのある体験に仕上げました．Mac 版も用意しています．',
    tags: ['SwiftUI', 'MusicKit', 'AVFoundation'],
    year: '2025 – 2026',
    icon: Disc3,
    gradient: 'from-amber-300 to-rose-300',
    featured: false,
    repositories: [
      { name: 'IntroDon', role: 'iOS' },
      { name: 'IntroDon-for-Mac', role: 'macOS' },
    ],
  },
  {
    name: 'PhotoVaultApp',
    platform: 'ios',
    tagline: '生体認証で守る写真・動画の金庫アプリ',
    description:
      '見られたくない写真や動画を，Face ID やパスコードでロックした専用の保管庫に隔離します．アルバム単位で整理でき，取り込んだメディアは端末内だけで完結して扱われます．',
    tags: ['SwiftUI', 'LocalAuthentication', 'FileManager'],
    year: '2025',
    icon: LockKeyhole,
    gradient: 'from-fuchsia-300 to-purple-400',
    featured: false,
    repositories: [{ name: 'PhotoVaultApp' }],
  },
  {
    name: 'VideoPlayer for Mac',
    platform: 'macos',
    tagline: '複数の動画を同時・同期再生できる Mac 用プレイヤー',
    description:
      '複数動画をグリッドに並べて同時に再生し，再生位置を同期できるプレイヤーです．サムネイル生成やスライドショー化，別端末からのリモート操作といった，普通のプレイヤーにない機能を積み上げています．',
    tags: ['SwiftUI', 'AVFoundation', 'Vision'],
    year: '2025 – 2026',
    icon: Clapperboard,
    gradient: 'from-orange-300 to-red-400',
    featured: false,
    repositories: [{ name: 'VideoPlayer-for-Mac' }],
  },
  {
    name: 'GymRoutineApp',
    platform: 'ios',
    tagline: '筋トレのメニューと記録を管理するトレーニングログ',
    description:
      '種目・重量・レップ数を素早く記録し，日々のトレーニングを振り返るためのアプリです．Fomura のフォーム評価に取り組む前段として，まず「記録する」体験を作り込みました．',
    tags: ['SwiftUI', 'MVVM', 'UserDefaults'],
    year: '2025',
    icon: Dumbbell,
    gradient: 'from-green-300 to-emerald-400',
    featured: false,
    repositories: [{ name: 'GymRoutineApp' }],
  },
  {
    name: 'WiFiKeyboard',
    platform: 'both',
    tagline: 'iPhone を Mac のワイヤレスキーボードにする2アプリ',
    description:
      'iPhone で打った文字やキー操作を LAN 経由で Mac に転送し，離れた場所から入力できるようにします．Mac 側はキーイベントを合成して実際の入力として反映させる，Glance へつながる最初の遠隔操作の実験でした．',
    tags: ['SwiftUI', 'Network.framework', 'CGEvent'],
    year: '2025',
    icon: Keyboard,
    gradient: 'from-sky-300 to-cyan-400',
    featured: false,
    repositories: [
      { name: 'WiFiKeyboard_iOS', role: 'iOS' },
      { name: 'WiFiKeyboard_Mac', role: 'macOS' },
    ],
  },
  {
    name: 'BusTime',
    platform: 'ios',
    tagline: 'BusTimeApp の原点となったシンプルな時刻表アプリ',
    description:
      '時刻表データから次の便を表示するだけの初期版です．ここで感じた「もっと迷わず乗りたい」という不足が，現在地や運行日境界まで踏まえて判断する BusTimeApp につながりました．',
    tags: ['SwiftUI', 'MVVM'],
    year: '2025',
    icon: Bus,
    gradient: 'from-slate-300 to-sky-500',
    featured: false,
    repositories: [{ name: 'BusTime' }],
  },
];

// プラットフォーム絞り込みタブの定義
export interface PlatformFilter {
  // 絞り込みの識別子（'all' はすべて表示）
  id: AppPlatform | 'all';
  label: string;
}

export const PLATFORM_FILTERS: PlatformFilter[] = [
  { id: 'all', label: 'すべて' },
  { id: 'ios', label: 'iPhone / iPad' },
  { id: 'macos', label: 'Mac' },
];

// プラットフォーム表示用のラベル
export const PLATFORM_LABELS: Record<AppPlatform, string> = {
  ios: 'iOS',
  macos: 'macOS',
  both: 'iOS + macOS',
};

// 絞り込み条件にアプリが一致するかを判定する．
// 'both'（両対応）のアプリは iOS / macOS どちらの絞り込みでも表示する．
export function matchesPlatform(app: SwiftApp, filterId: AppPlatform | 'all'): boolean {
  if (filterId === 'all') {
    return true;
  }
  return app.platform === filterId || app.platform === 'both';
}

// GitHub リポジトリの URL を組み立てる
export function buildRepositoryUrl(githubUsername: string, repositoryName: string): string {
  return `https://github.com/${githubUsername}/${repositoryName}`;
}

// リポジトリ名 → アプリのキャッチコピーの対応表．
// GitHub 側に description が無いリポジトリの説明を補うために使う．
const TAGLINE_BY_REPOSITORY: Record<string, string> = SWIFT_APPS.reduce(
  (map, app) => {
    app.repositories.forEach((repository) => {
      map[repository.name.toLowerCase()] = app.tagline;
    });
    return map;
  },
  {} as Record<string, string>,
);

// リポジトリ名からキャッチコピーを取得する（該当が無ければ undefined）
export function findTaglineByRepository(repositoryName: string): string | undefined {
  return TAGLINE_BY_REPOSITORY[repositoryName.toLowerCase()];
}
