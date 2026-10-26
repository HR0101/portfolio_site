import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  Coins,
  Globe2,
  History,
  Languages,
  MapPin,
  Palette,
  Printer,
  QrCode,
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
import { CenterDemo } from './center-demo';
import { PipelineSteps } from './pipeline-steps';
import styles from './product.module.css';

const description =
  '複数人の最寄駅から，鉄道網に沿った移動時間の公平さで集合駅を提案する Web サービス EkiHub。全国約8,200駅、運賃の概算、共有URL、出発時刻の逆算までを紹介します。';

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

// ヒーローの中で中心へ集まってくるメンバーの駅
const HERO_MEMBERS = [
  { x: 60, y: 80, color: '#2fd3b5' },
  { x: 420, y: 70, color: '#7c8bff' },
  { x: 470, y: 330, color: '#ffb547' },
  { x: 90, y: 360, color: '#ff7a9a' },
];

// 結果画面のまわりに置いた機能（README の機能モジュール一覧から）
const features = [
  { icon: Users, title: 'メンバー名・人数', text: '駅ごとに名前と人数を入れると，人数で重心と平均に重みが付きます．' },
  { icon: Coins, title: '運賃の概算', text: '距離から普通運賃を見積もり，「運賃をどれだけ重視するか」も調整できます．' },
  { icon: QrCode, title: '共有URL・QR', text: '入力と条件を URL にして共有．開いた人の画面で自動的に復元されます．' },
  { icon: CalendarClock, title: '出発時刻の逆算', text: '集合時刻から各メンバーの出発時刻を逆算し，.ics でカレンダーに入れられます．' },
  { icon: MapPin, title: '周辺スポット', text: '集合駅のまわりのカフェ・居酒屋・カラオケを OpenStreetMap から取り出します．' },
  { icon: TrainFront, title: '鉄道運行情報', text: '首都圏の ODPT 提供路線について，最新の運行情報をその場で確かめられます．' },
  { icon: Languages, title: '4言語', text: '日本語・英語・中国語・韓国語を切り替えられます．' },
  { icon: Palette, title: '7つのテーマ', text: 'ダーク・ライト・自動に加え，サクラや紅葉など7種類の配色を選べます．' },
  { icon: History, title: '履歴とお気に入り', text: '過去の検索をそのまま再実行．よく集まる組み合わせは保存しておけます．' },
  { icon: Printer, title: '印刷・コピー', text: '結果を印刷用のレイアウトや，チャットに貼れるテキストで書き出せます．' },
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
        <a href="#ekihub-demo">試してみる ↓</a>
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
              <a className={styles.secondaryLink} href="#ekihub-demo">
                このページで試す <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          {/* 4人の駅から，線が1つの駅へ集まっていく */}
          <svg className={styles.heroVisual} viewBox="0 0 520 440" aria-hidden="true">
            <circle className={styles.heroOrbit} cx="260" cy="220" r="150" />
            <circle className={styles.heroOrbit} cx="260" cy="220" r="205" />
            {HERO_MEMBERS.map((member, index) => (
              <g key={index}>
                <line
                  className={styles.heroRoute}
                  x1={member.x}
                  y1={member.y}
                  x2="260"
                  y2="220"
                  stroke={member.color}
                  pathLength={1}
                  style={{ animationDelay: `${0.5 + index * 0.18}s` }}
                />
                <circle
                  className={styles.heroMember}
                  cx={member.x}
                  cy={member.y}
                  r="13"
                  fill={member.color}
                  style={{ animationDelay: `${0.2 + index * 0.18}s` }}
                />
              </g>
            ))}
            <circle className={styles.heroPulse} cx="260" cy="220" r="34" />
            <circle className={styles.heroRing} cx="260" cy="220" r="30" />
            <path className={styles.heroStem} d="M260 252 v 46" />
          </svg>
        </div>
      </header>

      <section className={styles.problem}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>WHY NOT THE MIDPOINT</p>
          <h2>
            地図の真ん中は，<span>海の上</span>かもしれない．
          </h2>
          <p>
            横浜と千葉の真ん中は，東京湾の上です．地図上の重心は，線路がつながっているかを知りません．EkiHub は「全員が何分かかるか」で考え，いちばん遠い人が遠すぎない駅を選びます．
          </p>
        </Reveal>

        <Reveal variant="scale" className={styles.bayFigure}>
          <figure>
            <svg viewBox="0 0 560 300" role="img" aria-label="横浜と千葉の地理的な重心は東京湾の上にあり，線路に沿って回り込むと錦糸町や新木場あたりが中心になる様子">
              <path className={styles.bayWater} d="M150 300 C 170 210, 230 170, 300 175 C 360 180, 400 210, 420 300 Z" />
              <path className={styles.bayRail} d="M70 250 C 110 160, 170 90, 280 80 C 390 72, 460 140, 500 210" pathLength={1} />
              <circle className={styles.bayStation} cx="70" cy="250" r="9" />
              <text className={styles.bayLabel} x="70" y="282" textAnchor="middle">横浜</text>
              <circle className={styles.bayStation} cx="500" cy="210" r="9" />
              <text className={styles.bayLabel} x="500" y="242" textAnchor="middle">千葉</text>
              <g className={styles.bayCentroid}>
                <circle cx="285" cy="232" r="8" />
                <text x="285" y="262" textAnchor="middle">地図上の重心（海の上）</text>
              </g>
              <g className={styles.bayHub}>
                <circle cx="300" cy="80" r="12" />
                <text x="300" y="52" textAnchor="middle">線路でたどった中心</text>
              </g>
            </svg>
            <figcaption>図はイメージです．EkiHub は駅どうしを結ぶ距離を12kmまでに制限しているため，海を渡る近道がそもそも生まれません．</figcaption>
          </figure>
        </Reveal>
      </section>

      <section id="ekihub-demo" className={styles.demoSection}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrow}>TRY IT HERE</p>
          <h2>
            駅を選ぶと，<span>中心が動く．</span>
          </h2>
          <p>
            首都圏の25駅で試せる小さな再現です．最寄駅を2〜5つ選び，「近さ」と「公平さ」のどちらを重く見るかを動かしてみてください．
          </p>
        </Reveal>
        <CenterDemo />
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

      <section className={styles.screens}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrowDark}>THE REAL THING</p>
          <h2>
            結果は，<span>ひと目で決められる形で．</span>
          </h2>
          <p>中心駅のカード，平均とばらつき，運賃の概算，地図．集まる場所を決めるのに要る数字だけを並べています．</p>
        </Reveal>
        <div className={styles.screenPair}>
          <ScrollZoom className={styles.screenMain}>
            <figure className={styles.screenFrame}>
              <img
                src="/projects/works/ekihub-result.webp"
                alt="東京・川崎・船橋の3駅から，中心駅として新木場が提案された EkiHub の結果画面"
                width={450}
                height={505}
                loading="lazy"
              />
              <figcaption>東京・川崎・船橋で探した結果（実際の画面）</figcaption>
            </figure>
          </ScrollZoom>
          <ScrollZoom className={styles.screenSub} fromScale={0.9} fromTiltDeg={8}>
            <figure className={styles.screenFrame}>
              <img
                src="/projects/works/ekihub-hero.webp"
                alt="EkiHub のトップ画面．「みんなの中心駅を探す」という見出しと言語・テーマの切り替え"
                width={840}
                height={266}
                loading="lazy"
              />
              <figcaption>トップ画面．テーマは「クレイ」を選んだ状態です</figcaption>
            </figure>
          </ScrollZoom>
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
