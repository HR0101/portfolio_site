import { Hero } from '../sections/Hero';
import { ProductShowcase } from '../sections/ProductShowcase';
import { About } from '../sections/About';
import { Skills } from '../sections/Skills';
import { Projects } from '../sections/Projects';
import { GitHubActivity } from '../sections/GitHubActivity';
import { Contact } from '../sections/Contact';
import { ScrollHighlightText } from '../components/ScrollHighlightText';
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
      {/* 構造化データ（検索結果でアプリ一覧として認識されやすくする） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStructuredData()) }}
      />
      <Hero />
      <ProductShowcase />
      <About />

      {/* スクロールに合わせて1語ずつ明るくなる一文 */}
      <section className="py-24 md:py-32" aria-label="制作の姿勢">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollHighlightText
            text={'「あったらいいな」を，/自分の手で形にする．/使う人が迷わない導線と，/こわれにくい実装で，/小さな信頼を積み上げていく．'}
            className="text-2xl md:text-4xl font-semibold leading-[1.7] tracking-tight"
          />
        </div>
      </section>

      <Skills />
      <Projects />
      <GitHubActivity />
      <Contact />
    </>
  );
}
