import { Cpu, GraduationCap, HeartHandshake, Smartphone } from 'lucide-react';
import { Reveal, type RevealVariant } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { TiltCard } from '../components/TiltCard';

// カードの段階表示に使う遅延間隔（ミリ秒）
const STAGGER_DELAY_MS = 100;

// About カードの定義
interface AboutCard {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  // アイコンチップのグラデーション
  gradient: string;
  // 登場アニメーションの向き（左右交互に配置する）
  variant: RevealVariant;
}

const ABOUT_CARDS: AboutCard[] = [
  {
    icon: GraduationCap,
    title: '情報系の学生',
    description:
      '大学で情報工学を学びながら，授業の枠を超えて日々新しい技術を吸収しています．',
    gradient: 'from-sky-300 to-blue-400',
    variant: 'left',
  },
  {
    icon: Smartphone,
    title: 'iOS / macOSアプリ開発',
    description:
      '2025年6月から，Swift / SwiftUI で iPhone・Mac 両方のアプリを17本つくり，すべてソースコードごと公開しています．',
    gradient: 'from-violet-300 to-indigo-400',
    variant: 'right',
  },
  {
    icon: Cpu,
    title: '組込み・電子工作',
    description:
      'C / Arduino を使ったハードウェア寄りの開発も好きで，ソフトとハードの両面から物事を考えます．',
    gradient: 'from-emerald-300 to-teal-400',
    variant: 'left',
  },
  {
    icon: HeartHandshake,
    title: '「Trust」を軸に',
    description:
      '「信頼されるソフトウェア」を目標に，使う人の体験を最優先した設計と丁寧な実装を心がけています．',
    gradient: 'from-amber-300 to-rose-300',
    variant: 'right',
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
              <Reveal
                key={card.title}
                delayMs={index * STAGGER_DELAY_MS}
                variant={card.variant}
                className="h-full"
              >
                <TiltCard className="h-full">
                  <div className="tile group h-full p-6 hover:border-ink/25 dark:hover:border-night-ink/25 hover:shadow-soft transition-all duration-300">
                    <div
                      className="chip w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    >
                      <Icon className="animate-wiggle w-6 h-6 text-ink" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-subtle dark:text-night-subtle">
                      {card.description}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
