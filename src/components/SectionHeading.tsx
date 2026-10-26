import { Reveal } from './Reveal';
import { SplitTextReveal } from './SplitTextReveal';
import { ScrambleText } from './ScrambleText';
import { PhraseReveal } from './PhraseReveal';

interface SectionHeadingProps {
  label: string;
  title: string;
  description?: string;
}

export function SectionHeading({ label, title, description }: SectionHeadingProps) {
  return (
    <Reveal className="portfolio-section-heading">
      <p className="portfolio-eyebrow">
        <ScrambleText text={label.replace(/^\d+\.\s*/, '')} />
      </p>
      <h2>
        <SplitTextReveal text={title} />
      </h2>
      {description && (
        <p className="portfolio-section-description">
          <PhraseReveal text={description} />
        </p>
      )}
    </Reveal>
  );
}
