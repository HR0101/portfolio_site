"use client";

import { useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Code2, Cpu, Layers3, Terminal } from 'lucide-react';
import { ArrowSwap } from '../components/ArrowSwap';
import { SKILL_EXAMPLES, SKILL_TOOL_GROUPS } from '../data/skillExamples';
import { getSkillIndicatorTransform } from '../lib/skillsMotion';
import styles from './SkillExamples.module.css';

const GROUP_ICONS = [Layers3, Cpu, Terminal];

// 押下や親の Reveal の変形を含まない，レイアウト上の位置を測る．
export function useSkillSelectionIndicator(selection: string | number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const measure = () => {
      const button = container.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (!button) return;
      container.style.setProperty('--selection-transform', getSkillIndicatorTransform({
        x: button.offsetLeft, y: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight,
      }));
      container.dataset.indicatorReady = 'true';
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll('button').forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [selection]);
  return ref;
}

export function SkillExamples() {
  const [technology, setTechnology] = useState(SKILL_EXAMPLES[0].technology);
  const [input, setInput] = useState<'pointer' | 'direct'>('direct');
  const panelId = useId();
  const headingId = useId();
  const groupsRef = useSkillSelectionIndicator(technology);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = SKILL_EXAMPLES.find(example => example.technology === technology)!;
  const select = (value: string, source: 'pointer' | 'direct') => {
    setInput(source);
    if (value === technology) return;
    panelRef.current?.querySelectorAll<HTMLElement>('[data-active="true"]').forEach(element => {
      element.dataset.exiting = 'true';
    });
    setTechnology(value);
  };
  const preview = (event: PointerEvent<HTMLButtonElement>, value: string) => {
    if (event.pointerType === 'touch' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    select(value, 'pointer');
  };

  return (
    <div className={styles.root}>
      <div className={styles.heading}>
        <h3 id={headingId}>技術と、使った場面</h3>
        <p>技術名を選ぶと、作品の使用例が切り替わります。</p>
      </div>
      <div ref={groupsRef} className={styles.groups}>
        {SKILL_TOOL_GROUPS.map(({ title, technologies }, index) => {
          const Icon = GROUP_ICONS[index];
          return (
            <div key={title} className={styles.group}>
              <h4><Icon size={15} aria-hidden="true" />{title}</h4>
              <ul aria-label={title}>
                {technologies.map(value => (
                  <li key={value}>
                    {SKILL_EXAMPLES.some(example => example.technology === value) ? (
                      <button type="button" aria-pressed={technology === value} aria-controls={panelId}
                        data-skill-technology={value} className={`${styles.technology} press-effect`}
                        onPointerEnter={event => preview(event, value)}
                        onFocus={() => select(value, 'direct')}
                        onClick={() => select(value, 'direct')}>
                        {value}
                      </button>
                    ) : <span className={styles.staticTechnology}>{value}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div ref={panelRef} id={panelId} role="region" aria-labelledby={headingId} className={styles.example}
        data-skill-example={selected.technology} data-input={input} onTransitionEnd={event => {
          const element = event.target;
          if (event.propertyName === 'opacity' && element instanceof HTMLElement && element.dataset.active === 'false') {
            delete element.dataset.exiting;
          }
        }}>
        <div className={styles.visual} aria-hidden="true">
          {SKILL_EXAMPLES.map(example => {
            const Icon = example.icon ?? Code2;
            return (
              <div key={example.technology} className={styles.artwork} data-active={example.technology === technology}>
                {example.imageSrc ? <Image src={example.imageSrc} alt="" width={96} height={96} sizes="96px" />
                  : <Icon size={44} strokeWidth={1.4} />}
              </div>
            );
          })}
        </div>
        <div className={styles.copyStack}>
          {SKILL_EXAMPLES.map(example => (
            <div key={example.technology} className={styles.copy} data-active={example.technology === technology} aria-hidden={example.technology !== technology}>
              <p className={styles.technologyLabel}>{example.technology} の使用例</p>
              <h4>{example.name}</h4>
              <p className={styles.description}>{example.description}</p>
            </div>
          ))}
        </div>
        <div className={styles.linkStack}>
          {SKILL_EXAMPLES.map(example => {
            const active = example.technology === technology;
            const content = <>{example.external ? 'ソースコードを見る' : '紹介を見る'}<ArrowSwap size={15} />{example.external && <span className="sr-only">（新しいタブで開きます）</span>}</>;
            const props = { className: `${styles.link} press-effect`, tabIndex: active ? 0 : -1 };
            return <div key={example.technology} className={styles.linkLayer} data-active={active} aria-hidden={!active} inert={!active}>
              {example.external
                ? <a href={example.href} target="_blank" rel="noopener noreferrer" {...props}>{content}</a>
                : <Link href={example.href} {...props}>{content}</Link>}
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
