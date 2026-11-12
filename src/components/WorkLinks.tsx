import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { RollLabel } from './RollLabel';
import { ArrowSwap } from './ArrowSwap';
import { GitHubIcon } from './icons/GitHubIcon';
import { siteConfig } from '../config/site';
import { buildRepositoryUrl } from '../data/apps';
import type { Work } from '../data/works';

// 外部サイトと GitHub へのリンク一式
export function WorkLinks({ work }: { work: Work }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {work.detailHref && (
        <Link
          href={work.detailHref}
          className="arrow-swap-host inline-flex items-center gap-2 rounded-full bg-ink dark:bg-night-ink text-white dark:text-night px-5 py-2.5 text-sm font-semibold"
        >
          紹介ページを見る
          <ArrowSwap />
        </Link>
      )}
      <a
        href={work.url}
        target="_blank"
        rel="noopener noreferrer"
        className="roll-label-host inline-flex items-center gap-1.5 rounded-full border border-soft dark:border-night-border bg-white dark:bg-night-soft px-5 py-2.5 text-sm font-semibold text-ink dark:text-night-ink transition-colors hover:border-ink dark:hover:border-night-ink"
      >
        <RollLabel text={work.kind === 'game' ? 'あそぶ' : work.host} />
        <ArrowUpRight size={15} aria-hidden="true" />
        <span className="sr-only">（新しいタブで開きます）</span>
      </a>
      {work.repository && (
        <a
          href={buildRepositoryUrl(siteConfig.githubUsername, work.repository)}
          target="_blank"
          rel="noopener noreferrer"
          className="line-sweep-host inline-flex items-center gap-1.5 px-2 py-2.5 text-sm text-subtle dark:text-night-subtle hover:text-ink dark:hover:text-night-ink transition-colors"
        >
          <GitHubIcon className="w-4 h-4" />
          <span className="line-sweep">ソースコード</span>
          <span className="sr-only">（GitHub・新しいタブで開きます）</span>
        </a>
      )}
    </div>
  );
}
