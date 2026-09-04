import { Mail } from 'lucide-react';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-soft dark:border-night-border py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          © {currentYear} {siteConfig.displayName}. Built with Next.js &amp; Tailwind CSS.
        </p>
        <div className="flex items-center gap-1">
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub プロフィールを開く"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-mist dark:hover:bg-night-soft hover:text-sky-700 dark:hover:text-sky-400 hover:scale-110 hover:-rotate-6 transition-all duration-300"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
          <a
            href={`mailto:${siteConfig.email}`}
            aria-label="メールを送る"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-mist dark:hover:bg-night-soft hover:text-sky-700 dark:hover:text-sky-400 hover:scale-110 hover:rotate-6 transition-all duration-300"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
