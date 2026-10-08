import { Reveal } from './Reveal';

interface SectionHeadingProps {
  label: string;
  title: string;
  description?: string;
}

export function SectionHeading({ label, title, description }: SectionHeadingProps) {
  return (
    <Reveal className="portfolio-section-heading">
      <p className="portfolio-eyebrow">{label.replace(/^\d+\.\s*/, '')}</p>
      <h2>{title}</h2>
      {description && <p className="portfolio-section-description">{description}</p>}
    </Reveal>
  );
}
