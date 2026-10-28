import { Mail } from 'lucide-react';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';
import { FooterWordmark, JapanClock } from './FooterMotion';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <a href="/#hero">{siteConfig.displayName}<span aria-hidden="true">.</span></a>
            <p>アイデアを形に。使う人に、信頼を。</p>
          </div>
          <nav className="site-footer-nav" aria-label="フッターナビゲーション">
            <a href="/#about">About</a>
            <a href="/#skills">Skills</a>
            <a href="/#projects">Apps</a>
            <a href="/#works">Works</a>
            <a href="/#contact">Contact</a>
          </nav>
        </div>
        <FooterWordmark text={`${siteConfig.displayName}.`} />
        <div className="site-footer-bottom">
          <div className="site-footer-meta">
            <p>© {currentYear} {siteConfig.displayName}. Built with Next.js &amp; Tailwind CSS.</p>
            <p><kbd>⌘K</kbd> でどこへでも移動できます．</p>
          </div>
          <div className="site-footer-social">
          <JapanClock />
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub プロフィールを開く"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle hover:bg-mist dark:hover:bg-night-soft hover:text-ink dark:hover:text-night-ink hover:scale-110 hover:-rotate-6 transition-all duration-300"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
          <a
            href={`mailto:${siteConfig.email}`}
            aria-label="メールを送る"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle hover:bg-mist dark:hover:bg-night-soft hover:text-ink dark:hover:text-night-ink hover:scale-110 hover:rotate-6 transition-all duration-300"
          >
            <Mail className="w-5 h-5" />
          </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
