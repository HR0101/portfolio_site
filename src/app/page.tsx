import Link from 'next/link';
import { Hero } from '../sections/Hero';
import { ProductShowcase } from '../sections/ProductShowcase';
import { PlanetTail } from '../components/PlanetTail';
import { About } from '../sections/About';
import { Skills } from '../sections/Skills';
import { Projects } from '../sections/Projects';
import { Works } from '../sections/Works';
import { GitHubActivity } from '../sections/GitHubActivity';
import { Contact } from '../sections/Contact';
import { Profile } from '../sections/Profile';
import { NotesTeaser } from '../sections/NotesTeaser';
import { LabTeaser } from '../sections/LabTeaser';
import { ScrollHighlightText } from '../components/ScrollHighlightText';
import { VelocityMarquee } from '../components/VelocityMarquee';
import { Reveal } from '../components/Reveal';
import { ParallaxLayer } from '../components/ParallaxLayer';
import { DotWaveDivider } from '../components/ambient/DotWaveDivider';
import { StatementBand } from '../components/ambient/StatementBand';
import { LiquidSignature } from '../components/ambient/LiquidSignature';
import { StrokeCurve } from '../components/animations/StrokeCurve';
import { SpreadWords } from '../components/animations/SpreadWords';
import { STATEMENT_EXAMPLES } from '../lib/ambient/statement';
import { siteConfig } from '../config/site';
import { FEATURES } from '../config/features';
import { buildRepositoryUrl, PLATFORM_LABELS, SWIFT_APPS } from '../data/apps';
import { ALL_WORKS } from '../data/works';
import { PROFILE_FACTS, buildProfilePersonProperties } from '../data/profile';

// Contact の前の大きな文字の帯．スイッチが切れているときの VelocityMarquee と，同じ語を使う．
const CONTACT_LEAD_WORDS = ["Let's build", 'something', 'trustworthy', 'together'];

// 各紹介ページで確認できる設計判断．作品名・年・リンクは共通データを参照する．
const principleEvidence = [
  {
    appName: 'Subghost',
    decision: 'CLI への送信経路を持たず，状態の監視に徹する設計にしました．',
  },
  {
    appName: 'Tsumugi',
    decision: '既定の診断は端末内で完結し，記事を外へ送らない形にしました．',
  },
  {
    appName: 'BusTimeApp',
    decision: '午前4時の運行日境界を扱い，通知・ウィジェット・Siri でも同じ時刻表と経路判断を共有する構成にしました．',
  },
];

// 検索エンジン向けの構造化データ（Person と，公開しているアプリの一覧）
function buildStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${siteConfig.siteUrl}/#person`,
        name: siteConfig.displayName,
        url: siteConfig.siteUrl,
        email: `mailto:${siteConfig.email}`,
        jobTitle: siteConfig.role,
        ...buildProfilePersonProperties(PROFILE_FACTS, siteConfig),
        knowsAbout: ['Swift', 'SwiftUI', 'iOS', 'macOS', 'Python', 'C', 'Arduino'],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.siteUrl}/#website`,
        url: siteConfig.siteUrl,
        name: `${siteConfig.displayName} | iOS & macOS App Portfolio`,
        description: siteConfig.description,
        inLanguage: 'ja',
        author: { '@id': `${siteConfig.siteUrl}/#person` },
      },
      {
        '@type': 'ItemList',
        name: 'つくったアプリ',
        numberOfItems: SWIFT_APPS.length,
        itemListElement: SWIFT_APPS.map((app, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: app.name,
            description: app.tagline,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: PLATFORM_LABELS[app.platform],
            programmingLanguage: 'Swift',
            author: { '@id': `${siteConfig.siteUrl}/#person` },
            image: app.imageSrc
              ? new URL(app.imageSrc, siteConfig.siteUrl).toString()
              : undefined,
            codeRepository: buildRepositoryUrl(
              siteConfig.githubUsername,
              app.repositories[0].name,
            ),
            sameAs: app.repositories.map((repository) =>
              buildRepositoryUrl(siteConfig.githubUsername, repository.name),
            ),
          },
        })),
      },
    ],
  };
}

// ランディングページ：全セクションを順に描画する
export default function HomePage() {
  // Contact の前の大きな文字．スイッチが切れていれば，今までの流れる帯に戻る
  const contactLead = FEATURES.spreadWords
    ? <SpreadWords words={CONTACT_LEAD_WORDS} testId="spread-words-contact" />
    : <VelocityMarquee words={CONTACT_LEAD_WORDS} direction={-1} />;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStructuredData()) }}
      />
      <Hero />
      <ProductShowcase />
      <About />
      {/* 自己紹介のあと，点描の惑星をページの最後まで残す（画面には何も出さない） */}
      <PlanetTail />
      <section className="principle-section" aria-label="制作の姿勢">
        <div className="principle-inner">
          {/* 見出しが現れると，上の罫線が左から引かれる */}
          <Reveal className="principle-heading"><span aria-hidden="true">THE WAY I BUILD</span><span aria-hidden="true">DESIGN / CODE / CARE</span></Reveal>
          {/* 背後の大きな文字は，スクロールに合わせて横へゆっくり流れる */}
          <ParallaxLayer className="principle-watermark" distancePx={0} horizontalDistancePx={-160}><span aria-hidden="true">TRUST</span></ParallaxLayer>
          <ScrollHighlightText
            text={'「あったらいいな」を，/自分の手で形にする．/使う人が迷わない導線と，/こわれにくい実装で，/小さな信頼を積み上げていく．'}
            className="principle-copy"
          />
          {FEATURES.evidence && (
          <div className="principle-evidence" data-testid="principle-evidence">
            <h2 className="principle-heading" id="principle-evidence-heading" aria-label="設計判断の根拠">EVIDENCE</h2>
            <ul className="principle-evidence-list" aria-labelledby="principle-evidence-heading">
              {principleEvidence.map(({ appName, decision }) => {
                const app = SWIFT_APPS.find((app) => app.name === appName);
                if (!app?.detailHref) return null;
                return (
                  <li key={app.name}>
                    <p>{decision}</p>
                    <Link href={app.detailHref} className="principle-evidence-link">
                      <span>{app.name} <span className="principle-evidence-year">/ {app.year}</span></span>
                      <span>紹介ページへ <span aria-hidden="true">↗</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          )}
          {/* 罫線が引かれたあと，アイデアから信頼までの流れが左から順に灯る */}
          <Reveal className="principle-footer"><span aria-hidden="true">IDEA</span><span aria-hidden="true">→</span><span aria-hidden="true">DESIGN</span><span aria-hidden="true">→</span><span aria-hidden="true">BUILD</span><span aria-hidden="true">→</span><span aria-hidden="true">TRUST</span></Reveal>
        </div>
      </section>
      <Skills />
      {/* 章の間の「生きている面」．画面内にあるあいだだけ動く装飾（読み上げ対象外） */}
      {FEATURES.strokeCurves
        ? <StrokeCurve variant="arc" tone="primary" testId="ambient-skills-apps" />
        : <DotWaveDivider seed="skills-apps" variant="swell" height={120} testId="ambient-skills-apps" />}
      <Projects />
      <StatementBand text={STATEMENT_EXAMPLES.apps(SWIFT_APPS.length)} testId="statement-apps" />
      <VelocityMarquee words={['Swift', 'SwiftUI', 'Next.js', 'TypeScript', 'Three.js', 'Canvas']} />
      <DotWaveDivider seed="apps-works" variant="rain" height={80} density={0.7} testId="ambient-apps-works" />
      <Works />
      {FEATURES.strokeCurves
        ? (
          <StrokeCurve variant="wave" flip tone="sky" testId="ambient-works-github">
            <StatementBand text={STATEMENT_EXAMPLES.works(ALL_WORKS.length)} testId="statement-works" />
          </StrokeCurve>
        )
        : <StatementBand text={STATEMENT_EXAMPLES.works(ALL_WORKS.length)} testId="statement-works" />}
      {FEATURES.lab && <LabTeaser />}
      {!FEATURES.strokeCurves && <DotWaveDivider seed="works-github" variant="ripple" height={96} testId="ambient-works-github" />}
      <GitHubActivity />
      <DotWaveDivider seed="github-profile" height={80} density={0.6} testId="ambient-github-profile" />
      {FEATURES.notes && <NotesTeaser />}
      <Profile />
      <StatementBand text={STATEMENT_EXAMPLES.source} testId="statement-source" />
      {FEATURES.strokeCurves
        ? <StrokeCurve variant="crest" tone="sky" exposeChildren={FEATURES.spreadWords} testId="stroke-curve-contact">{contactLead}</StrokeCurve>
        : contactLead}
      <LiquidSignature height={160} testId="signature-contact" />
      <Contact />
    </>
  );
}
