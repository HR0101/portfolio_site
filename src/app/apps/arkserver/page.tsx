import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  DatabaseBackup,
  Copy,
  HardDrive,
  Radio,
  ScrollText,
  ShieldCheck,
  Trash2,
  Wifi,
} from 'lucide-react';
import { ProductMotion } from '../../../components/ProductMotion';
import { RollingNumber } from '../../../components/RollingNumber';
import { GitHubIcon } from '../../../components/icons/GitHubIcon';
import { siteConfig } from '../../../config/site';
import { buildRepositoryUrl } from '../../../data/apps';
import { HowFlow } from './how-flow';
import { MiniDemos } from './mini-demos';
import { MORE_TOTAL } from './more-data';
import { MoreGrid } from './more-grid';
import { PhoneTour } from './phone-tour';
import { ScreenTour } from './screen-tour';
import { SCREEN_DIR, SCREENSHOT_WIDTH, MAC_SCREENSHOT_HEIGHT } from './screen-assets';
import styles from './product.module.css';
import { CareDiagram } from './care-diagram';
import { TechTimeline } from './tech-timeline';
import { BrowserPreview } from './browser-preview';
import { AppearanceWipe } from './appearance-wipe';

const description =
  'Ark Server（アーク サーバー）は，Mac に保存した動画と写真を，同じ Wi‑Fi の iPhone やブラウザで見られるメディアサーバーです．6桁の PIN と3世代のバックアップで守ります．ダッシュボードからライブラリ，お楽しみ再生，差分切り替え，シーン抽出まで，実際の画面で紹介します．';

export const metadata: Metadata = {
  title: 'Ark Server — Mac の動画と写真を，iPhone やブラウザで．',
  description,
  alternates: { canonical: '/apps/arkserver' },
  openGraph: {
    title: 'Ark Server — Mac の動画と写真を，iPhone やブラウザで．',
    description,
    url: '/apps/arkserver',
    type: 'website',
  },
};

// GitHub のリポジトリ名（旧名 AllServerForMac から改名済み）．変えるときは，ここと data/apps.ts の repositories を直す
const ARK_REPOSITORY = 'ArkServer';

// ヒーローに添える，この Mac アプリの前提
const HERO_CHIPS = ['macOS 15.5 以降', '6桁の PIN で保護', 'Bonjour で自動検出'];

// ブラウザ用の画面の4つのタブ（アプリが配る画面の中身）
const BROWSER_TABS = [
  ['ホーム', '動画を並べたフィード．合間に，縦動画の「おすすめショート」の棚を挟みます．'],
  ['ショート', '全動画をシャッフルし，縦型のプレイヤーで1本ずつ送ります．'],
  ['続きを見る', '途中でやめた動画だけを，最後に見た順に並べます．'],
  ['アルバム', '履歴やお気に入りとアルバムを一覧し，アップロードや移動もできます．'],
];

// ヒーローの下に並べる「積載量」の数字（値は，ソースと README で確かめたもの）
const STATS = [
  { value: 9, unit: '本', label: '同時に再生（Mac）' },
  { value: 10, unit: '等分', label: 'サムネイルで頭出し' },
  { value: MORE_TOTAL, unit: '機能', label: 'ツアーのほかにも' },
  { value: 3, unit: '世代', label: '記録のバックアップ' },
  { value: 6, unit: '桁', label: 'PIN 認証' },
];

// 接続とデータの保護機能
const CARE = [
  {
    icon: ShieldCheck,
    title: '6桁の PIN',
    text: '接続には PIN を要求します．アクセスログでは，PIN を伏せて記録します．',
  },
  {
    icon: Wifi,
    title: '家の中だけで使う',
    text: '通信は平文の HTTP です．同じ Wi‑Fi の内側で使い，インターネットへ直接公開しない前提で作っています．',
  },
  {
    icon: DatabaseBackup,
    title: '記録の自動復元',
    text: 'ライブラリの記録が壊れても，空で上書きしません．壊れたファイルを退避し，3世代のバックアップから復元します．',
  },
  {
    icon: Copy,
    title: '二重起動の検出',
    text: '同じライブラリを2つのアプリが開くと，後から起動した側は保存せずに終了します．',
  },
  {
    icon: Trash2,
    title: '削除は選んでから',
    text: 'ゴミ箱に入れるか，完全に削除するかをその都度選びます．リンクした元のファイルには，明示しない限り触れません．',
  },
  {
    icon: HardDrive,
    title: 'ストレージ管理',
    text: '取り込んだメディアなどの容量を集計し，リンク切れの整理や，内容が同じ動画の検出ができます．',
  },
  {
    icon: ScrollText,
    title: 'アクセスログ',
    text: '直近のアクセスを，IP アドレス・メソッド・パス・認可の結果つきで確かめられます．',
  },
  {
    icon: Radio,
    title: '自動停止とスケジュール',
    text: '無操作で自動停止するタイマーと，毎日決まった時刻に起動・終了するスケジュールを設定できます．',
  },
];

// 使っている技術と，選んだ理由
const STACK = [
  ['アプリ本体', 'SwiftUI（macOS 15.5 以降）', '機能ごとの MVVM 構成．画面・状態・副作用を Features 配下で分けている．'],
  ['配信', 'Swifter（HTTP サーバー）', 'アルバム・動画・写真・サムネイルを配信し，ブラウザ用の画面も同じサーバーが返す．'],
  ['検出', 'Bonjour（_myvideoserver._tcp.）', 'iPhone アプリが LAN 内のこの Mac を自動で見つける．IP アドレスの手入力は不要．'],
  ['映像の処理', 'AVFoundation', 'サムネイルの生成，1080p の軽量版，ピクチャインピクチャ，複数動画の同期再生を担う．'],
  ['差分の判定', '知覚ハッシュ', '尺で絞った束の中で，同じ時刻のフレームの特徴を突き合わせる．'],
  ['常駐の仕組み', 'launchd ＋ pmset', 'スケジュール起動の登録とスリープからの起床に使うため，App Sandbox は無効にしている．'],
];

export default function ArkServerPage() {
  return (
    <article className={styles.page} data-product-page>
      <ProductMotion />
      <nav className={styles.localNav} aria-label="Ark Server ナビゲーション">
        <Link href="/#projects"><ArrowLeft size={16} aria-hidden="true" /> アプリの一覧</Link>
        <span>Ark Server <small>macOS / iOS / Web</small></span>
        <a href="#ark-screens">画面を見る <ArrowDown size={16} aria-hidden="true" /></a>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.appName} data-morph-title>
              <img data-morph-icon src="/projects/arkserver.svg" alt="" width={44} height={44} />
              <span>Ark Server</span>
            </div>
            <p className={styles.eyebrow}>自宅のメディアライブラリ</p>
            <h1>
              <span>Mac の動画と写真を，</span>
              <em>手元の端末で</em>
            </h1>
            <p className={styles.lead}>
              Mac に集めたライブラリを，<br />
              同じ Wi‑Fi の iPhone やブラウザへ．<br />
              整理も，再生も，自分の手元に．
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryLink} href="#ark-screens">
                画面を見る <ArrowDown size={18} aria-hidden="true" />
              </a>
              <a
                className={styles.secondaryLink}
                href={buildRepositoryUrl(siteConfig.githubUsername, ARK_REPOSITORY)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubIcon className="w-4 h-4" /> ソースコード
                <ArrowUpRight size={16} aria-hidden="true" />
                <span className="sr-only">（GitHub・新しいタブで開きます）</span>
              </a>
            </div>
          </div>

          <figure className={styles.heroStage} data-morph-surface>
            <div className={styles.libraryLabel}>
              <span>Mac / Ark Server</span>
              <span>ひとつのライブラリ</span>
            </div>
            <div className={styles.heroWindow} data-morph-target>
              <img
                src={`${SCREEN_DIR}/library.webp`}
                alt="Ark Server の動画ライブラリ．Mac に保存した動画がサムネイルで一覧できる実際の画面"
                width={SCREENSHOT_WIDTH}
                height={MAC_SCREENSHOT_HEIGHT}
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className={styles.heroConnection} aria-hidden="true">
              <span /> 同じ Wi‑Fi <ArrowDown size={16} />
            </div>
            <div className={styles.heroPhone}>
              <img
                src={`${SCREEN_DIR}/mob-home.webp`}
                alt="同じライブラリをスマホのブラウザで開いた実際の画面．動画のサムネイルと，ホーム・ショート・続きを見る・アルバムのタブが並ぶ"
                width={SCREENSHOT_WIDTH}
                height={1818}
                loading="eager"
              />
            </div>
            <figcaption className={styles.heroCaption}>Mac とスマホのブラウザで，同じライブラリへ</figcaption>
          </figure>
        </div>
        <div className={styles.heroFooter}>
          <ul className={styles.requirements} aria-label="対応環境">
            {HERO_CHIPS.map(chip => <li key={chip}>{chip}</li>)}
          </ul>
          <a className={styles.exploreLink} href="#ark-how">仕組みを知る <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
        <p className={styles.captureNote}>実際の画面（撮影用に作った合成映像を取り込んで撮影）</p>
      </header>

      <section className={styles.stats} aria-label="数字で見る">
        <div className={styles.statsIntro}>
          <p className={styles.eyebrow}>主な仕様</p>
          <p>同時再生の本数や，データを守る仕組みを数字で紹介します．</p>
        </div>
        <ul className={styles.statsGrid}>
          {STATS.map((stat) => (
            <li key={stat.label}>
              <div>
                <div className={styles.statCard} data-product-enter>
                  <b>
                    <RollingNumber value={stat.value} />
                    <small>{stat.unit}</small>
                  </b>
                  <span>{stat.label}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="ark-how" className={styles.how}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">01</span>配信の仕組み</p>
          <h2 data-product-enter="heading">
            <span>Mac から配信して，</span>
            iPhone やブラウザで見る
          </h2>
          <p>
            Ark Server は，Mac の中の動画と写真を LAN に配る<strong>サーバー側</strong>のアプリです．受け取る側は，iPhone アプリの <strong>VideoPlayer</strong> か，ブラウザです．
          </p>
        </div>
        <div>
          <HowFlow />
        </div>
        <p className={styles.flowNote}>この紹介ページは Ark Server を中心に，受け取る側の iPhone アプリ VideoPlayer とブラウザの画面も載せています．</p>
      </section>

      <section id="ark-screens" className={styles.tourSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">02</span>Mac の画面</p>
          <h2 data-product-enter="heading">
            <span>8つの画面で，</span>
            使い方を紹介
          </h2>
          <p>
            アプリを開いてから使う順に，8つの画面を並べました．画面名を選ぶと，画像と機能の説明が切り替わります．すべて Mac 上で動いている実際の画面です．映っている動画は，撮影のために作った色や図形の合成映像で，個人の動画ではありません．
          </p>
        </div>
        <ScreenTour />
        <p className={styles.flowNote}>
          ホーム画面にある接続先の URL と QR コードは，家の LAN の情報なので，ここではぼかしています．
        </p>
      </section>

      <section className={styles.demos}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">03</span>操作デモ</p>
          <h2 data-product-enter="heading">
            <span>動きで見る，</span>
            3つの仕組み
          </h2>
          <p>差分の切り替え，シーンの仕分け，10等分の頭出しを，小さなデモにしました．押したり，触れたりして試せます．</p>
        </div>
        <div>
          <MiniDemos />
        </div>
        <p className={styles.flowNote}>デモは，アプリの動きを再現した図です．実際の画面ではありません．</p>
      </section>


      <section id="ark-iphone" className={styles.iphone}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">04</span>iPhone アプリ</p>
          <h2 data-product-enter="heading">
            <span>iPhone でも，</span>
            同じライブラリを
          </h2>
          <p>
            受け取る側の iPhone アプリ <strong>VideoPlayer</strong> の画面です．Mac で配信しているサーバーへ繋ぎ，アルバムの閲覧から，再生，Mac の遠隔操作までを行います．
          </p>
        </div>
        <PhoneTour />
        <p className={styles.flowNote}>
          画面は，Xcode のシミュレータで実際に VideoPlayer を動かして撮ったものです．実機ではありません．GitHub で公開している2026年8月24日時点のコミット（eb57ddd）をビルドしており，当時の iOS アプリです．
        </p>
      </section>

      <section id="ark-browser" className={styles.browser}>
        <div className={styles.browserIntro}>
          <div>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">05</span>ブラウザ版</p>
              <h2 data-product-enter="heading">
                <span>アプリがなくても，</span>
                ブラウザで
              </h2>
              <p>
                Ark Server は，ブラウザ用の画面も一緒に配ります．アドレスを開いて PIN を入れれば，ホーム・ショート・続きを見る・アルバムの4つのタブが現れます．
              </p>
              <p>
                広い画面では左のサイドレール，スマホでは下のタブバーへ，1つの画面が自動で切り替わります．
              </p>
            </div>
            <ul className={styles.tabList}>
              {BROWSER_TABS.map(([name, text]) => (
                <li key={name}>
                  <b>{name}</b>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <figure className={styles.browserShowcase}>
          <div className={styles.showcaseChrome} aria-hidden="true"><span>● ● ●</span><span>Ark Server · Web</span></div>
          <img src={`${SCREEN_DIR}/web-home.webp`} alt="ブラウザ版のホーム画面．左にナビゲーション，右に動画一覧が並ぶ" width={SCREENSHOT_WIDTH} height={MAC_SCREENSHOT_HEIGHT} loading="lazy" decoding="async" />
          <figcaption>ブラウザ版の実際の画面</figcaption>
        </figure>
        <details className={styles.previewDetails}>
          <summary>画面幅による配置の変化を試す</summary>
          <BrowserPreview />
        </details>
      </section>

      <section className={styles.more}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">06</span>そのほかの機能</p>
          <h2 data-product-enter="heading">
            <span>再生から整理まで，</span>
            {MORE_TOTAL}の機能
          </h2>
          <p>まずは各分野から6つの機能を紹介します．分野で絞り込むか，「すべての機能を見る」で全件を確認できます．カードを押すと説明が開きます．</p>
        </div>
        <MoreGrid />
      </section>

      <div className={styles.technicalNotes} aria-label="主な技術"><span>SwiftUI</span><span>Swifter</span><span>Bonjour</span><span>AVFoundation</span><span>PIN 認証</span></div>

      <section className={styles.looks}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">07</span>外観</p>
          <h2 data-product-enter="heading">
            <span>暗い外観と，</span>
            明るい外観を比較
          </h2>
          <p>
            設定の「ダークな外観にする」を切り替えると，同じ画面が明るい外観になります．画像の境界線を動かすと，両方の外観を見比べられます．設定は節ごとに分かれていて，上のボタンから目的の節へ飛べます．
          </p>
        </div>
        <AppearanceWipe />
      </section>


      <section className={styles.care}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">08</span>データと接続</p>
          <h2 data-product-enter="heading">
            <span>接続とデータを守る，</span>
            8つの仕組み
          </h2>
          <p>自分のライブラリを預かるので，接続の入口とデータの扱いは，慎重に作っています．「動きを見る」を開くと，それぞれの仕組みを順に確認できます．</p>
        </div>
        <ul className={styles.careGrid}>
          {CARE.map((item, index) => (
            <li key={item.title} className={styles.careItem}>
              <div className={styles.careReveal} data-product-enter>
                <div className={styles.careCard} data-motion-card>
                  <div className={styles.careHead}>
                    <item.icon size={20} aria-hidden="true" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <details className={styles.careDetails}>
                    <summary>動きを見る</summary>
                    <CareDiagram index={index} />
                  </details>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.careNote}>
          <strong>ご利用にあたって．</strong>
          通信は暗号化されません．ルーターの外へは公開せず，信頼できる Wi‑Fi の中だけで使ってください．スケジュール起動で電源の起床を設定すると，ほかの繰り返し起床の予定も消えることがあります．
        </p>
      </section>

      <section id="ark-stack" className={styles.stack}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}><span className={styles.chapterNumber} aria-hidden="true">09</span>技術構成</p>
          <h2 data-product-enter="heading">
            <span>標準の部品で，</span>
            配信と再生を支える
          </h2>
        </div>
        <TechTimeline items={STACK} />
      </section>

      <section className={styles.closing}>
        <div>
          <div className={styles.closingCard}>
            <div className={styles.closingBody}>
              <img className={styles.closingMark} src="/projects/arkserver.svg" width={48} height={48} alt="" />
              <p className={styles.eyebrow}>ソースコード</p>
              <h2 data-product-enter="heading">
                <span>つくる仕組みも，</span>
                ソースコードから
              </h2>
              <p>Mac 用の Ark Server と，iPhone 用の VideoPlayer のコードを GitHub で確認できます．</p>
              <div className={styles.heroActions}>
                <a
                  className={styles.primaryLink}
                  href={buildRepositoryUrl(siteConfig.githubUsername, ARK_REPOSITORY)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubIcon className="w-4 h-4" /> Ark Server のコードを見る
                  <ArrowUpRight size={17} aria-hidden="true" />
                  <span className="sr-only">（GitHub・新しいタブで開きます）</span>
                </a>
                <a
                  className={styles.secondaryLink}
                  href={buildRepositoryUrl(siteConfig.githubUsername, 'VideoPlayer')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubIcon className="w-4 h-4" /> VideoPlayer（iOS）
                  <span className="sr-only">（GitHub・新しいタブで開きます）</span>
                </a>
              </div>
              <Link className={styles.backLink} href="/#projects">
                ← ほかのアプリを見る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
