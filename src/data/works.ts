// Swift 以外でつくった Web サービスとゲームのカタログ．
// サイト内に紹介ページを持つものは detailHref を設定すると，sitemap と ⌘K の操作パネルにも自動で並ぶ．

export type WorkKind = 'web' | 'game';

export interface Work {
  // 識別子（アンカーや key に使う）
  id: string;
  name: string;
  // 英字の読み（見出しの小さな添え字）
  latinName: string;
  kind: WorkKind;
  tagline: string;
  description: string;
  tags: string[];
  year: string;
  // 公開 URL
  url: string;
  // 表示用のホスト名
  host: string;
  // アイコン画像（public からの絶対パス）
  iconSrc: string;
  // 実際の画面を撮影したもの
  screenshotSrc: string;
  screenshotAlt: string;
  // 撮影画面の縦横比（幅 / 高さ）
  screenshotAspect: number;
  // カードの差し色
  accent: string;
  // 押さえておきたい特徴（3つ程度）
  highlights: string[];
  // 公開している GitHub のリポジトリ名（非公開のものは持たない）
  repository?: string;
  // 注意書き（年齢の目安など）
  notice?: string;
  // サイト内の紹介ページ
  detailHref?: string;
}

export const WEB_WORKS: Work[] = [
  {
    id: 'ekihub',
    name: 'EkiHub',
    latinName: 'EKIHUB',
    kind: 'web',
    tagline: 'みんなの最寄駅から，全員が集まりやすい中心駅を探す',
    description:
      '複数人の最寄駅を入れると，地図上の真ん中ではなく，鉄道網に沿った移動時間の公平さで集合駅をランキングします．全国約8,200駅に対応し，運賃の目安・候補駅の比較・共有・周辺スポット・運行情報までひとつの画面で扱えます．',
    tags: ['Next.js', 'TypeScript', 'React', 'Leaflet', 'OpenStreetMap'],
    year: '2026',
    url: 'https://ekihub.jp/',
    host: 'ekihub.jp',
    iconSrc: '/projects/works/ekihub.svg',
    screenshotSrc: '/projects/ekihub-screens/result-card.webp',
    screenshotAlt: 'EkiHubで東京・川崎・船橋の3駅から中心駅として新木場が提案された結果画面',
    screenshotAspect: 840 / 1054,
    accent: '#2fd3b5',
    highlights: ['全国 約8,200駅', '4言語・8テーマ', '共有URL・QR'],
    repository: 'EkiHub',
    detailHref: '/apps/ekihub',
  },
];

export const GAME_WORKS: Work[] = [
  {
    id: 'pitto-mart',
    name: 'ピッとマート',
    latinName: 'PITTO MART',
    kind: 'game',
    tagline: 'コンビニの「ちょっとした仕事」を遊ぶ，10本のミニゲーム',
    description:
      'ソフトクリームを巻く，袋に詰める，おにぎりを開ける，おでんをよそう．誰もが一度は見たことのあるコンビニの手仕事を，3D の手ざわりで遊べるようにしました．1本数十秒，ブラウザを開けばすぐ遊べます．',
    tags: ['TypeScript', 'Three.js', 'cannon-es', 'Blender'],
    year: '2026',
    url: 'https://games.hr0101.dev/',
    host: 'games.hr0101.dev',
    iconSrc: '/projects/works/pittomart.svg',
    screenshotSrc: '/projects/works/pittomart-softcream.webp',
    screenshotAlt: 'ピッとマートの「限界ソフト」で，ソフトクリームを巻く前の画面',
    screenshotAspect: 840 / 479,
    accent: '#47735b',
    highlights: ['10本のミニゲーム', '3D・物理演算', 'スマホでも遊べる'],
  },
  {
    id: 'curious-zoo',
    name: 'ふしぎなどうぶつえん',
    latinName: 'THE CURIOUS ZOO',
    kind: 'game',
    tagline: 'うーちゃんが，まってるよ．かわいい顔をした2D探索ホラー',
    description:
      '閉園まぎわの動物園を，うさぎの案内で歩く縦画面のドット絵ホラーです．全12ステージ・5つのエンド，動物の前で答える「こころのどうぶつ診断」が結末を変えます．びっくり演出は設定ひとつで弱められます．',
    tags: ['TypeScript', 'Canvas', 'Vite', 'ピクセルアート'],
    year: '2026',
    url: 'https://horror.hr0101.dev/',
    host: 'horror.hr0101.dev',
    iconSrc: '/projects/works/curious-zoo.webp',
    screenshotSrc: '/projects/works/curious-zoo-title.webp',
    screenshotAlt: 'ふしぎなどうぶつえんのタイトル画面．森の上からうさぎが顔を出している',
    screenshotAspect: 365 / 700,
    accent: '#56795f',
    highlights: ['全12ステージ・5エンド', '180×320 のドット絵', 'テスト175件'],
    notice: '15歳以上推奨・びっくり演出あり',
  },
];

// ピッとマートに並んでいる「お仕事」
export const PITTO_MART_JOBS: { job: string; title: string }[] = [
  { job: 'デザート', title: '限界ソフト' },
  { job: 'レジ', title: '袋詰め' },
  { job: '休憩中', title: 'おにぎり開封' },
  { job: 'レンジ', title: '弁当温めガチャ' },
  { job: '並ぶ', title: '次の方どうぞ' },
  { job: 'あったかい', title: 'おでんトング職人' },
  { job: 'ホットスナック', title: 'アメリカンドッグ' },
  { job: '運ぶ', title: 'カゴの限界' },
  { job: '棚を整える', title: '前陳日和' },
  { job: '小銭', title: 'じゃらじゃら会計' },
];

export const ALL_WORKS: Work[] = [...WEB_WORKS, ...GAME_WORKS];
