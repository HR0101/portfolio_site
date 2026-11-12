import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NOTES, NOTES_PATH } from '../../../data/notes';
import { NOTE_CONTENT } from '../../../sections/notes/content';
import { NoteLayout } from '../../../sections/notes/NoteLayout';
import { NoteSection } from '../../../sections/notes/NoteSection';
import { CodeSnippet } from '../../../sections/notes/CodeSnippet';
import { OperatingDayFigure } from '../../../sections/notes/OperatingDayFigure';
import { HookFigure, PrivacyFigure } from '../../../sections/notes/DataFlowFigures';
import { FairnessFigure } from '../../../sections/notes/FairnessFigure';
import { PlanetJourneyFigure } from '../../../sections/notes/PlanetJourneyFigure';
import { VerificationFigure } from '../../../sections/notes/VerificationFigure';

interface NotePageProps {
  params: Promise<{ slug: string }>;
}

// 静的書き出しで全記事を生成し，一覧にない slug は404にします．
export const dynamicParams = false;

export function generateStaticParams() {
  return NOTES.map(note => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = NOTES.find(item => item.slug === slug);
  if (!note) notFound();
  const url = `${NOTES_PATH}/${note.slug}/`;
  return {
    title: `${note.title} | 制作ノート`,
    description: note.summary,
    alternates: { canonical: url },
    openGraph: { title: note.title, description: note.summary, url, type: 'article', tags: note.tags },
  };
}

const FIGURES = {
  'operating-day': OperatingDayFigure,
  privacy: PrivacyFigure,
  hooks: HookFigure,
  fairness: FairnessFigure,
  planet: PlanetJourneyFigure,
  verification: VerificationFigure,
};

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const note = NOTES.find(item => item.slug === slug);
  const content = NOTE_CONTENT[slug];
  if (!note || !content) notFound();
  const Figure = FIGURES[note.figure];
  return (
    <NoteLayout note={note}>
      <NoteSection id="problem" title="課題">{content.problem.map(text => <p key={text}>{text}</p>)}</NoteSection>
      <NoteSection id="constraints" title="制約">{content.constraints.map(text => <p key={text}>{text}</p>)}</NoteSection>
      <NoteSection id="decision" title="判断">
        {content.decision.map(text => <p key={text}>{text}</p>)}
        {content.snippet && <CodeSnippet {...content.snippet} />}
      </NoteSection>
      <NoteSection id="figure" title="図を試す"><Figure /></NoteSection>
      <NoteSection id="verified" title="確かめたこと">{content.verified.map(text => <p key={text}>{text}</p>)}</NoteSection>
    </NoteLayout>
  );
}
