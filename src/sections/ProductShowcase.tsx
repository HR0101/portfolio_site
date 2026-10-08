'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { SWIFT_APPS, buildRepositoryUrl } from '../data/apps';
import { siteConfig } from '../config/site';
import { clamp, subscribeToScroll } from '../lib/scrollObserver';
import './ProductShowcase.css';

const STORIES = [
  {
    name: 'BusTimeApp',
    headline: ['次のバスへ。', '迷わず、まっすぐ。'],
    copy: 'いま乗れる便を、ひと目で。アプリからウィジェットまで、毎日の移動に寄り添う時刻表。',
    detail: '現在地と時間帯から、いま必要な経路を案内。',
    feature: 'Live Activity / WidgetKit',
    device: 'phone',
    tone: 'blue',
    parts: [['WidgetKit', 'ホーム画面から、次の便へ。'], ['Live Activity', '移動中も、必要な情報を。']],
  },
  {
    name: 'TeleDeck',
    headline: ['いつものiPadが、', 'Macの操作デッキに。'],
    copy: 'ショートカットも、トラックパッドも。自分だけの操作パネルで、Macの作業をもっと手元に。',
    detail: 'QRコードでペアリング。ボタンは自由に組み替え。',
    feature: 'Bonjour / Keychain',
    device: 'tablet',
    tone: 'violet',
    parts: [['Bonjour', '近くのMacとつながる。'], ['操作パネル', 'よく使う操作を、手元に。']],
  },
  {
    name: 'Tsumugi',
    headline: ['気になる記事を、', '理解に変える。'],
    copy: '保存したその場で、要約と情報の診断を。読む、考える、振り返るを、ひとつの流れに。',
    detail: '要約・信頼度・鮮度の解析が、端末内で完結。',
    feature: 'Share Extension / 端末内解析',
    device: 'phone',
    tone: 'mint',
    parts: [['Share Extension', '気になる記事を、その場で保存。'], ['端末内解析', '要約も診断も、デバイスの中で。']],
  },
] as const;

export function ProductShowcase() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const track = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    // CSS と同じ条件で固定する。毎フレームの React 再描画は行わない。
    const motion = window.matchMedia('(min-width: 960px) and (min-height: 800px) and (prefers-reduced-motion: no-preference)');
    let unsubscribe: (() => void) | undefined;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const panel = element.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])');
      if (!panel) return;
      const travel = bounds.height - panel.offsetHeight;
      const progress = clamp((88 - bounds.top) / Math.max(1, travel));
      element.style.setProperty('--story-progress', progress.toFixed(4));
    };
    const configure = () => {
      unsubscribe?.();
      unsubscribe = undefined;
      element.toggleAttribute('data-scroll-story', motion.matches);
      if (motion.matches) unsubscribe = subscribeToScroll(measure);
      else element.style.removeProperty('--story-progress');
    };
    configure();
    motion.addEventListener('change', configure);
    const observer = new ResizeObserver(() => { if (motion.matches) measure(); });
    observer.observe(element);
    return () => {
      unsubscribe?.();
      observer.disconnect();
      motion.removeEventListener('change', configure);
    };
  }, [active]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % STORIES.length; break;
      case 'ArrowLeft': next = (index - 1 + STORIES.length) % STORIES.length; break;
      case 'Home': next = 0; break;
      case 'End': next = STORIES.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section id="showcase" className="product-showcase" aria-labelledby="showcase-heading">
      <div className="showcase-heading-row">
        <div>
          <p className="showcase-eyebrow">SELECTED APPS</p>
          <h2 id="showcase-heading">日常に、小さな進化を。</h2>
        </div>
        <a href="#projects" className="showcase-catalog-link">
          すべてのアプリを見る <ChevronRight size={17} aria-hidden="true" />
        </a>
      </div>

      <div className="showcase-tabs" role="tablist" aria-label="注目アプリを選択">
        {STORIES.map((story, index) => (
          <button
            key={story.name}
            ref={(node) => { tabs.current[index] = node; }}
            type="button"
            role="tab"
            id={`showcase-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`showcase-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {story.name}
          </button>
        ))}
      </div>

      <div className="showcase-scroll-track" ref={track}>
      {STORIES.map((story, index) => {
        const app = SWIFT_APPS.find((item) => item.name === story.name);
        if (!app?.screenshotSrc) return null;
        return (
          <div
            key={story.name}
            id={`showcase-panel-${index}`}
            role="tabpanel"
            aria-labelledby={`showcase-tab-${index}`}
            hidden={active !== index}
            tabIndex={0}
            className={`showcase-panel showcase-tone-${story.tone}`}
          >
            <div className="showcase-copy">
              <div className="showcase-app-name">
                <img src={app.imageSrc} alt="" width={36} height={36} loading="lazy" />
                <span>{app.name}</span>
              </div>
              <h3>{story.headline[0]}<br />{story.headline[1]}</h3>
              <p>{story.copy}</p>
              {app.detailHref ? (
                <Link className="showcase-source-link" href={app.detailHref}>
                  {app.name}を詳しく <ChevronRight size={17} aria-hidden="true" />
                </Link>
              ) : (
              <a
                className="showcase-source-link"
                href={buildRepositoryUrl(siteConfig.githubUsername, app.repositories[0].name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${app.name}のソースコードをGitHubで見る（新しいタブ）`}
              >
                GitHubで詳しく <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              )}
              <div className="showcase-detail">
                <p>{story.detail}</p>
                <span>{story.feature}</span>
              </div>
            </div>
            <figure className={`showcase-visual showcase-visual-${story.device}`}>
              <div className="showcase-ambient" aria-hidden="true" />
              <div className={`showcase-device showcase-device-${story.device}`}>
                <img
                  src={app.screenshotSrc}
                  alt={app.screenshotAlt ?? `${app.name}の画面`}
                  width={story.device === 'phone' ? 1206 : 2752}
                  height={story.device === 'phone' ? 2622 : 2064}
                  loading="lazy"
                  decoding="async"
                />
                <div className="showcase-glass" aria-hidden="true" />
              </div>
              <div className="showcase-parts" aria-label={`${app.name}の主な機能`}>
                {story.parts.map(([title, description], partIndex) => (
                  <div className={`showcase-part showcase-part-${partIndex}`} key={title}>
                    <span className="showcase-part-dot" aria-hidden="true" />
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                ))}
              </div>
              <figcaption>実際のアプリ画面</figcaption>
            </figure>
          </div>
        );
      })}
      </div>
    </section>
  );
}
