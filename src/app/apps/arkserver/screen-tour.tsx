'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import {
  AudioWaveform,
  Anchor,
  Check,
  LifeBuoy,
  Pause,
  Film,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Play,
  ScanSearch,
  Shuffle,
  type LucideIcon,
} from 'lucide-react';
import { TOUR_INTERVAL_MS, useAutoTour } from './use-auto-tour';
import styles from './product.module.css';
import { MotionTabs } from '../../../components/MotionTabs';
import { TourCallouts } from './tour-callouts';

interface TourScreen {
  id: string;
  tab: string;
  step: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  points: [string, string][];
  // public/projects/arkserver-screens/ 配下の画像名（拡張子なし）
  image: string;
  alt: string;
}

// 画像の実寸（すべて Mac のウインドウを幅840へ縮めたもの）
const IMAGE_DIR = '/projects/arkserver-screens';

// アプリを開いてから使う順に並べる
const SCREENS: TourScreen[] = [
  {
    id: 'dashboard',
    tab: 'ダッシュボード',
    step: '01 / HOME',
    icon: LayoutDashboard,
    title: '「開始」を押して，QR を読み取るだけ．',
    copy: '同じ Wi‑Fi 内の端末から，動画と画像を見られるようになります．接続先の URL と QR コード，6桁の PIN が同じ画面に並びます．',
    points: [
      ['QR とアドレスで接続', 'スマホのカメラで読み取るとブラウザの接続先が開きます．iPhone アプリは，この Mac を自動で見つけます．'],
      ['PIN で守る', 'PIN 認証は必須にでき，番号はコピーも再生成もできます．ポート番号と自動停止タイマーは，サーバーを止めている間に変えられます．'],
    ],
    image: 'dashboard',
    alt: 'Ark Server のホーム画面．サーバーは配信中で，ブラウザの接続先と QR コード，接続 PIN，Mac の使用状況が並ぶ．接続先と QR はぼかしている',
  },
  {
    id: 'library',
    tab: 'ライブラリ',
    step: '02 / LIBRARY',
    icon: Film,
    title: '行き先は，常設のレールから一息に．',
    copy: '左端のナビゲーションレールに，ホーム・動画・画像・アルバム・お気に入り・続きを見る・再生履歴・ゴミ箱を並べました．件数はバッジで示します．',
    points: [
      ['アルバムは表紙つき', 'サイドバーの各行に，表紙と「動画 3本 · 2分」のような要約を出します．'],
      ['並べ方を選べる', '並び順・サムネイルの時点・表示項目を選べ，列数はスライダーで変えられます．'],
    ],
    image: 'library',
    alt: 'すべての動画の一覧．色とりどりのサムネイルが5列で並び，左端にナビゲーションレール，その右にアルバムの一覧がある',
  },
  {
    id: 'albums',
    tab: 'アルバム',
    step: '03 / ALBUMS',
    icon: LayoutGrid,
    title: '表紙のカードで，アルバムを見渡す．',
    copy: '動画アルバムと画像アルバムを，中身の表紙を並べたカードで一覧します．ここから開いて，中の動画を見ていきます．',
    points: [
      ['絞り込みと並べ替え', '動画・画像の絞り込み，並び順の切り替え，名前での検索ができます．'],
      ['見たい範囲に寄せる', '「フォルダの中も並べる」「空のアルバムを隠す」で，一覧を整えられます．'],
    ],
    image: 'albums',
    alt: 'アルバムの一覧．動画アルバム3つと画像アルバム1つが，4枚の表紙を並べたカードで表示されている',
  },
  {
    id: 'player',
    tab: 'プレイヤー',
    step: '04 / PLAYER',
    icon: Play,
    title: '操作は，動かしたときだけ現れる．',
    copy: 'シークバーとボタンは映像に重ねて表示し，カーソルをしばらく動かさなければ引っ込みます．映像が伸び縮みしません．',
    points: [
      ['下のバーで切り替え', 'シャッフル・リピート・お気に入り・画面いっぱい・ピクチャインピクチャ・再生速度を操作できます．'],
      ['続きから見られる', '途中でやめた動画は，iPhone やブラウザで見た分も含めて続きから再生できます．'],
    ],
    image: 'player',
    alt: '動画のプレイヤー．映像に重ねて，前へ・一時停止・次へ，シークバー，シャッフル，リピート，お気に入り，画面いっぱい，ピクチャインピクチャ，再生速度のボタンが並ぶ',
  },
  {
    id: 'fun',
    tab: 'お楽しみ再生',
    step: '05 / SHUFFLE',
    icon: Shuffle,
    title: '決めずに流して，見つける．',
    copy: 'ツールバーの「お楽しみ再生」から，見る動画を決めないまま始められます．',
    points: [
      ['気分で選ぶ', 'マイチャンネル・気分でミックス・時間ぴったり再生・ストックした場面の再生．'],
      ['試し見', 'プレビュー巡回は15秒か30秒ずつ．シーンシャッフルは，採用した区間だけを動画をまたいで流します．'],
    ],
    image: 'fun-menu',
    alt: 'お楽しみ再生のメニュー．マイチャンネル，気分でミックス，時間ぴったり再生，ストックした場面を再生，プレビュー巡回の15秒と30秒，シーンシャッフルが並ぶ',
  },
  {
    id: 'variant',
    tab: '差分を探す',
    step: '06 / VARIANTS',
    icon: Layers,
    title: '絵だけが違う動画を，束にする．',
    copy: '「差分動画を探す」は，尺が揃っていて絵だけが違う動画を1つの束にします．ここでは，色だけ違う3本をまとめた結果です．',
    points: [
      ['3段階で見分ける', '尺で絞り，フレームの特徴を突き合わせ，ファイル名の近さでしきい値を少しだけ調整します．'],
      ['根拠の数字つき', '各グループに，絵の差と名前の近さを表示します．スライダーで厳しさを変えられます．'],
    ],
    image: 'variant-finder',
    alt: '差分動画を探す画面．朝焼けのオーロラ（青・桃・緑）の3本が1グループにまとまり，絵の差1.7〜1.8，名前の近さ0.82と表示されている',
  },
  {
    id: 'switch',
    tab: '切り替え再生',
    step: '07 / SWITCH',
    icon: AudioWaveform,
    title: '同じ時間を流したまま，絵だけ入れ替える．',
    copy: '選んだ動画を同じ時計で同時に走らせ，見せる1本だけを切り替えます．継ぎ目もシークもありません．',
    points: [
      ['自動と手動', '間隔の範囲を決めてランダムに切り替えるほか，Q・W・E などのキーでも切り替えられます．'],
      ['BGM に合わせる', 'オンにすると，音の拍に合わせて切り替えます．切り替え時の音量差を抑える設定もあります．'],
    ],
    image: 'variant-player',
    alt: '切り替え再生の画面．3本の動画を表すQ・W・Eのボタン，自動切り替え，間隔3.0〜6.0秒，BGMの拍に合わせる，BGM音量を揃えるの設定が下に並ぶ',
  },
  {
    id: 'scene',
    tab: 'シーン抽出',
    step: '08 / SCENES',
    icon: ScanSearch,
    title: '見どころの候補を出して，1・2・3で仕分ける．',
    copy: '動画を1本選んで「候補を解析」を押すと，音声と映像の変化から候補の区間を見つけます．撮影では，カットをつないだ42秒の合成映像を使いました．',
    points: [
      ['採用・保留・却下', 'キー 1・2・3 で判定すると，次の候補へ進んで再生が始まります．タイムライン上では，採用が緑，保留が黄で示されます．'],
      ['クリップとして書き出す', 'ComfyUI の入力フォルダを選び，候補の区間を動画として，解析結果は JSON・CSV として書き出せます．'],
    ],
    image: 'scene',
    alt: 'シーン抽出の画面．解析は100%完了し，3つの候補のうち2つを判定済み．タイムラインでは採用の区間が緑，保留の区間が黄で示されている',
  },
];

// 画面名に添える機能の要約
const SCREEN_SUMMARIES: Record<string, string> = {
  dashboard: '配信の開始・接続設定',
  library: '動画の一覧',
  albums: 'アルバムの一覧',
  player: '動画の再生',
  fun: '再生方法を選ぶ',
  variant: '差分動画の検索',
  switch: '動画の切り替え',
  scene: '見どころの解析',
};

export function ScreenTour() {
  const { rootRef, active, direction, isPlaying, autoEnabled, canAutoPlay, select, toggleAuto, holdProps } = useAutoTour(SCREENS.length);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // タブを切り替えた瞬間に枠だけが見える状態を避けるため，余裕のあるときに残りの画面も読み込んでおく
  useEffect(() => {
    const preload = () => {
      SCREENS.forEach((screen) => {
        const image = new Image();
        image.src = `${IMAGE_DIR}/${screen.image}.webp`;
      });
    };
    const idle = window.requestIdleCallback;
    if (typeof idle === 'function') {
      const handle = idle(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // WAI-ARIA のタブパターン（←→・Home・End で移動する）
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % SCREENS.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + SCREENS.length) % SCREENS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = SCREENS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div
      ref={rootRef}
      className={styles.tour}
      style={{ ['--tour-interval' as string]: `${TOUR_INTERVAL_MS}ms` }}
      {...holdProps}
    >
      <div className={styles.tourBar}>
      {/* 船の断面図．部屋が，そのままタブになっている（←→・Home・End でも移動できる） */}
      <MotionTabs activeKey={active} className={styles.cutaway} role="tablist" aria-label="Ark Server の画面を選ぶ">
        <span className={styles.cutawayMast} aria-hidden="true" />
        <span className={styles.cutawayBow} aria-hidden="true">
          <LifeBuoy size={30} />
        </span>
        <span className={styles.cutawayStern} aria-hidden="true">
          <Anchor size={30} />
        </span>
        {SCREENS.map((screen, index) => (
          <button
            key={screen.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`ark-tab-${screen.id}`}
            aria-selected={index === active}
            aria-controls={`ark-panel-${screen.id}`}
            tabIndex={index === active ? 0 : -1}
            className={styles.room}
            style={{ gridArea: screen.id }}
            onClick={() => select(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className={styles.roomIcon} aria-hidden="true">
              <screen.icon size={18} />
            </span>
            <span className={styles.roomText}>
              <em aria-hidden="true">{String(index + 1).padStart(2, '0')}</em>
              <strong>{screen.tab}</strong>
              <small>{SCREEN_SUMMARIES[screen.id]}</small>
            </span>
            {index === active && isPlaying && <i className={styles.tabProgress} aria-hidden="true" />}
          </button>
        ))}
      </MotionTabs>
      {canAutoPlay && (
        <button type="button" className={styles.tourAuto} aria-pressed={autoEnabled} onClick={toggleAuto}>
          {autoEnabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {autoEnabled ? '自動再生を止める' : '自動再生する'}
        </button>
      )}
      </div>

      {SCREENS.map((screen, index) => {
        const Icon = screen.icon;
        return (
          <div
            key={screen.id}
            id={`ark-panel-${screen.id}`}
            role="tabpanel"
            aria-labelledby={`ark-tab-${screen.id}`}
            hidden={index !== active}
            data-dir={direction}
            tabIndex={0}
            className={styles.tourPanel}
          >
            <div className={styles.tourCopy}>
              <span className={styles.tourStep}>{screen.step}</span>
              <h3>
                <Icon size={24} aria-hidden="true" /> {screen.title.replace(/．$/, '')}
              </h3>
              <p>{screen.copy}</p>
              <ul className={styles.tourPoints}>
                {screen.points.map(([title, description]) => (
                  <li key={title}>
                    <Check size={17} aria-hidden="true" />
                    <span>
                      <strong>{title}</strong>
                      {description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <figure className={styles.tourShot}>
              <div className={styles.stage}>
                <div className={styles.annotatedStage}>
                <img src={`${IMAGE_DIR}/${screen.image}.webp`} alt={screen.alt} width={840} height={525} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
                {screen.id === 'dashboard' && <TourCallouts active={index === active} running={isPlaying} />}
                </div>
              </div>
              <figcaption>実際の画面（撮影用に作った合成映像を取り込んで撮影．2026年10月）</figcaption>
            </figure>
          </div>
        );
      })}
    </div>
  );
}
