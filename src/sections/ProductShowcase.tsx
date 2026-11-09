'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUpRight, ChevronRight } from 'lucide-react';
import { SWIFT_APPS, buildRepositoryUrl } from '../data/apps';
import { siteConfig } from '../config/site';
import { DotPlanet, type DotPlanetHandle } from '../components/DotPlanet';
import { subscribeToScroll } from '../lib/scrollObserver';
import { getShowcaseChapterOffset, getShowcaseScrollState } from '../lib/showcaseStory';
import { getHeroPlanetFrame, getPlanetJourneyDetail, getPlanetJourneyFrame } from '../lib/planetJourney';
import { getAboutPlanetTarget, registerSharedPlanet } from '../lib/sharedPlanet';
import './ProductShowcase.css';

const STORIES = [
  {
    name: 'BusTimeApp', headline: ['次のバスへ。', '迷わず、まっすぐ。'],
    copy: 'いま乗れる便を、ひと目で。アプリからウィジェットまで、毎日の移動に寄り添う時刻表。',
    detail: '現在地と時間帯から、いま必要な経路を案内。',
    feature: 'Live Activity / WidgetKit', width: 840, height: 1826,
    parts: [['WidgetKit', 'ホーム画面から、次の便へ。'], ['Live Activity', '移動中も、必要な情報を。']],
  },
  {
    name: 'TeleDeck', headline: ['いつものiPadが、', 'Macの操作デッキに。'],
    copy: 'ショートカットも、トラックパッドも。自分だけの操作パネルで、Macの作業をもっと手元に。',
    detail: 'QRコードでペアリング。ボタンは自由に組み替え。',
    feature: 'Bonjour / Keychain', width: 2752, height: 2064,
    parts: [['Bonjour', '近くのMacとつながる。'], ['操作パネル', 'よく使う操作を、手元に。']],
  },
  {
    name: 'Tsumugi', headline: ['気になる記事を、', '理解に変える。'],
    copy: '保存したその場で、要約と情報の診断を。読む、考える、振り返るを、ひとつの流れに。',
    detail: '要約・信頼度・鮮度の解析が、端末内で完結。',
    feature: 'Share Extension / 端末内解析', width: 1206, height: 2622,
    parts: [['Share Extension', '気になる記事を、その場で保存。'], ['端末内解析', '要約も診断も、デバイスの中で。']],
  },
].map(story => {
  const app = SWIFT_APPS.find(item => item.name === story.name);
  if (!app?.screenshotSrc) throw new Error(`Missing showcase screen: ${story.name}`);
  return { ...story, app };
});

const STICKY_TOP = 64;
const SCROLL_QUERY = '(min-width: 960px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';

export function ProductShowcase() {
  const [selection, setSelection] = useState({ index: 0, input: 'direct' });
  const active = selection.index;
  const activeRef = useRef(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLElement>(null);
  const planet = useRef<DotPlanetHandle>(null);
  const progressLine = useRef<HTMLSpanElement>(null);
  const glassReflection = useRef<HTMLSpanElement>(null);
  const scrollEnabled = useRef(false);
  const selected = STORIES[active];

  const activate = useCallback((index: number, input: 'scroll' | 'direct') => {
    activeRef.current = index;
    setSelection(previous => previous.index === index && previous.input === input ? previous : { index, input });
  }, []);

  useEffect(() => {
    const runway = track.current;
    const viewport = stage.current;
    const destination = world.current;
    const hero = document.getElementById('hero');
    const source = hero?.querySelector<HTMLElement>('[data-planet-start]');
    const heroStage = hero?.querySelector<HTMLElement>('[data-hero-stage]');
    if (!runway || !viewport || !destination || !hero || !source || !heroStage) return;
    const media = matchMedia(SCROLL_QUERY);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let unsubscribe = () => {};
    // 自己紹介（About）が，同じ惑星を預かれるように，共有の置き場へ登録する
    registerSharedPlanet(planet.current);
    const measure = () => {
      const bounds = runway.getBoundingClientRect();
      const state = getShowcaseScrollState(bounds.top, bounds.height, viewport.offsetHeight, STICKY_TOP, STORIES.length);
      if (scrollEnabled.current && state.index !== activeRef.current) activate(state.index, 'scroll');
      if (progressLine.current) progressLine.current.style.transform = `scaleX(${state.progress})`;

      const sourceBounds = source.getBoundingClientRect();
      const heroBounds = hero.getBoundingClientRect();
      const heroStageBounds = heroStage.getBoundingClientRect();
      const worldBounds = destination.getBoundingClientRect();
      const viewportBounds = viewport.getBoundingClientRect();
      if (glassReflection.current) {
        // Each chapter gets one reversible light pass. Both ends are invisible,
        // so changing apps doesn't expose the reflection returning to its start.
        const pass = scrollEnabled.current
          ? bounds.top > STICKY_TOP
            ? (innerHeight - bounds.top) / Math.max(1, innerHeight - STICKY_TOP)
            : state.chapterProgress
          : (innerHeight - worldBounds.top) / Math.max(1, innerHeight + worldBounds.height);
        const light = Math.min(1, Math.max(0, pass));
        glassReflection.current.style.transform = `translate3d(${(light * 2 - 1) * 65}%, 0, 0) rotate(-18deg)`;
        glassReflection.current.style.opacity = reduced.matches ? '0' : String(Math.sin(light * Math.PI) * .36);
      }
      const heroTop = heroBounds.top + window.scrollY;
      const startFrame = getHeroPlanetFrame({
        left: sourceBounds.left, top: heroTop + sourceBounds.top - heroStageBounds.top,
        width: sourceBounds.width, height: sourceBounds.height,
      }, document.documentElement.clientWidth, innerHeight);
      const destinationTop = scrollEnabled.current
        ? STICKY_TOP + worldBounds.top - viewportBounds.top
        : (innerHeight - worldBounds.width) / 2;
      const endFrame = { left: worldBounds.left, top: destinationTop, size: worldBounds.width };
      const startScroll = Math.max(heroTop + innerHeight * .12, sourceBounds.top + window.scrollY - innerHeight * .65);
      const endScroll = scrollEnabled.current
        ? bounds.top + window.scrollY - STICKY_TOP
        : worldBounds.top + window.scrollY - destinationTop;
      const flight = Math.min(1, Math.max(0, (window.scrollY - startScroll) / Math.max(innerHeight * .5, endScroll - startScroll)));
      const localFrame = { left: worldBounds.left, top: worldBounds.top, size: worldBounds.width };
      // 自己紹介（固定表示のとき）の最初のカードの角が，惑星の着地点．自己紹介の固定表示が始まったあとは，
      // 惑星の位置・向き・色は自己紹介が決めるので，ここでは何も書かない（同じ位置で引き継がれる）
      const about = !reduced.matches && scrollEnabled.current ? getAboutPlanetTarget() : null;
      if (about?.owns) return;
      planet.current?.setDetail(reduced.matches ? Number(sourceBounds.bottom > STICKY_TOP) : getPlanetJourneyDetail(flight));
      // アプリ紹介の固定表示が終わってから，自己紹介の固定表示が始まるまでの間（0〜1）に，
      // 同じ惑星が，その場から自己紹介の最初のカードの角まで飛んでいく
      const showcaseEnd = bounds.top + window.scrollY - STICKY_TOP + (bounds.height - viewport.offsetHeight);
      const exit = about ? Math.min(1, Math.max(0, (window.scrollY - showcaseEnd) / Math.max(1, about.startScroll - showcaseEnd))) : 0;
      planet.current?.setAutoRotate(!reduced.matches && (flight < 1 || exit > 0));
      // 暗いカードの中へ入る後半で，ページの色から暗い面の色（白い点＋暗い球の本体）へ移す
      const landing = Math.min(1, Math.max(0, (exit - .45) / .5));
      planet.current?.setTone(1 - landing * landing * (3 - 2 * landing));
      planet.current?.setHeroVisibility(reduced.matches
        ? Number(sourceBounds.bottom > STICKY_TOP)
        : Math.min(1, Math.max(0, (.9 - flight) / .25)));
      if (reduced.matches) {
        // Two static placements; no animated transfer for reduced motion.
        planet.current?.setFrame(sourceBounds.bottom > STICKY_TOP
          ? { ...startFrame, top: sourceBounds.top + sourceBounds.height / 2 - startFrame.size / 2 }
          : localFrame);
        planet.current?.setProgress(0);
      } else {
        let frame = flight < 1 ? getPlanetJourneyFrame(startFrame, endFrame, flight) : localFrame;
        if (about && exit > 0) {
          // 抜けたあとも，惑星は画面の同じ位置に残り（アプリ紹介の画面だけが上へ流れていく），そこから着地点へ向かう
          const held = { left: worldBounds.left, top: worldBounds.top + (window.scrollY - showcaseEnd), size: worldBounds.width };
          frame = getPlanetJourneyFrame(held, { left: about.left, top: about.top, size: about.size }, exit);
        }
        planet.current?.setFrame(frame);
        planet.current?.setProgress(flight * .35 + (scrollEnabled.current ? state.progress * .65 : 0));
      }
    };
    const configure = () => {
      unsubscribe();
      scrollEnabled.current = media.matches;
      runway.toggleAttribute('data-scroll-story', media.matches);
      unsubscribe = subscribeToScroll(measure);
    };
    configure();
    media.addEventListener('change', configure);
    reduced.addEventListener('change', measure);
    const resize = new ResizeObserver(measure);
    resize.observe(runway); resize.observe(viewport); resize.observe(source); resize.observe(destination);
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('pageshow', measure);
    return () => { registerSharedPlanet(null); unsubscribe(); resize.disconnect(); media.removeEventListener('change', configure); reduced.removeEventListener('change', measure); window.removeEventListener('resize', measure); window.removeEventListener('pageshow', measure); };
  }, [activate]);

  function select(index: number) {
    activate(index, 'direct');
    const runway = track.current;
    const viewport = stage.current;
    if (!scrollEnabled.current || !runway || !viewport) return;
    const bounds = runway.getBoundingClientRect();
    const start = window.scrollY + bounds.top - STICKY_TOP;
    const travel = bounds.height - viewport.offsetHeight;
    window.scrollTo({ top: start + getShowcaseChapterOffset(index, STORIES.length, travel), behavior: 'instant' });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % STORIES.length; break;
      case 'ArrowLeft': next = (index - 1 + STORIES.length) % STORIES.length; break;
      case 'Home': next = 0; break;
      case 'End': next = STORIES.length - 1; break;
      default: return;
    }
    event.preventDefault(); select(next); tabs.current[next]?.focus({ preventScroll: true });
  }

  const external = !selected.app.detailHref;
  return (
    <section id="showcase" className="product-showcase" aria-labelledby="showcase-heading">
      <div ref={track} className="showcase-scroll-track">
        <div ref={stage} className="showcase-stage" data-input={selection.input} data-active-app={selected.name}>
          <header className="showcase-heading-row">
            <div><p className="showcase-eyebrow">SELECTED APPS</p><h2 id="showcase-heading">日常に、小さな進化を。</h2></div>
            <a href="#projects" className="showcase-catalog-link">すべてのアプリを見る <ChevronRight size={17} aria-hidden="true" /></a>
          </header>
          <div className="showcase-navigation">
            <div className="showcase-tabs" role="tablist" aria-label="注目アプリを選択">
              {STORIES.map((story, index) => (
                <button key={story.name} ref={node => { tabs.current[index] = node; }} type="button" role="tab"
                  id={`showcase-tab-${index}`} aria-selected={index === active} aria-controls="showcase-active-panel"
                  tabIndex={index === active ? 0 : -1} onClick={() => select(index)} onKeyDown={event => handleKeyDown(event, index)}>
                  <span aria-hidden="true">0{index + 1}</span>{story.name}
                </button>
              ))}
            </div>
            <span className="showcase-counter" aria-hidden="true">0{active + 1} / 03</span>
          </div>

          <div id="showcase-active-panel" className="showcase-scene" role="tabpanel" aria-labelledby={`showcase-tab-${active}`}>
            <div className="showcase-copy-stack">
              {STORIES.map((story, index) => (
                <div key={story.name} className="showcase-story-layer showcase-copy" data-active={index === active} aria-hidden={index !== active}>
                  <div className="showcase-app-name"><img src={story.app.imageSrc} alt="" width={32} height={32} loading="lazy" /><span>{story.name}</span></div>
                  <h3>{story.headline[0]}<br />{story.headline[1]}</h3>
                  <p>{story.copy}</p>
                </div>
              ))}
            </div>

            <figure ref={world} className="showcase-world" aria-label={`${selected.name}の実際のアプリ画面`}>
              <div className="showcase-orbit showcase-orbit-back" aria-hidden="true" />
              <DotPlanet ref={planet} className="showcase-planet" />
              <div className="showcase-display" data-testid="showcase-persistent-display"
                data-device={selected.width < selected.height ? 'phone' : 'tablet'}
                style={{ '--showcase-screen-ratio': `${selected.width} / ${selected.height}` } as CSSProperties}>
                <div className="showcase-display-header" aria-hidden="true"><i /></div>
                <div className="showcase-display-screen">
                  {STORIES.map((story, index) => (
                    <img key={story.name} className="showcase-story-layer showcase-screen-layer" data-active={index === active}
                      aria-hidden={index !== active} src={story.app.screenshotSrc} alt={story.app.screenshotAlt ?? `${story.name}の画面`}
                      width={story.width} height={story.height} loading="lazy" decoding="async" />
                  ))}
                  <span ref={glassReflection} className="showcase-glass-reflection" aria-hidden="true" />
                </div>
                <div className="showcase-display-base" aria-hidden="true"><span /></div>
              </div>
              {STORIES.map((story, index) => (
                <div key={story.name} className={`showcase-satellite showcase-satellite-${index}`} data-active={index === active} aria-hidden="true">
                  <img src={story.app.imageSrc} alt="" width={34} height={34} loading="lazy" />
                  <span>0{index + 1}</span>
                </div>
              ))}
              <figcaption>実際のアプリ画面</figcaption>
            </figure>

            <div className="showcase-information">
              <div className="showcase-notes-stack">
                {STORIES.map((story, index) => (
                  <div key={story.name} className="showcase-story-layer showcase-notes" data-active={index === active} aria-hidden={index !== active}>
                    <p className="showcase-note-intro">{story.detail}</p>
                    <dl>{story.parts.map(([title, description]) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl>
                    <p className="showcase-technology">{story.feature}</p>
                  </div>
                ))}
              </div>
              <a className="showcase-source-link" href={selected.app.detailHref ?? buildRepositoryUrl(siteConfig.githubUsername, selected.app.repositories[0].name)}
                target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
                {external ? `${selected.name}のソースコード` : `${selected.name}を詳しく`}
                <ArrowUpRight size={16} aria-hidden="true" />
                {external && <span className="sr-only">（新しいタブで開きます）</span>}
              </a>
            </div>
          </div>

          <footer className="showcase-footer">
            <p className="showcase-scroll-hint"><ArrowDown size={13} aria-hidden="true" />スクロールで次のアプリへ</p>
            <p className="showcase-select-hint">アプリ名を選ぶと切り替わります</p>
            <div className="showcase-progress" aria-hidden="true"><span ref={progressLine} /></div>
            <a href="#about">自己紹介へ進む <ChevronRight size={14} aria-hidden="true" /></a>
          </footer>
        </div>
      </div>
    </section>
  );
}
