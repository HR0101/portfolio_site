import { Reveal } from './Reveal';

// 各セクション共通の見出しブロック
interface SectionHeadingProps {
  // セクション番号付きの小見出し（例: "01. About Me"）
  label: string;
  // メインタイトル
  title: string;
  // 補足説明（任意）
  description?: string;
}

export function SectionHeading({ label, title, description }: SectionHeadingProps) {
  return (
    <Reveal className="mb-12 md:mb-16">
      <p className="text-sm font-semibold tracking-widest text-sky-600 dark:text-sky-400 uppercase mb-3">
        {label}
      </p>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      )}
    </Reveal>
  );
}
