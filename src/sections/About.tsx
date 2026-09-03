import { Cpu, GraduationCap, HeartHandshake, Smartphone } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';

// カードの段階表示に使う遅延間隔（ミリ秒）
const STAGGER_DELAY_MS = 100;

// About カードの定義
const ABOUT_CARDS = [
  {
    icon: GraduationCap,
    title: '情報系の学生',
    description:
      '大学で情報工学を学びながら，授業の枠を超えて日々新しい技術を吸収しています．',
  },
  {
    icon: Smartphone,
    title: 'iOS / macOSアプリ開発',
    description:
      'Swift / SwiftUI で iPhone・Mac 両方のアプリを個人開発し，GitHub にすべて公開しています．',
  },
  {
    icon: Cpu,
    title: '組込み・電子工作',
    description:
      'C / Arduino を使ったハードウェア寄りの開発も好きで，ソフトとハードの両面から物事を考えます．',
  },
  {
    icon: HeartHandshake,
    title: '「Trust」を軸に',
    description:
      '「信頼されるソフトウェア」を目標に，使う人の体験を最優先した設計と丁寧な実装を心がけています．',
  },
];

export function About() {
  return (
    <section id="about" data-testid="about-section" className="scroll-mt-24 py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="01. About Me"
          title="自己紹介"
          description="情報系の学生として，ソフトウェアからハードウェアまで幅広い開発に取り組んでいます．つくるものすべてに共通する軸は「信頼」です．"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ABOUT_CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} delayMs={index * STAGGER_DELAY_MS}>
                <div className="h-full p-6 rounded-2xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 transition-colors duration-300">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-sky-500 dark:text-sky-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
