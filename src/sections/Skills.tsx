"use client";

import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { useInView } from '../hooks/useInView';

// 主要スキルの定義（level は 0〜100 の習熟度）
const PRIMARY_SKILLS = [
  {
    name: 'Swift',
    monogram: 'Sw',
    level: 90,
    description: 'iOSアプリ開発（SwiftUI / UIKit）',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    name: 'Python',
    monogram: 'Py',
    level: 80,
    description: 'データ処理・自動化・機械学習',
    gradient: 'from-blue-400 to-amber-400',
  },
  {
    name: 'C',
    monogram: 'C',
    level: 70,
    description: '組込み開発・低レイヤプログラミング',
    gradient: 'from-slate-400 to-slate-600',
  },
  {
    name: 'Arduino',
    monogram: 'Ar',
    level: 75,
    description: '電子工作・IoTプロトタイピング',
    gradient: 'from-teal-400 to-emerald-500',
  },
];

// サブスキル（タグ表示）
const SECONDARY_SKILLS = [
  'SwiftUI',
  'SwiftData',
  'AVFoundation',
  'WidgetKit',
  'Bonjour / Network.framework',
  'TypeScript',
  'React / Next.js',
  'Tailwind CSS',
  'Git / GitHub',
  'LaTeX',
];

// カードの段階表示に使う遅延間隔（ミリ秒）
const STAGGER_DELAY_MS = 100;

interface SkillBarProps {
  skill: (typeof PRIMARY_SKILLS)[number];
}

// 習熟度バー付きのスキルカード（画面内に入ったらバーをアニメーション）
function SkillBar({ skill }: SkillBarProps) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="p-6 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 transition-colors duration-300"
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${skill.gradient} flex items-center justify-center text-white font-bold`}
          aria-hidden="true"
        >
          {skill.monogram}
        </div>
        <div className="min-w-0">
          <h3 className="font-bold">{skill.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {skill.description}
          </p>
        </div>
        <span className="ml-auto text-sm font-mono text-sky-600 dark:text-sky-400">
          {skill.level}%
        </span>
      </div>

      {/* 習熟度バー */}
      <div
        className="h-2 rounded-full bg-slate-200 dark:bg-night-border overflow-hidden"
        role="progressbar"
        aria-valuenow={skill.level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${skill.name} の習熟度`}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r ${skill.gradient} transition-all duration-1000 ease-out`}
          style={{ width: isInView ? `${skill.level}%` : '0%' }}
        />
      </div>
    </div>
  );
}

export function Skills() {
  return (
    <section
      id="skills"
      data-testid="skills-section"
      className="scroll-mt-24 py-24 md:py-32 bg-slate-100/60 dark:bg-night-soft/40"
    >
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="02. Skills"
          title="技術スタック"
          description="iOSアプリ開発を中心に，スクリプティングから組込みまで幅広く扱います．"
        />

        {/* 主要スキル（習熟度バー） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRIMARY_SKILLS.map((skill, index) => (
            <Reveal key={skill.name} delayMs={index * STAGGER_DELAY_MS}>
              <SkillBar skill={skill} />
            </Reveal>
          ))}
        </div>

        {/* サブスキル（タグ） */}
        <Reveal delayMs={PRIMARY_SKILLS.length * STAGGER_DELAY_MS} className="mt-10">
          <div className="flex flex-wrap gap-3">
            {SECONDARY_SKILLS.map((skillName) => (
              <span
                key={skillName}
                className="px-4 py-2 text-sm rounded-full bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border text-slate-600 dark:text-slate-300"
              >
                {skillName}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
