'use client';

import { useCallback, useRef, useState } from 'react';
import { useTimeExhibit } from '../../hooks/useTimeExhibit';
import { getWeaveFrame, weaveFragments, weaveLabels, weaveLineCount, weaveManualTimes } from '../../lib/skillLab/weave';
import styles from './SkillLab.module.css';

// 布の生成エンジンは複製せず，既存WeaveLoomの「経＝信頼度／緯＝鮮度」を工程図にする．
const threadPitch = 34;
const paintIntervalMs = 1000 / 30;

export function TsumugiWeave() {
  const stage = useRef<SVGSVGElement>(null);
  const lastPaint = useRef(-Infinity);
  const [instant, setInstant] = useState(false);
  const paint = useCallback((frame: ReturnType<typeof getWeaveFrame>) => {
    const root = stage.current;
    if (!root) return;
    if (frame.time > lastPaint.current && frame.time - lastPaint.current < paintIntervalMs) return;
    lastPaint.current = frame.time;
    frame.fragments.forEach((fragment, index) => {
      const node = root.querySelector<SVGGElement>(`[data-fragment="${index}"]`);
      if (!node) return;
      node.style.transform = `translate(${fragment.x}px, ${fragment.y}px)`;
      node.style.opacity = `${fragment.opacity}`;
    });
    root.querySelectorAll<SVGGElement>('[data-warp]').forEach((line, index) => {
      const amount = frame.warp[index];
      line.style.transform = `scaleY(${amount})`;
      line.style.opacity = frame.card ? '0.18' : `${amount}`;
    });
    root.querySelectorAll<SVGGElement>('[data-weft]').forEach((line, index) => {
      const amount = frame.weft[index];
      line.style.transform = `scaleX(${amount})`;
      line.style.opacity = frame.card ? '0.18' : `${amount}`;
    });
  }, []);
  const exhibit = useTimeExhibit(getWeaveFrame, weaveManualTimes, 3, paint);

  return <div ref={exhibit.containerRef} data-testid="skill-lab-tsumugi" className={styles.exhibit}>
    <header className={styles.exhibitHeader}><div><p className={styles.eyebrow}>Tsumugi · 情報と織り</p><h4>情報を編む</h4></div><span className={styles.kind}>名前の視覚的な比喩</span></header>
    <p className={styles.copy}>断片から，読める一枚へ．経糸は信頼度，緯糸は鮮度．2つの軸を同じ場所で読めるようにする，名前のたとえです．</p>
    <div className={styles.weaveSurface} data-complete={exhibit.phase === 3} data-instant={instant || exhibit.reduced}>
      <svg ref={stage} viewBox="0 0 560 320" aria-hidden="true">
        {Array.from({ length: weaveLineCount }, (_, index) => <g key={`warp-${index}`} data-warp style={{ transformOrigin: '280px 32px' }}><path d={`M ${178 + index * threadPitch} 32 V 286`} className={styles.warp} /></g>)}
        {Array.from({ length: weaveLineCount }, (_, index) => <g key={`weft-${index}`} data-weft style={{ transformOrigin: '60px 160px' }}><path d={`M 60 ${76 + index * threadPitch} H 500`} className={styles.weft} /></g>)}
        {weaveFragments.map((fragment, index) => <g key={fragment.label} data-fragment={index} style={{ opacity: 0 }}><rect width="98" height="34" rx="8" className={styles.fragment} /><text x="49" y="22" textAnchor="middle" className={styles.fragmentLabel}>{fragment.label}</text></g>)}
      </svg>
      <article className={styles.wovenCard} aria-hidden={exhibit.phase !== 3}>
        <p>出典が明快な記事</p><h5>2つの軸で，情報を読む</h5>
        <table><caption>既存の織り展示から抜粋した例</caption><thead><tr><th scope="col">経 / 信頼度</th><th scope="col">緯 / 鮮度</th></tr></thead><tbody><tr><td>88<span>点</span></td><td>94<span>点</span></td></tr></tbody></table>
      </article>
    </div>
    <p className={styles.phaseStatus} role="status">{weaveLabels[exhibit.phase]}</p>
    <div className={styles.controls} role="group" aria-label="情報を編む工程を選択">
      {weaveLabels.map((label, index) => <button key={label} type="button" className="press-effect" aria-pressed={exhibit.phase === index} onClick={event => { setInstant(event.detail === 0); exhibit.select(index); }}>{index + 1} / {label}</button>)}
      <button type="button" className="press-effect" disabled={exhibit.reduced} aria-pressed={exhibit.requested && !exhibit.reduced} onClick={() => { setInstant(false); exhibit.toggle(); }}>{exhibit.requested && !exhibit.reduced ? '一時停止' : '再生'}</button>
    </div>
    <p className={styles.note}>名前を表す視覚的な比喩であり，実際の処理そのものではありません．点数は既存の織り展示にある固定例で，この図による診断結果ではありません．12秒の周期で，完成したカードを4秒間保ちます．{exhibit.reduced && '動きを減らす設定では，工程を選んで静止表示できます．'}</p>
  </div>;
}
