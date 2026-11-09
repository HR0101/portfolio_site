import type { ReactNode } from 'react';
import { Reveal } from './Reveal';
import { SplitTextReveal } from './SplitTextReveal';
import { HoverShuffle } from './HoverShuffle';
import { RevealLine } from './RevealLine';
import { PhraseReveal } from './PhraseReveal';

interface SectionHeadingProps {
  label: string;
  title: string;
  description?: string;
  // 説明文を自前の表現で出したいとき（スクロールに合わせて灯る一文など）．渡すと description の代わりに使う
  descriptionContent?: ReactNode;
}

export function SectionHeading({ label, title, description, descriptionContent }: SectionHeadingProps) {
  const sectionNumber = label.match(/^(\d+)\./)?.[1];
  return (
    <Reveal className="portfolio-section-heading">
      <RevealLine />
      <p className="portfolio-eyebrow">
        {sectionNumber && <span className="portfolio-section-number" aria-hidden="true">{sectionNumber}</span>}
        <HoverShuffle text={label.replace(/^\d+\.\s*/, '')} />
      </p>
      <h2>
        <SplitTextReveal text={title} />
      </h2>
      {(descriptionContent || description) && (
        <p className="portfolio-section-description">
          {descriptionContent ?? <PhraseReveal text={description ?? ''} />}
        </p>
      )}
    </Reveal>
  );
}
