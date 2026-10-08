import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookmarkX,
  CircleHelp,
  Fingerprint,
  Palette,
  ScanSearch,
  Timer,
} from 'lucide-react';
import { siteConfig } from '../../../config/site';
import { DiagnosisGallery } from './diagnosis-gallery';
import { HalfLifeChart } from './half-life-chart';
import { WeaveLoom } from './weave-loom';
import styles from './product.module.css';

const description =
  '保存した記事を、その場で要約・信頼度診断・鮮度診断へ。Tsumugiの「織り」のたとえ、5項目の信頼度評価、半減期モデルによる鮮度判定を紹介します。';

export const metadata: Metadata = {
  title: 'Tsumugi — 集めた記事を、一枚の布に。',
  description,
  alternates: { canonical: '/apps/tsumugi' },
  openGraph: {
    title: 'Tsumugi — 集めた記事を、一枚の布に。',
    description,
    url: '/apps/tsumugi',
    type: 'website',
  },
};

// 「集めるところまでは、誰でもできる」を裏づける3つの課題
const problems = [
  {
    icon: BookmarkX,
    title: '保存はした。それきりになる。',
    text: 'あとで読むつもりのリンクが積み上がり，どれが読み終わったのかも分からなくなる．集めた量が，そのまま重さになっていきます．',
  },
  {
    icon: CircleHelp,
    title: '確からしさは、読み手任せ。',
    text: '出典はあるか，主張に偏りはないか．本来なら確かめたい点が，忙しさの中で後回しになります．',
  },
  {
    icon: Timer,
    title: '情報は、静かに古くなる。',
    text: '公開時点では正しかった記事も，話題によっては数か月で前提が変わる．古さは，本文のどこにも書かれていません．',
  },
];

// 実装で特に気をつけたところ
const craftPoints = [
  {
    number: '01 / PRIVACY',
    icon: Fingerprint,
    title: 'まず、端末の中で完結する。',
    text:
      '既定の診断はオンデバイスのルールベース．記事をどこかへ送らなくても，要約とスコアがそろいます．より精密に見たいときだけ，自分のAPIキーを登録してAI診断へ切り替えられる．どこで処理するかを，使う人が選べる形にしました．',
    tech: 'オンデバイス診断（ルールベース） · 任意のAI診断',
  },
  {
    number: '02 / HONESTY',
    icon: ScanSearch,
    title: '断定しない、という設計。',
    text:
      '診断は自動推定であり，正確性を保証するものではない．画面にそう書いています．判定できなかった項目はスコアから外して再計算し，「分からない」を点数に紛れ込ませません．',
    tech: '重み付き評価 · 判定不能項目の除外',
  },
  {
    number: '03 / CONSISTENCY',
    icon: Palette,
    title: '織りのたとえを、隅々まで。',
    text:
      '経（たて）は信頼度，緯（よこ）は鮮度．この対応をアイコン・色・文言のすべてで守り，画面が変わっても同じ言葉で読み解けるようにしました．色だけに頼らず，必ず文章でも伝えます．',
    tech: '生成りの配色 · 色に依存しない表現',
  },
];

// タブに載せきらない画面は，横に流せるストリップで補足する
const otherScreens: [string, string, string][] = [
  ['onboarding', 'はじめかた', '共有シートに Tsumugi を追加する手順を，最初に案内します．'],
  ['article-body', '本文', '取り込んだ記事は全文を保持し，アプリの中で読み通せます．'],
  ['item-diagnosis', '診断タブ', '要約のとなりで，スコアの内訳をそのまま開けます．'],
  ['search', '検索', 'よく使うタグと，意味の近さ．2つの手がかりで手繰ります．'],
  ['settings', '設定', '診断の厳しさ，段階的診断，使う解析エンジンまで選べます．'],
];

// 鮮度スコアに効く補正の説明
const freshnessNotes = [
  ['本文の年号との食い違い', '「2023年最新」と書かれた記事を2年後に読めば，その分だけ減点します．見出しの鮮度と実際の鮮度を切り分けるための補正です．'],
  ['トピックごとの半減期', '生成AIは120日，技術一般は365日，学術・基礎は1095日．同じ経過日数でも，古び方は話題によって変えています．'],
  ['0点のときこそ、言葉で', 'スコアが0点に落ちた記事には「陳腐化の可能性が高い」と明記し，後続情報の確認をすすめます．数字だけを置き去りにしません．'],
];

export default function TsumugiPage() {
  return (
    <article className={styles.page}>
      <nav className={styles.localNav} aria-label="Tsumugi ナビゲーション">
        <Link href="/#projects">← アプリ一覧</Link>
        <span>Tsumugi</span>
        <a href="#tsumugi-screens">画面を見る ↓</a>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCloth} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SAVE, THEN UNDERSTAND</p>
          <div className={styles.appName}>
            <img src="/projects/tsumugi.webp" alt="" width={36} height={36} loading="eager" />
            Tsumugi <span>for iPhone</span>
          </div>
          <h1>
            集めた記事が、
            <br />
            <em>一枚の布になる。</em>
          </h1>
          <p className={styles.lead}>
            読んだつもりを、
            <br />
            確かな理解に。
          </p>
          <p className={styles.bodyCopy}>
            共有シートから保存するだけ。要約も、信頼度も、情報の鮮度も、
            <br className="sm:hidden" />
            端末の中で解析して、その場で返します。
          </p>
          <a className={styles.primaryLink} href="#tsumugi-weave">
            Tsumugiを見てみる <span aria-hidden="true">↓</span>
          </a>
          <p className={styles.heroNote}>
            企画・デザイン・Swift / SwiftUI実装：{siteConfig.displayName}
          </p>
        </div>
        <figure className={styles.heroVisual}>
          <div className={`${styles.phone} ${styles.heroPhone}`}>
            <img
              src="/projects/tsumugi-screens/item-summary.webp"
              alt="Tsumugiの記事画面。上部の織り模様の下に、信頼度56点・鮮度0点と要約が並ぶ"
              width={840}
              height={1826}
              fetchPriority="high"
            />
          </div>
          <figcaption>実際のアプリ画面</figcaption>
        </figure>
      </header>

      <section className={styles.intro} aria-labelledby="tsumugi-problem">
        <p className={styles.eyebrow}>COLLECTING IS THE EASY PART</p>
        <h2 id="tsumugi-problem">
          集めるのは、簡単になった。
          <br />
          <span>見極めるのは、そのままだ。</span>
        </h2>
        <p>
          読むべき記事は増え続けるのに，確かめる手間は減っていません．Tsumugiは「保存する」と「理解する」のあいだにある3つの引っかかりを，ひとつのアプリで引き受けます．
        </p>
        <div className={styles.threeColumns}>
          {problems.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={27} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.originStrip} aria-labelledby="tsumugi-origin">
        <div className={styles.originInner}>
          <p className={styles.originGlyph} aria-hidden="true">
            紬
            <small>TSUMUGI</small>
          </p>
          <div>
            <h2 id="tsumugi-origin">名前は、織物から。</h2>
            <p>
              紬（つむぎ）は，真綿から引き出した糸を草木で染めて織る，素朴な絹布のこと．一本ずつは頼りない糸でも，経（たて）と緯（よこ）が組み合えば，一枚の布になります．集めた記事を織り上げていく道具として，この名前にしました．
            </p>
          </div>
        </div>
      </section>

      <section id="tsumugi-weave" className={styles.weaveSection} aria-labelledby="tsumugi-weave-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>ONE ARTICLE, ONE FABRIC</p>
          <h2 id="tsumugi-weave-heading">
            この記事だけの、
            <br />
            <span>一枚の織り。</span>
          </h2>
          <p>
            経（たて）は信頼度，緯（よこ）は鮮度。
            <br />
            2つのスコアから，記事ごとに違う布が生まれます。
          </p>
        </div>
        <WeaveLoom />
      </section>

      <section id="tsumugi-screens" className={styles.diagnosis} aria-labelledby="tsumugi-screens-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>SHOW THE REASONING</p>
          <h2 id="tsumugi-screens-heading">
            結論より、
            <br />
            <span>そこに至る道すじを。</span>
          </h2>
          <p>保存から振り返りまで，5つの画面でひと続きに。</p>
        </div>
        <DiagnosisGallery />

        <div className={styles.stripBlock}>
          <p className={styles.stripHeading}>そのほかの画面</p>
          <div
            className={styles.strip}
            tabIndex={0}
            role="group"
            aria-label="そのほかの画面（横にスクロールできます）"
          >
            {otherScreens.map(([image, title, text]) => (
              <figure className={styles.stripItem} key={image}>
                <div className={styles.stripPhone}>
                  <img
                    src={`/projects/tsumugi-screens/${image}.webp`}
                    alt={`Tsumugiの${title}の画面`}
                    width={840}
                    height={1826}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption>
                  <strong>{title}</strong>
                  {text}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.halfLife} aria-labelledby="tsumugi-freshness-heading">
        <p className={styles.eyebrow}>HOW INFORMATION FADES</p>
        <h2 id="tsumugi-freshness-heading">
          古びる速さは、
          <br />
          <span>話題ごとに違う。</span>
        </h2>
        <p className={styles.formula}>
          鮮度 = 100 × 0.5 ^ ( 経過日数 ÷ 半減期 ) + 補正
        </p>
        <div className={styles.halfLifeGrid}>
          <ul className={styles.halfLifeNotes}>
            {freshnessNotes.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                {text}
              </li>
            ))}
          </ul>
          <HalfLifeChart />
        </div>
        <p className={styles.finePrint}>
          半減期はトピックごとに設定した目安の値です．鮮度スコアは記事の正しさではなく，「いま読むなら，後続情報を確かめたほうがよいか」の手がかりとして表示しています．
        </p>
      </section>

      <section className={styles.craft} aria-labelledby="tsumugi-craft-heading">
        <p className={styles.eyebrow}>THOUGHTFUL, INSIDE AND OUT</p>
        <h2 id="tsumugi-craft-heading">
          判断を預けるアプリだから、
          <br />
          <span>つくり方まで見せる。</span>
        </h2>
        <div className={styles.craftGrid}>
          {craftPoints.map(({ number, icon: Icon, title, text, tech }) => (
            <div key={number}>
              <span className={styles.number}>{number}</span>
              <h3>
                <Icon size={22} aria-hidden="true" /> {title}
              </h3>
              <p>{text}</p>
              <span className={styles.tech}>{tech}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="tsumugi-end-heading">
        <img src="/projects/tsumugi.webp" alt="" width={72} height={72} loading="lazy" />
        <h2 id="tsumugi-end-heading">
          読み流した記事を、
          <br />
          手元に残る一枚に。
        </h2>
        <p>Tsumugiの設計と実装を，ソースコードで公開しています．</p>
        <a
          className={styles.primaryLink}
          href={`${siteConfig.githubUrl}/Tsumugi`}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHubでソースを見る <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <Link className={styles.backLink} href="/#projects">
          ほかのアプリも見る →
        </Link>
      </section>
    </article>
  );
}
