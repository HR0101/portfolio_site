"use client";

import { useScrollLinked } from '../hooks/useScrollLinked';
import { TIMELINE_MILESTONES } from '../data/timeline';

// 節目が「通過した」と判定される位置（項目の中ほど）
const MILESTONE_ACTIVATION_OFFSET = 0.5;

// スクロールに合わせて縦線が伸び，通過した節目が点灯していく年表
export function ScrollTimeline() {
  const { ref, progress } = useScrollLinked<HTMLDivElement>('fill');
  const milestoneCount = TIMELINE_MILESTONES.length;

  return (
    <div ref={ref} className="relative pl-10 md:pl-14" data-testid="scroll-timeline">
      {/* 背景の線（未通過の部分） */}
      <div
        className="absolute left-3 md:left-5 top-2 bottom-2 w-px bg-mist dark:bg-night-border"
        aria-hidden="true"
      />
      {/* スクロール量に応じて伸びる線 */}
      <div
        className="absolute left-3 md:left-5 top-2 w-px bg-gradient-to-b from-sky-300 via-cyan-300 to-violet-400"
        style={{ height: `calc(${(progress * 100).toFixed(2)}% - 1rem)` }}
        aria-hidden="true"
      />
      {/* 線の先端で光る点 */}
      <div
        className="absolute left-3 md:left-5 w-2 h-2 -translate-x-1/2 rounded-full bg-sky-400 shadow-[0_0_18px_5px_rgba(125,211,252,0.45)] transition-opacity duration-300"
        style={{
          top: `calc(${(progress * 100).toFixed(2)}% - 1rem)`,
          opacity: progress > 0.02 && progress < 0.99 ? 1 : 0,
        }}
        aria-hidden="true"
      />

      <ol className="space-y-10">
        {TIMELINE_MILESTONES.map((milestone, index) => {
          // 線が自分の位置を追い越したら点灯する
          const activationPoint = (index + MILESTONE_ACTIVATION_OFFSET) / milestoneCount;
          const isReached = progress >= activationPoint;

          return (
            <li key={milestone.period} className="relative">
              {/* 節目のドット */}
              <span
                className={`absolute -left-10 md:-left-14 top-1.5 flex items-center justify-center w-6 h-6 -translate-x-1/2 ml-3 md:ml-5 rounded-full border-2 transition-all duration-500 ${
                  isReached
                    ? 'bg-sky-400 border-sky-200 scale-110 shadow-soft-lg'
                    : 'bg-white dark:bg-night-soft border-soft dark:border-night-border scale-90'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                    isReached ? 'bg-white' : 'bg-slate-300 dark:bg-night-border'
                  }`}
                />
              </span>

              {/* 節目の内容（通過すると浮かび上がる） */}
              <div
                className={`transition-all duration-700 ease-out ${
                  isReached
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-60 translate-x-3 md:translate-x-6'
                }`}
              >
                <p
                  className={`text-xs font-mono tracking-widest transition-colors duration-500 ${
                    isReached
                      ? 'text-sky-700 dark:text-sky-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {milestone.period}
                </p>
                <h4 className="mt-1 text-lg font-semibold">{milestone.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl">
                  {milestone.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {milestone.apps.map((appName) => (
                    <span
                      key={appName}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors duration-500 ${
                        isReached
                          ? 'bg-sky-500/10 border-sky-400/40 text-sky-800 dark:text-sky-300'
                          : 'bg-mist dark:bg-night border-soft dark:border-night-border text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {appName}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
