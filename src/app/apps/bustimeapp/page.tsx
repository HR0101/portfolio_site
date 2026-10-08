import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Bell, LocateFixed, Layers, MoonStar, CloudRain, Waves, Wind, Snowflake, Sparkles } from 'lucide-react';
import { siteConfig } from '../../../config/site';
import { DemoScene } from './demo-scene';
import { SkyGallery } from './sky-gallery';
import { AppIconCube } from './app-icon-cube';
import { FeatureGallery } from './feature-gallery';
import styles from './product.module.css';

const description = '次に乗れる便を、迷わず確認。BusTimeAppの経路判断、時刻や天気で変わるドット絵の風景、通知・ウィジェットへのこだわりを紹介します。';
export const metadata: Metadata = {
  title: 'BusTimeApp — 次のバスへ、迷わず。', description,
  alternates: { canonical: '/apps/bustimeapp' },
  openGraph: { title: 'BusTimeApp — 次のバスへ、迷わず。', description, url: '/apps/bustimeapp', type: 'website', images: [{ url: '/projects/bustimeapp-background-cycle.png', width: 1600, height: 900, alt: 'BusTimeAppの実際の描画コードによる朝・昼・夕暮れ・夜の背景' }] },
};

const weatherDetails = [
  { icon: CloudRain, title: '雨の日には、雨の景色。', text: '降水量に合わせて雨粒の数が変化。雨の夜には、街灯の光が路面にいっそう明るく映ります。' },
  { icon: Snowflake, title: '雪は、足元にも。', text: 'ゆっくり揺れながら落ちる雪。雪の強さに合わせて、砂浜や道路にもまだらな白が重なります。' },
  { icon: Wind, title: '見えない風を、見える動きに。', text: '風が強まると雲が速く流れ、雨や雪は斜めに。海には白波が立ちやすくなります。' },
  { icon: MoonStar, title: '同じ夜は、ひとつもない。', text: '日付から月の満ち欠けを近似し、海に落ちる月明かりにも反映。星の瞬きや流れ星も、小さな楽しみに。' },
  { icon: Waves, title: '待つあいだも、海は動く。', text: '沖から寄せる波、波打ち際の泡、水面のきらめき。時刻に応じた潮位の演出や、水平線を渡る船も添えました。' },
  { icon: Sparkles, title: '季節も、空気も。', text: '春の淡い桃色、夏の青、秋の橙、冬の白い青。季節に応じて空の色と昼の長さを調整し、霧や雷も描きます。' },
];

export default function BusTimeAppPage() {
  return (
    <article className={styles.page}>
      <nav className={styles.localNav} aria-label="BusTimeApp ナビゲーション">
        <Link href="/#projects">← アプリ一覧</Link>
        <span>BusTimeApp</span>
        <a href="#bustime-demo">画面を見る ↓</a>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>BUILT FOR YOUR EVERYDAY</p>
          <div className={styles.appName}>BusTimeApp <span>for iPhone</span></div>
          <h1>次のバスへ。<br /><em>迷わず、まっすぐ。</em></h1>
          <p className={styles.lead}>時刻表を探す時間を、<br />出かける余裕に変えよう。</p>
          <p className={styles.bodyCopy}>現在地や時間帯から、いま必要な経路と便へ。<br />移ろう空とともに、毎日の移動に寄り添うアプリです。</p>
          <a className={styles.primaryLink} href="#bustime-demo">BusTimeAppを見てみる <span aria-hidden="true">↓</span></a>
          <p className={styles.heroNote}>企画・デザイン・Swift / SwiftUI実装：{siteConfig.displayName}</p>
        </div>
        <div className={styles.heroProducts}>
          <AppIconCube />
          <figure className={styles.heroScreen}>
            <div className={styles.phone}>
              <img src="/projects/bustimeapp-screens/morning.webp" alt="BusTimeAppの朝のホーム画面。経路、検索条件、次の便まであと8分と表示" width={840} height={1826} fetchPriority="high" />
            </div>
            <figcaption>実際のアプリ画面</figcaption>
          </figure>
        </div>
      </header>

      <section className={styles.intro} aria-labelledby="bustime-purpose">
        <p className={styles.eyebrow}>LESS SEARCHING. MORE GOING.</p>
        <h2 id="bustime-purpose">知りたいのは、時刻表の全部じゃない。<br /><span>「次に、どれに乗れるか。」</span></h2>
        <p>行き先を選び直し、曜日を調べ、時刻表を目で追う。その小さな手間を減らすために、経路を選ぶところから設計しました。</p>
        <div className={styles.threeColumns}>
          {[{ icon: LocateFixed, title: '経路を、先回り。', text: '現在地・時間帯・前回の行き先を手がかりに、いま見るべき経路を提案。必要なら自分で切り替えられます。' }, { icon: Layers, title: '日付の境目まで、丁寧に。', text: '土日祝や当日の残り便を考慮。午前4時の運行日境界も扱い、日付だけでは判断できない時間帯に備えます。' }, { icon: Bell, title: '確認の、その先へ。', text: '通知、Live Activity、ウィジェット、Siriへ。アプリを開いていないときの確認方法も用意しました。' }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={27} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </section>

      <section id="bustime-demo" className={styles.demo} aria-labelledby="bustime-demo-heading">
        <DemoScene />
      </section>

      <section className={styles.featureSection} aria-labelledby="bustime-features-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>MADE FOR THE WAY YOU GO</p><h2 id="bustime-features-heading">確かめる。備える。<br /><span>いつもの移動を、自分のペースで。</span></h2><p>時刻表から、出発前の通知まで。<br />実際の画面で、使い心地を見てみよう。</p></div>
        <FeatureGallery />
      </section>

      <section className={styles.skySection} aria-labelledby="bustime-sky-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>A LITTLE WORLD, ALWAYS CHANGING</p><h2 id="bustime-sky-heading">いつもの道に、<br /><span>今日だけの空。</span></h2><p>朝焼けから、星が見える夜へ。<br />時計と天気に呼応する、ドット絵の小さな海辺。</p></div>
        <SkyGallery />
        <div className={styles.weatherGrid}>{weatherDetails.map(({ icon: Icon, title, text }) => <div key={title}><Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></div>)}</div>
        <p className={styles.finePrint}>天気は海浜幕張駅付近のOpen-Meteoデータを使用。月齢・潮位・天体の動きは背景演出のための近似で、天文・潮汐予報ではありません。</p>
      </section>

      <section className={styles.craft} aria-labelledby="bustime-craft-heading">
        <p className={styles.eyebrow}>THOUGHTFUL, INSIDE AND OUT</p>
        <h2 id="bustime-craft-heading">見えないところにも、<br /><span>使い続けられる理由を。</span></h2>
        <div className={styles.craftGrid}>
          <div><span className={styles.number}>01 / CONSISTENCY</span><h3>どの入口からも、同じ判断。</h3><p>アプリ・通知・Live Activity・ウィジェット・Siriが、同じ時刻表と経路判断を共有。入口が増えても、判断の根拠が分かれない構成です。</p><span className={styles.tech}>WidgetKit · ActivityKit · App Intents</span></div>
          <div><span className={styles.number}>02 / READABILITY</span><h3>風景が変わっても、読みやすく。</h3><p>空の明るさに合わせ、文字やカードの配色も調整。夕方に文字と背景が似た明るさになることを避け、必要な情報が埋もれないようにしています。</p><span className={styles.tech}>SwiftUI · 時刻連動パレット</span></div>
          <div><span className={styles.number}>03 / COMFORT</span><h3>動きを減らしても、伝わる。</h3><p>「視差効果を減らす」に対応。波や星のアニメーションを静止させ、雨や雪は静止した表現として残します。見た目の楽しさと負担の少なさを両立させます。</p><span className={styles.tech}>Canvas · アクセシビリティ</span></div>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="bustime-end-heading">
        <img src="/projects/bustimeapp.webp" alt="" width={72} height={72} loading="lazy" />
        <h2 id="bustime-end-heading">毎日の「乗れるかな」を、<br />小さな安心に。</h2><p>BusTimeAppの設計と実装を、ソースコードで公開しています。</p>
        <a className={styles.primaryLink} href={`${siteConfig.githubUrl}/BusTimeApp`} target="_blank" rel="noopener noreferrer">GitHubでソースを見る <ArrowUpRight size={17} aria-hidden="true" /></a>
        <Link className={styles.backLink} href="/#projects">ほかのアプリも見る →</Link>
      </section>
    </article>
  );
}
