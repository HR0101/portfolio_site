import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';

const SPOTLIGHT_NAMES = ['Subghost', 'BusTimeApp', 'Tsumugi', 'TeleDeck'];
const spotlightApps = SPOTLIGHT_NAMES.flatMap((name) => {
  const app = SWIFT_APPS.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return app?.imageSrc ? [app] : [];
});

export function Hero() {
  return (
    <section id="hero" data-testid="hero-section" className="portfolio-hero">
      <div className="portfolio-hero-copy">
        <p className="portfolio-eyebrow">{siteConfig.displayName} · iOS & macOS Developer</p>
        <h1>信頼を、<br /><span>コードで築く。</span></h1>
        <p className="portfolio-hero-lead">日々の「あったらいいな」を、使い続けたいアプリへ。</p>
        <p className="portfolio-hero-description">iPhoneとMacのために。企画からデザイン、<br className="sm:hidden" />Swift / SwiftUIでの実装まで。</p>
        <div className="portfolio-hero-actions">
          <a className="portfolio-primary" href="#showcase">アプリを見る <ArrowRight size={17} aria-hidden="true" /></a>
          <a className="portfolio-text-link" href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">GitHubでコードを見る <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="portfolio-app-shelf" aria-label="注目のアプリ">
        {spotlightApps.map((app) => (
          <Link key={app.name} href={app.detailHref ?? '#projects'} className="portfolio-app-link">
            <img src={app.imageSrc} alt="" width={112} height={112} fetchPriority={app.name === 'BusTimeApp' ? 'high' : undefined} />
            <span>{app.name}</span>
          </Link>
        ))}
      </div>
      <dl className="portfolio-stats">
        <div><dt>公開プロダクト</dt><dd>{SWIFT_APPS.length}</dd></div>
        <div><dt>開発言語・フレームワーク</dt><dd>Swift / SwiftUI</dd></div>
        <div><dt>対応プラットフォーム</dt><dd>iPhone & Mac</dd></div>
      </dl>
    </section>
  );
}
