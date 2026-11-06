import {
  AudioWaveform,
  Blend,
  Bookmark,
  Captions,
  Cast,
  Clapperboard,
  Columns3,
  Copy,
  Eye,
  Fingerprint,
  FileOutput,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Gauge,
  GalleryHorizontal,
  Grid2x2,
  Heart,
  Image as ImageIcon,
  Keyboard,
  Layers,
  Link2,
  ListChecks,
  MonitorOff,
  Pencil,
  PictureInPicture2,
  Play,
  Presentation,
  Save,
  ScanSearch,
  Search,
  Settings2,
  Share2,
  Shuffle,
  Smartphone,
  SquarePlus,
  Timer,
  Trash2,
  Tv,
  Upload,
  Volume1,
  Volume2,
  type LucideIcon,
} from 'lucide-react';

// ツアーに載せきれなかった機能．分野ごとに，アイコン・短い名前・説明を持つ
export interface MoreItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface MoreGroup {
  id: string;
  icon: LucideIcon;
  title: string;
  lead: string;
  items: MoreItem[];
}

export const MORE_GROUPS: MoreGroup[] = [
  {
    id: 'playback',
    icon: Play,
    title: '再生まわり',
    lead: 'ふだんの視聴を，細かなところまで整えています．',
    items: [
      { icon: Captions, title: '字幕と音声トラック', text: '字幕は1本でもあれば「オフ」つきで，音声は2本以上あるときに，再生設定のメニューへ出ます．' },
      { icon: PictureInPicture2, title: 'ピクチャインピクチャ', text: 'P キーで，ほかのアプリの前面に浮かぶ小窓へ．プレイヤーを閉じると，小窓も畳みます．' },
      { icon: Volume2, title: 'メディアキーに対応', text: 'F8 などの再生キー，コントロールセンター，メニューバーの再生中表示から操作できます．' },
      { icon: GalleryHorizontal, title: 'シークバーのプレビュー', text: 'シークバーをなぞると，その位置のフレームと時刻が上に出ます．' },
      { icon: MonitorOff, title: '黒画面の自動スキップ', text: 'リピート再生のとき，冒頭と末尾の黒画面を解析して飛ばします．元の動画は書き換えません．' },
      { icon: Keyboard, title: 'キーボード操作', text: 'シャッフル・リピート・速度・ミュート・お気に入り・コマ送りなどにキーを割り当て，設定で変えられます．' },
    ],
  },
  {
    id: 'fun',
    icon: Shuffle,
    title: 'お楽しみ再生',
    lead: '見る動画を決めないまま，流して見つける再生のしかたです．',
    items: [
      { icon: Tv, title: 'マイチャンネル', text: '動画のあるアルバムをチャンネルに見立て，上下キーで切り替えながら流し見できます．' },
      { icon: Blend, title: '気分でミックス', text: '「短く楽しむ」「未視聴を発掘」「お気に入り中心」の3種類．表示中の一覧から選び，一巡したら止まります．' },
      { icon: Timer, title: '時間ぴったり再生', text: '5・10・15・30分から選ぶと，最後の区間を縮めて，再生時間の合計が合うように組みます．' },
      { icon: Bookmark, title: '場面ストック', text: '⌘B で，いまの位置の前後10秒を保存．動画を切り出さずに，保存した場面だけをシャッフルして見返せます．' },
      { icon: Eye, title: 'プレビュー巡回', text: '15秒か30秒ずつ，ランダムな位置から試し見．気に入ったら「このまま見る」で通常再生へ切り替わります．' },
      { icon: Shuffle, title: 'シーンシャッフル', text: 'シーン抽出で「採用」にした区間だけを，動画をまたいで流します．採用した区間は，次の起動後も残ります．' },
    ],
  },
  {
    id: 'views',
    icon: Clapperboard,
    title: 'いろいろな見方',
    lead: '1本ずつ見る以外の，再生と表示の形です．',
    items: [
      { icon: Grid2x2, title: '同時再生', text: '選んだ2〜9本をグリッドに並べ，共通のスライダーとキーボードで，完全に同期して再生します．' },
      { icon: Columns3, title: '分割再生', text: '1本の動画をいくつかに分けて並べ，全体のシークバーで同期して操作できます．' },
      { icon: Presentation, title: 'スライドショー', text: '選んだ複数の動画を指定した秒数ずつ切り出し，1本としてつなげて再生．クリップごとのチャプターから飛べます．' },
      { icon: ImageIcon, title: '写真ビューア', text: '画像をウィンドウ全体に表示．左右のクリックや矢印キーで進み，漫画モードでは送る向きが反転します．' },
      { icon: Search, title: 'クイックルック', text: '一覧で動画を選んで Space．Finder と同じ小さなパネルで，その場で中身を確かめられます．' },
      { icon: Smartphone, title: '遠隔での操作', text: 'iPhone アプリのリモコンから，この Mac の再生を操作できます．再生・一時停止・10秒の送り戻し・シーク・音量・前後の動画に対応します．' },
    ],
  },
  {
    id: 'organize',
    icon: FolderOpen,
    title: '整理まわり',
    lead: '増えていくライブラリを，散らからないように保ちます．',
    items: [
      { icon: Copy, title: '重複チェック', text: 'ファイルの中身が完全に一致する動画を，タイトルが違っても見つけて整理します．' },
      { icon: ScanSearch, title: '似ているものを探す', text: '書き出し直しや解像度違いなど，見た目の近い動画を探します．別物のこともあるので，目で確かめてから消します．' },
      { icon: Pencil, title: 'スケッチ整理', text: '画像アルバムから，ラフ画や線画らしいものを集めます．自動判定には外れもあるので，目で確かめてから一括で削除します．' },
      { icon: Link2, title: 'リンクフォルダ', text: '元のフォルダを参照するだけにも，アプリ内へコピーする形にもできます．フォルダの変更は，ボタンで取り込みます．' },
      { icon: FileOutput, title: '書き出し', text: '選んだメディアやアルバム，フォルダを，階層とファイル名を保ったまま好きな場所へ書き出せます．' },
      { icon: FolderInput, title: 'フォルダにまとめる', text: 'アルバムを複数選んで新しいフォルダへまとめ，ドラッグ＆ドロップで移動できます．' },
      { icon: Trash2, title: 'ゴミ箱の自動削除', text: 'ゴミ箱に入れてから何日で消すかを，なし・30日・90日から選べます．' },
    ],
  },
  {
    id: 'analysis',
    icon: ScanSearch,
    title: '解析まわり',
    lead: '差分とシーンの機能を，使い込めるように．',
    items: [
      { icon: Layers, title: '尺が違う動画の部分一致', text: '先頭の位置が違う動画や，途中にカットが挟まった動画でも，共通する場面を見つけて切り替え再生できます．' },
      { icon: ListChecks, title: '見比べて消す', text: '切り替え再生のまま，同じだと気づいた動画に印を付けて削除できます．残りは，見ていた位置から続きます．' },
      { icon: Fingerprint, title: '特徴の使い回し', text: '動画ごとの特徴は保存して使い回すので，探し直しても待たされません．アプリを再起動しても効きます．' },
      { icon: AudioWaveform, title: '拍の解析', text: 'BGM の拍を推定し，BPM と解析の信頼度を表示します．切り替えの速さは，1/4拍から32拍まで選べます．' },
      { icon: Volume1, title: 'BGM 音量を揃える', text: '動画ごとの音量差を測り，大きいものを小さい方へ近づけます．小さい音を増幅することはしません．' },
      { icon: Clapperboard, title: 'クリップの書き出し', text: 'シーン抽出の候補を，H.264 か HEVC のクリップへ．書き出し中はキャンセルでき，途中のデータを完成品と取り違えません．' },
    ],
  },
  {
    id: 'delivery',
    icon: Cast,
    title: '配信・ブラウザまわり',
    lead: '外の端末から使うときの，ひと手間を省きます．',
    items: [
      { icon: Gauge, title: '1080p の軽量版', text: '選んだときだけその場で作り，見終わると自動で消します．ストレージを圧迫しません．' },
      { icon: Upload, title: 'ブラウザからアップロード', text: 'ファイルを画面へドラッグするだけ．拡張子とサイズは送る前に確かめ，進み具合も出ます．' },
      { icon: FolderPlus, title: '移動とアルバム作成', text: 'ブラウザから，動画の移動や追加，新しいアルバムの作成までできます．' },
      { icon: Share2, title: '共有リンク', text: '動画ごとのリンクを開くと，その動画がそのまま再生されます．' },
      { icon: SquarePlus, title: 'ホーム画面に追加', text: 'ブラウザ用の画面は，ホーム画面へ追加するとアプリのように全画面で開きます．' },
      { icon: Save, title: '再生の設定を覚える', text: '自動再生・リピート・シャッフル・速度・音量を，次回以降も引き継ぎます．' },
      { icon: Heart, title: 'お気に入りは共通', text: 'Mac・iPhone・ブラウザのお気に入りを，1つの保管庫でそろえます．' },
      { icon: Settings2, title: '性能の調整', text: '取り込みの並列数・サムネイルのキャッシュ上限・アップロードの上限・重複チェックの間隔などを，設定で調整できます．' },
    ],
  },
];

// 全分野を合わせた機能の数（数字の帯とタイルの見出しで使う）
export const MORE_TOTAL = MORE_GROUPS.reduce((total, group) => total + group.items.length, 0);
