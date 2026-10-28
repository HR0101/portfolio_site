import { Hero } from '../sections/Hero';
import { ProductShowcase } from '../sections/ProductShowcase';
import { About } from '../sections/About';
import { Skills } from '../sections/Skills';
import { Projects } from '../sections/Projects';
import { Works } from '../sections/Works';
import { GitHubActivity } from '../sections/GitHubActivity';
import { Contact } from '../sections/Contact';
import { ScrollHighlightText } from '../components/ScrollHighlightText';
import { VelocityMarquee } from '../components/VelocityMarquee';
import { Reveal } from '../components/Reveal';
import { ParallaxLayer } from '../components/ParallaxLayer';
import { siteConfig } from '../config/site';
import { buildRepositoryUrl, PLATFORM_LABELS, SWIFT_APPS } from '../data/apps';

// 検索エンジン向けの構造化データ（Person と，公開しているアプリの一覧）
function buildStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${siteConfig.siteUrl}/#person`,
        name: siteConfig.displayName,
        alternateName: siteConfig.githubUsername,
        url: siteConfig.siteUrl,
        email: `mailto:${siteConfig.email}`,
        jobTitle: siteConfig.role,
        sameAs: [siteConfig.githubUrl],
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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStructuredData()) }}
      />
      <Hero />
      <ProductShowcase />
      <About />
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
          {/* 罫線が引かれたあと，アイデアから信頼までの流れが左から順に灯る */}
          <Reveal className="principle-footer"><span aria-hidden="true">IDEA</span><span aria-hidden="true">→</span><span aria-hidden="true">DESIGN</span><span aria-hidden="true">→</span><span aria-hidden="true">BUILD</span><span aria-hidden="true">→</span><span aria-hidden="true">TRUST</span></Reveal>
        </div>
      </section>
      <Skills />
      <Projects />
      <VelocityMarquee words={['Swift', 'SwiftUI', 'Next.js', 'TypeScript', 'Three.js', 'Canvas']} />
      <Works />
      <GitHubActivity />
      <VelocityMarquee words={["Let's build", 'something', 'trustworthy', 'together']} direction={-1} />
      <Contact />
    </>
  );
}
