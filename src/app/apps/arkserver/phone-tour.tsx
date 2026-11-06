'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import {
  Check,
  Pause,
  Flame,
  Layers,
  LayoutGrid,
  Lock,
  Play,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { TOUR_INTERVAL_MS, useAutoTour } from './use-auto-tour';
import styles from './product.module.css';
import { MotionTabs } from '../../../components/MotionTabs';

interface PhoneScreen {
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

// 画像の実寸（iPhone 17 Pro のシミュレータの画面を，幅840へ縮めたもの）
const IMAGE_WIDTH = 840;
const IMAGE_HEIGHT = 1827;
const IMAGE_DIR = '/projects/arkserver-screens';

// 初めて繋ぐところから，見る・操作するところまでを，使う順に並べる
const SCREENS: PhoneScreen[] = [
  {
    id: 'lock',
    tab: 'PIN を入れる',
    step: '01 / PIN',
    icon: Lock,
    title: '初めての接続は，PIN から．',
    copy: 'PIN が必要なサーバーに繋ぐと，鍵のかかった画面で止まります．Mac のホーム画面に出ている6桁の番号を入れると，ライブラリが開きます．',
    points: [
      ['IP アドレスは入れない', '同じ Wi‑Fi の Mac は，アプリが自動で見つけます．'],
      ['PIN は端末が覚える', '一度入れれば，次からは入力を求められません．'],
    ],
    image: 'ios-lock',
    alt: 'iPhone アプリのアルバム画面．サーバーの欄に「このサーバーは保護されています」と表示され，「PIN を入力」のボタンがある',
  },
  {
    id: 'albums',
    tab: 'アルバム',
    step: '02 / ALBUMS',
    icon: LayoutGrid,
    title: 'Mac のライブラリが，そのまま並ぶ．',
    copy: '上に iPhone 自身のライブラリ，その下に Mac のサーバーが並びます．サーバー名の横には「オンライン」の表示が出ます．',
    points: [
      ['お気に入りと履歴', 'お気に入り・お気に入りショート・再生履歴を，ひと目で開けます．'],
      ['表紙つきのカード', 'ALL VIDEOS・ALL PHOTOS と，Mac で作ったアルバムが，表紙と本数つきで並びます．'],
    ],
    image: 'ios-albums',
    alt: 'iPhone アプリのアルバム画面．Mac Media Server がオンラインで，お気に入り・お気に入りショート・再生履歴・ALL PHOTOS のカードが並ぶ',
  },
  {
    id: 'home',
    tab: 'ホーム',
    step: '03 / HOME',
    icon: Smartphone,
    title: '一覧のなかで，動画がそのまま流れる．',
    copy: '大きなサムネイルを縦に並べたフィードです．画面に入った動画は，一覧の中でそのまま再生されます．',
    points: [
      ['音の入り切り', '再生中の動画の右上のボタンで，音を出したり消したりできます．'],
      ['ショートの棚', '縦動画は，合間に挟まる「おすすめショート」で見られます．'],
    ],
    image: 'ios-home',
    alt: 'iPhone アプリのホーム画面．朝焼けのオーロラの動画が大きく再生され，その下にセルオートマトンの動画が並ぶ',
  },
  {
    id: 'variants',
    tab: '差分を探す',
    step: '04 / VARIANTS',
    icon: Layers,
    title: '差分の判定は Mac．結果は手元で．',
    copy: 'アルバムのメニューから「差分動画を探す」を選ぶと，絵だけが違う動画の束が出ます．判定そのものは，実ファイルを持つ Mac が行います．',
    points: [
      ['根拠の数字つき', '束ごとに本数・長さ・絵の差（ここでは 1.7〜1.8）を表示します．'],
      ['4本まで同時に', '無線越しに受け取るため，切り替え再生は4本までです（Mac は最大9本）．'],
    ],
    image: 'ios-variants',
    alt: 'iPhone アプリの「差分動画を探す」画面．朝焼けのオーロラ（青・桃・緑）の3本が1つの束になり，「切り替え再生（3本）」のボタンがある',
  },
  {
    id: 'player',
    tab: 'プレイヤー',
    step: '05 / PLAYER',
    icon: Play,
    title: '10等分のサムネイルで，見たい場面へ．',
    copy: '動画の下に，10等分した位置のサムネイルが並びます．押した場所から再生できます．',
    points: [
      ['再生の設定', 'シャッフル・リピート・スライドショーのボタンと，お気に入りの印があります．'],
      ['画質を選べる', '元の画質のほか，1080p の軽量版に切り替えられます．軽量版は，Mac がその場で作ります．'],
    ],
    image: 'ios-player',
    alt: 'iPhone アプリの再生画面．動画の下に10等分のサムネイル，シークバー，シャッフル・リピートなどのボタン，再生中の他の動画の一覧がある',
  },
  {
    id: 'remote',
    tab: 'リモコン',
    step: '06 / REMOTE',
    icon: Flame,
    title: 'Mac の再生を，手元で操作する．',
    copy: 'リモコンのタブは，この Mac で再生している動画を操作する画面です．「Mac で再生中」と，動画の題名が出ます．',
    points: [
      ['ひと通りの操作', '再生・一時停止・10秒の送り戻し・シーク・音量・前後の動画．'],
      ['場面から移動', '10等分のサムネイルを押すと，Mac の再生がその位置へ飛びます．'],
    ],
    image: 'ios-remote',
    alt: 'iPhone アプリのリモコン画面．「Mac で再生中」の題名とシークバー，再生・10秒送り戻し・音量のボタン，「Mac のプレイヤーを閉じる」のボタンがある',
  },
];

export function PhoneTour() {
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
      <MotionTabs activeKey={active} className={styles.tourTabs} role="tablist" aria-label="VideoPlayer（iPhone）の画面を選ぶ">
        {SCREENS.map((screen, index) => (
          <button
            key={screen.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`ark-ios-tab-${screen.id}`}
            aria-selected={index === active}
            aria-controls={`ark-ios-panel-${screen.id}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {screen.tab}
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
            id={`ark-ios-panel-${screen.id}`}
            role="tabpanel"
            aria-labelledby={`ark-ios-tab-${screen.id}`}
            hidden={index !== active}
            data-dir={direction}
            tabIndex={0}
            className={`${styles.tourPanel} ${styles.phonePanel}`}
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
              <div className={`${styles.stage} ${styles.phoneStage}`}>
                <div className={styles.phoneFrame}>
                  <img
                    src={`${IMAGE_DIR}/${screen.image}.webp`}
                    alt={screen.alt}
                    width={IMAGE_WIDTH}
                    height={IMAGE_HEIGHT}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
              </div>
              <figcaption>実際の画面（iPhone 17 Pro のシミュレータで，撮影用の合成映像を表示．2026年10月）</figcaption>
            </figure>
          </div>
        );
      })}
    </div>
  );
}
