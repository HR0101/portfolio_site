import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Coins,
  Filter,
  Globe2,
  History,
  Languages,
  MapPin,
  Palette,
  QrCode,
  Scale,
  TrainFront,
  Users,
} from 'lucide-react';
import { Reveal } from '../../../components/Reveal';
import { KineticText } from '../../../components/KineticText';
import { SplitTextReveal } from '../../../components/SplitTextReveal';
import { ScrollZoom } from '../../../components/ScrollZoom';
import { GitHubIcon } from '../../../components/icons/GitHubIcon';
import { siteConfig } from '../../../config/site';
import { buildRepositoryUrl } from '../../../data/apps';
import { PipelineSteps } from './pipeline-steps';
import { ScreenTour } from './screen-tour';
import styles from './product.module.css';

const description =
  '複数人の最寄駅から，鉄道網に沿った移動時間の公平さで集合駅を提案する Web サービス EkiHub。実際の画面で，入力から候補駅の比較，共有，周辺スポットまでを紹介します。';

export const metadata: Metadata = {
  title: 'EkiHub — 地図の真ん中より、みんなの真ん中。',
  description,
  alternates: { canonical: '/apps/ekihub' },
  openGraph: {
    title: 'EkiHub — 地図の真ん中より、みんなの真ん中。',
    description,
    url: '/apps/ekihub',
    type: 'website',
  },
};

const EKIHUB_URL = 'https://ekihub.jp/';

// 実際の画面（public/projects/ekihub-screens/）の画像名と寸法
const SCREEN_DIR = '/projects/ekihub-screens';

// 8つのテーマ（ekihub.jp はページを開くたびにランダムで1つ選ぶ）
const themes = [
  { id: 'glass', name: 'GLASS / AURORA' },
  { id: 'violet', name: 'VIOLET / SOFT POP' },
  { id: 'clay', name: 'CLAY / TOY' },
  { id: 'mobile', name: 'MOBILE / FRIENDLY' },
  { id: 'soft', name: 'SOFT / NEUMORPHIC' },
  { id: 'retro', name: 'RETRO / DESKTOP' },
  { id: 'terminal', name: 'TERMINAL / MONO' },
  { id: 'y2k', name: 'Y2K / CHROME' },
];

// 画面にある機能（2026年10月の ekihub.jp で確認したもの）
const features = [
  { icon: Users, title: '人数で重み付け', text: '同じ駅から何人来るかを選ぶと，その人数ぶん重みを付けて中心を考えます．' },
  { icon: Scale, title: '重視ポイント', text: '「近さ重視」「公平さ重視」「バランス」に加え，運賃をどれだけ重く見るかも選べます．' },
  { icon: Filter, title: '候補の範囲', text: '乗降客の多い「主要駅だけ」か，規模を問わない「すべての駅」から探すかを切り替えられます．' },
  { icon: Coins, title: '運賃の目安', text: 'メンバーごとの片道の運賃と，全員の平均を並べます．' },
  { icon: QrCode, title: '共有とコピー', text: 'URL・共有・QR・結果のテキストコピー・印刷から，連絡の手段に合わせて渡せます．' },
  { icon: MapPin, title: '周辺スポット', text: 'カテゴリを選んで，集合駅の近くのお店や公園を Google マップで探せます．' },
  { icon: TrainFront, title: '鉄道運行情報', text: '首都圏の ODPT 提供路線について，最新の運行情報をその場で確かめられます．' },
  { icon: Languages, title: '4言語', text: '日本語・英語・中国語・韓国語を切り替えられます．' },
  { icon: Palette, title: '8つのテーマ', text: '開くたびにランダムで選ばれ，メニューから好きなものに切り替えられます．' },
  { icon: History, title: '履歴とマイグループ', text: '過去の検索をそのまま再実行．よく集まる顔ぶれはグループとして保存できます．' },
];

// 使っている技術と，選んだ理由
const stack = [
  ['画面と API', 'Next.js（App Router）・React・TypeScript', '画面の配信と /api/* の応答を1プロセスで担い，算出ロジックはフレームワークから切り離す．'],
  ['地図', 'Leaflet', 'API キーなしで動き，経路線や重心の重ね描きを自由にできる．'],
  ['駅データ', 'OpenStreetMap ＋ 国土数値情報', '全国の駅位置と，主要駅を見分けるための乗降客数を公的なオープンデータから．'],
  ['運行情報', '公共交通オープンデータ（ODPT）', '首都圏の提供路線について，最新の運行状況を表示する．'],
  ['配信', 'Cloudflare ＋ 常時無料の VM', 'CDN と WAF を前に置き，独自ドメイン ekihub.jp で公開している．'],
];

export default function EkiHubPage() {
  return (
    <article className={styles.page}>
      <nav className={styles.localNav} aria-label="EkiHub ナビゲーション">
        <Link href="/#works">← Web とゲームの一覧</Link>
        <span>EkiHub</span>
        <a href="#ekihub-screens">画面を見る ↓</a>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>FIND THE FAIR MIDDLE</p>
            <div className={styles.appName}>
              <img src="/projects/works/ekihub.svg" alt="" width={40} height={40} />
              EkiHub <span>ekihub.jp</span>
            </div>
            <h1>
              <KineticText text="地図の真ん中より、" baseDelayMs={200} />
              <br />
              <em>
                <KineticText text="みんなの真ん中。" baseDelayMs={620} wave />
              </em>
            </h1>
            <p className={styles.lead}>
              最寄駅を入れるだけで，全員が集まりやすい駅を．
              <br />
              決め手は距離ではなく，移動時間の公平さです．
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryLink} href={EKIHUB_URL} target="_blank" rel="noopener noreferrer">
                EkiHub をひらく <ArrowUpRight size={17} aria-hidden="true" />
                <span className="sr-only">（新しいタブで開きます）</span>
              </a>
              <a className={styles.secondaryLink} href="#ekihub-screens">
                画面を見る <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          {/* スマホで検索した実際の結果画面と，所要時間のカード */}
          <figure className={styles.heroScreens}>
            <div className={styles.heroPhone} data-morph-target>
              <img
                src={`${SCREEN_DIR}/mob-result.webp`}
                alt="スマホで見た EkiHub の結果画面．提案された中心駅は新木場．平均所要時間42分，時間のばらつき±17.2"
                width={840}
                height={1818}
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className={styles.heroFloat}>
              <img
                src={`${SCREEN_DIR}/times.webp`}
                alt="各最寄駅からの所要時間．東京20分，川崎62分，船橋45分"
                width={840}
                height={243}
              />
            </div>
            <figcaption>実際の画面（東京・川崎・船橋で検索）</figcaption>
          </figure>
        </div>
      </header>

      <section className={styles.problem}>
        <div className={styles.problemGrid}>
          <Reveal className={styles.sectionIntro}>
            <p className={styles.eyebrowDark}>WHY NOT THE MIDPOINT</p>
            <h2>
              地図の真ん中は，<span>海の上</span>かもしれない．
            </h2>
            <p>
              横浜と千葉の真ん中は，東京湾の上です．地図上の重心は，線路がつながっているかを知りません．
            </p>
            <p>
              実際に2駅を入れると，EkiHub の答えは<strong>豊洲</strong>でした．重心からは14.3km離れていますが，線路でたどったときの2人の所要時間のばらつきは<strong>±1.5分</strong>に収まります．距離の真ん中ではなく，時間の真ん中を選ぶからです．
            </p>
          </Reveal>
          <ScrollZoom className={styles.problemShot} fromScale={0.88} fromTiltDeg={10}>
            <figure className={styles.screenFrame}>
              <img
                src={`${SCREEN_DIR}/bay-result.webp`}
                alt="横浜と千葉で検索した EkiHub の結果．提案された中心駅は豊洲．時間のばらつき±1.5，重心までの距離14.3km"
                width={840}
                height={1412}
                loading="lazy"
              />
              <figcaption>横浜・千葉で検索した実際の画面</figcaption>
            </figure>
          </ScrollZoom>
        </div>
      </section>

      <section id="ekihub-screens" className={styles.tourSection}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>THE REAL SCREENS</p>
          <h2>
            入れて，選んで，<span>そのまま決める．</span>
          </h2>
          <p>
            ekihub.jp で「東京・川崎・船橋」の3人の集合場所を探したときの画面です．入力から，答え，比較，お店探し，運行情報まで，実際の順番で並べています．
          </p>
        </Reveal>
        <ScreenTour />
        <p className={styles.mapNote}>
          地図の欄は，背景地図の配信元が API キーを求めるようになり，撮影時点で「API KEY REQUIRED」の透かしが出ていたため，ここでは写していません．
        </p>
      </section>

      <section className={styles.howItWorks}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>HOW IT DECIDES</p>
          <h2>
            重心から始めて，<span>線路で考え直す．</span>
          </h2>
        </Reveal>
        <PipelineSteps />
      </section>

      <section className={styles.themes}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>EIGHT THEMES</p>
          <h2>
            同じ画面を，<span>8つの表情で．</span>
          </h2>
          <p>ekihub.jp はページを開くたびにテーマをランダムで選びます．どれも同じ機能のまま，見た目だけが着替わります．</p>
        </Reveal>
        <ul className={styles.themeGrid}>
          {themes.map((theme, index) => (
            <li key={theme.id}>
              <Reveal delayMs={(index % 2) * 90} variant="up" className={styles.themeCard}>
                <img
                  src={`${SCREEN_DIR}/theme-${theme.id}.webp`}
                  alt={`テーマ ${theme.name} で表示した EkiHub のトップ画面`}
                  width={840}
                  height={233}
                  loading="lazy"
                  decoding="async"
                />
                <span>{theme.name}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.mobile}>
        <div className={styles.mobileGrid}>
          <Reveal className={styles.sectionIntro}>
            <p className={styles.eyebrowDark}>ON THE GO</p>
            <h2>
              スマホでも，<span>そのまま．</span>
            </h2>
            <p>
              集合場所を決めるのは，たいてい移動中かグループの連絡の途中です．画面幅に合わせて入力と結果を縦に並べ直し，片手でも操作できるようにしています．
            </p>
          </Reveal>
          <div className={styles.mobilePhones}>
            <ScrollZoom className={styles.mobilePhone} fromScale={0.9} fromTiltDeg={12}>
              <div className={styles.phoneFrame}>
                <img
                  src={`${SCREEN_DIR}/mob-top.webp`}
                  alt="スマホで開いた EkiHub のトップ画面．見出しの下に最寄駅の入力欄"
                  width={840}
                  height={1818}
                  loading="lazy"
                />
              </div>
            </ScrollZoom>
            <ScrollZoom className={`${styles.mobilePhone} ${styles.mobilePhoneLower}`} fromScale={0.9} fromTiltDeg={18}>
              <div className={styles.phoneFrame}>
                <img
                  src={`${SCREEN_DIR}/mob-result.webp`}
                  alt="スマホで見た EkiHub の結果画面．提案された中心駅は新木場"
                  width={840}
                  height={1818}
                  loading="lazy"
                />
              </div>
            </ScrollZoom>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>AROUND THE ANSWER</p>
          <h2>
            決まったあとの，<span>段取りまで．</span>
          </h2>
        </Reveal>
        <ul className={styles.featureGrid}>
          {features.map((feature, index) => (
            <li key={feature.title} className={styles.featureItem}>
              <Reveal delayMs={(index % 4) * 70} className={styles.featureReveal}>
                <div className={styles.featureCard}>
                  <feature.icon size={20} aria-hidden="true" />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.stack}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>UNDER THE HOOD</p>
          <h2>
            キー不要の地図と，<span>公的なデータで．</span>
          </h2>
        </Reveal>
        <dl className={styles.stackTable}>
          {stack.map(([area, technology, reason]) => (
            <Reveal key={area} className={styles.stackRow}>
              <dt>{area}</dt>
              <dd>
                <b>{technology}</b>
                <span>{reason}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section className={styles.closing}>
        <Reveal variant="scale">
          <Globe2 className={styles.closingIcon} size={30} aria-hidden="true" />
          <h2>
            <SplitTextReveal text="次の集まりは，EkiHub で．" />
          </h2>
          <p>インストールも登録もいりません．ブラウザで ekihub.jp を開くだけです．</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryLink} href={EKIHUB_URL} target="_blank" rel="noopener noreferrer">
              ekihub.jp をひらく <ArrowUpRight size={17} aria-hidden="true" />
              <span className="sr-only">（新しいタブで開きます）</span>
            </a>
            <a
              className={styles.secondaryLink}
              href={buildRepositoryUrl(siteConfig.githubUsername, 'EkiHub')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon className="w-4 h-4" /> ソースコード
              <span className="sr-only">（GitHub・新しいタブで開きます）</span>
            </a>
          </div>
          <Link className={styles.backLink} href="/#works">
            ← ほかの作品を見る
          </Link>
        </Reveal>
      </section>
    </article>
  );
}
