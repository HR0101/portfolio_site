"use client";

import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { TiltCard } from '../components/TiltCard';
import { Marquee } from '../components/Marquee';
import { useInView } from '../hooks/useInView';
import { useCountUp } from '../hooks/useCountUp';

// 主要スキルの定義（level は 0〜100 の習熟度）
const PRIMARY_SKILLS = [
  {
    name: 'Swift',
    monogram: 'Sw',
    level: 90,
    description: 'iOS / macOS アプリ開発．GitHub に17プロダクトを公開',
    gradient: 'from-orange-300 to-red-400',
  },
  {
    name: 'Python',
    monogram: 'Py',
    level: 80,
    description: 'データ処理・自動化（AeroPath / FraTerm など3件を公開）',
    gradient: 'from-blue-300 to-amber-300',
  },
  {
    name: 'C',
    monogram: 'C',
    level: 70,
    description: '組込み開発・低レイヤプログラミング',
    gradient: 'from-slate-300 to-slate-400',
  },
  {
    name: 'Arduino',
    monogram: 'Ar',
    level: 75,
    description: '電子工作・IoTプロトタイピング',
    gradient: 'from-teal-300 to-emerald-400',
  },
];

// サブスキル（マーキーで流すタグ）
const SECONDARY_SKILLS = [
  'SwiftUI',
  'SwiftData',
  'AVFoundation',
  'WidgetKit',
  'Live Activity',
  'Bonjour / Network.framework',
  'ScreenCaptureKit',
  'MediaPipe',
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

// 習熟度バー付きのスキルカード（画面内に入ったらバーと数値をアニメーション）
function SkillBar({ skill }: SkillBarProps) {
  const { ref, isInView } = useInView<HTMLDivElement>();
  const animatedLevel = useCountUp(skill.level, isInView);

  return (
    <TiltCard className="h-full">
      <div
        ref={ref}
        className="group h-full p-6 rounded-3xl bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:shadow-soft transition-all duration-300"
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br ${skill.gradient} flex items-center justify-center text-ink font-semibold group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300`}
            aria-hidden="true"
          >
            {skill.monogram}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{skill.name}</h3>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {skill.description}
            </p>
          </div>
          <span className="shrink-0 self-start text-sm font-mono tabular-nums text-sky-700 dark:text-sky-400">
            {animatedLevel}%
          </span>
        </div>

        {/* 習熟度バー（伸びながら光沢が走る） */}
        <div
          className="relative h-2 rounded-full bg-mist dark:bg-night-border overflow-hidden"
          role="progressbar"
          aria-valuenow={skill.level}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${skill.name} の習熟度`}
        >
          <div
            className={`shimmer-sweep relative h-full rounded-full bg-gradient-to-r ${skill.gradient} transition-all duration-1000 ease-out overflow-hidden`}
            style={{ width: isInView ? `${skill.level}%` : '0%' }}
          />
        </div>
      </div>
    </TiltCard>
  );
}

export function Skills() {
  return (
    <section
      id="skills"
      data-testid="skills-section"
      className="scroll-mt-24 py-24 md:py-32 bg-mist/70 dark:bg-night-soft/40"
    >
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="02. Skills"
          title="技術スタック"
          description="iOS / macOS アプリ開発を中心に，スクリプティングから組込みまで幅広く扱います．"
        />

        {/* 主要スキル（習熟度バー） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRIMARY_SKILLS.map((skill, index) => (
            <Reveal
              key={skill.name}
              delayMs={index * STAGGER_DELAY_MS}
              variant={index % 2 === 0 ? 'left' : 'right'}
              className="h-full"
            >
              <SkillBar skill={skill} />
            </Reveal>
          ))}
        </div>
      </div>

      {/* サブスキル（途切れず流れる帯．ホバーで停止する） */}
      <Reveal delayMs={PRIMARY_SKILLS.length * STAGGER_DELAY_MS} className="mt-12">
        <Marquee items={SECONDARY_SKILLS} />
      </Reveal>
    </section>
  );
}
