import type { CSSProperties, ReactNode } from 'react';
import { Reveal } from './Reveal';
import { SplitTextReveal } from './SplitTextReveal';
import { HoverShuffle } from './HoverShuffle';
import { RevealLine } from './RevealLine';
import { PhraseReveal } from './PhraseReveal';
import { HEADING_MOTION, headingTiming } from '../lib/motionFoundation';
import { staggerDelay } from '../lib/choreography';
import styles from './SectionHeading.module.css';

interface SectionHeadingProps {
  label: string;
  title: string;
  description?: string;
  // 説明文を自前の表現で出したいとき（スクロールに合わせて灯る一文など）．渡すと description の代わりに使う
  descriptionContent?: ReactNode;
  // 見出しの語の右肩に出す件数（渡したときだけ出る）．画面に入ると数字が回って止まる
  count?: number;
  // 見出しの語の大きさ．既定は今までどおり．'display' は大きな語（件数と組み合わせる）
  size?: 'default' | 'display';
}

interface HeadingCountProps {
  count: number;
  // 登場と回転を始めるまでの遅れ（ミリ秒）
  delayMs: number;
}

// 件数．最終値は読み上げ・検索のために文字で残し，回る数字の列は読み上げから外す．
// 動きは見出しの Reveal の合図（.reveal-visible）だけで始まるので，JS を足さず，見出しの文字と同じ瞬間に揃う．
function HeadingCount({ count, delayMs }: HeadingCountProps) {
  const digits = String(count).split('').map(Number);
  return (
    <span className={styles.count} style={{ '--count-delay': `${delayMs}ms` } as CSSProperties} data-testid="heading-count">
      <span className="sr-only">{`${count}件`}</span>
      <span className={styles.digits} aria-hidden="true">
        {digits.map((digit, index) => (
          <span key={index} className={styles.digit}>
            <span className={styles.digitTrack} style={{ '--digit': digit, '--digit-index': index } as CSSProperties}>
              {Array.from({ length: digit + 1 }, (_, value) => (
                <span key={value}>{value}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

export function SectionHeading({ label, title, description, descriptionContent, count, size = 'default' }: SectionHeadingProps) {
  const sectionNumber = label.match(/^(\d+)\./)?.[1];
  const timing = headingTiming(Array.from(title).length);
  const motionStyle = {
    '--heading-label-delay': `${HEADING_MOTION.labelMs}ms`,
    '--heading-line-delay': `${HEADING_MOTION.lineMs}ms`,
    '--heading-title-delay': `${HEADING_MOTION.titleMs}ms`,
    '--heading-character-duration': `${HEADING_MOTION.characterMs}ms`,
    '--heading-character-step': `${timing.stepMs}ms`,
    '--heading-last-character': timing.lastCharacterIndex,
    '--heading-description-delay': `${timing.descriptionDelayMs}ms`,
    '--heading-description-duration': `${HEADING_MOTION.descriptionMs}ms`,
  } as CSSProperties;

  const isDisplay = size === 'display';
  // 数えられない値（NaN・負数など）は件数なしとして扱う
  const safeCount = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : undefined;
  const hasCount = safeCount !== undefined;
  // 渡さなかった見出しは，クラスも属性も今までと同じにする
  const rootClassName = ['portfolio-section-heading', hasCount ? styles.withCount : '', isDisplay ? styles.display : ''].filter(Boolean).join(' ');
  // 件数は最後の文字が立ち上がり始めるころ（全体の遅れの上限は choreography の STAGGER_CAP_MS）に出す
  const countDelayMs = Math.round(staggerDelay(timing.lastCharacterIndex, { stepMs: timing.stepMs, startMs: HEADING_MOTION.titleMs }));

  const heading = (
    <h2 className={isDisplay || hasCount ? styles.title : undefined}>
      <SplitTextReveal text={title} />
    </h2>
  );

  return (
    <Reveal className={rootClassName} style={motionStyle}>
      <RevealLine />
      <p className="portfolio-eyebrow">
        {sectionNumber && <span className="portfolio-section-number" aria-hidden="true">{sectionNumber}</span>}
        <HoverShuffle text={label.replace(/^\d+\.\s*/, '')} />
      </p>
      {hasCount ? (
        // h2 の中身は今までと同じ．件数は h2 の外の兄弟にして，見出しの読み上げを壊さない
        <div className={styles.titleRow}>
          {heading}
          <HeadingCount count={safeCount} delayMs={countDelayMs} />
        </div>
      ) : heading}
      {(descriptionContent || description) && (
        <p className="portfolio-section-description">
          {descriptionContent ?? <PhraseReveal text={description ?? ''} />}
        </p>
      )}
    </Reveal>
  );
}
