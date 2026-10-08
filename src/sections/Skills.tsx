"use client";

import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';

// 主要な言語・環境と，その使い道．
// 習熟度を自己採点した数値ではなく，実際に何をつくったかを事実として並べる
// （Apple の「技術仕様」ページと同じ，罫線で区切った仕様リストの形）．
interface SkillSpec {
  name: string;
  // 何に使っているか
  usage: string;
  // 公開しているものなど，裏づけになる事実（無い場合は空でよい）
  evidence?: string;
}

const SKILL_SPECS: SkillSpec[] = [
  {
    name: 'Swift / SwiftUI',
    usage: 'iOS・macOS アプリ開発（SwiftUI / UIKit）',
    evidence: '17プロダクト・22リポジトリを公開',
  },
  {
    name: 'Python',
    usage: 'データ処理・自動化・機械学習',
    evidence: 'AeroPath / FraTerm など3リポジトリを公開',
  },
  {
    name: 'C',
    usage: '組込み開発・低レイヤプログラミング',
  },
  {
    name: 'Arduino',
    usage: '電子工作・IoT プロトタイピング',
  },
  {
    name: 'TypeScript / Next.js',
    usage: 'Web フロントエンド開発',
    evidence: 'このポートフォリオサイト',
  },
];

// 関連して扱う技術（帯で流す）
const RELATED_TECHNOLOGIES = [
  'SwiftUI',
  'SwiftData',
  'AVFoundation',
  'WidgetKit',
  'Live Activity',
  'App Intents',
  'Bonjour / Network.framework',
  'ScreenCaptureKit',
  'MediaPipe',
  'MapKit',
  'React / Next.js',
  'Tailwind CSS',
  'Git / GitHub',
  'LaTeX',
];

// 行の段階表示に使う遅延間隔（ミリ秒）
const STAGGER_DELAY_MS = 70;

export function Skills() {
  return (
    <section
      id="skills"
      data-testid="skills-section"
      className="tinted scroll-mt-24 py-24 md:py-32 bg-mist dark:bg-night-soft/40"
    >
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="02. Skills"
          title="技術スタック"
          description="iOS / macOS アプリ開発を中心に，スクリプティングから組込みまで幅広く扱います．"
        />

        {/* 仕様リスト：左に名称，右に使い道と裏づけ．行は細い罫線で区切る */}
        <div className="tile px-6 md:px-8">
          <dl>
            {SKILL_SPECS.map((skill, index) => (
              <Reveal key={skill.name} delayMs={index * STAGGER_DELAY_MS}>
                <div
                  className={`flex flex-col gap-1 py-6 md:flex-row md:items-baseline md:gap-8 ${
                    index === 0 ? '' : 'border-t border-soft dark:border-night-border'
                  }`}
                >
                  <dt className="md:w-64 shrink-0 font-semibold text-ink dark:text-night-ink">
                    {skill.name}
                  </dt>
                  <dd className="text-body dark:text-night-body">
                    {skill.usage}
                    {skill.evidence && (
                      <span className="block mt-1 text-sm text-subtle dark:text-night-subtle">
                        {skill.evidence}
                      </span>
                    )}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>

      <Reveal className="max-w-6xl mx-auto px-6 mt-10">
        <ul className="portfolio-technologies" aria-label="関連技術">
          {RELATED_TECHNOLOGIES.map((technology) => <li key={technology}>{technology}</li>)}
        </ul>
      </Reveal>
    </section>
  );
}
