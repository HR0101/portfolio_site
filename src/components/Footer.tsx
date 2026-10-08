import { Mail } from 'lucide-react';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-mist dark:bg-night-soft py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-subtle dark:text-night-subtle text-center md:text-left">
          <p>© {currentYear} {siteConfig.displayName}. Built with Next.js &amp; Tailwind CSS.</p>
          {/* コマンドパレットの存在を知らせる小さなヒント */}
          <p className="mt-1 text-xs">
            <kbd className="px-1.5 py-0.5 rounded-md font-mono bg-mist dark:bg-night border border-soft dark:border-night-border">
              ⌘K
            </kbd>{' '}
            でどこへでも移動できます．
          </p>
        </div>
        <div className="flex items-center gap-1">
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
    </footer>
  );
}
