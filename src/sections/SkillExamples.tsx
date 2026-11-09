"use client";

import { useId, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Code2, Cpu, Layers3, Terminal } from 'lucide-react';
import { ArrowSwap } from '../components/ArrowSwap';
import { SKILL_EXAMPLES, SKILL_TOOL_GROUPS } from '../data/skillExamples';
import styles from './SkillExamples.module.css';

const GROUP_ICONS = [Layers3, Cpu, Terminal];

export function SkillExamples() {
  const [technology, setTechnology] = useState(SKILL_EXAMPLES[0].technology);
  const [input, setInput] = useState<'pointer' | 'direct'>('direct');
  const panelId = useId();
  const headingId = useId();
  const selected = SKILL_EXAMPLES.find(example => example.technology === technology)!;
  const select = (value: string, source: 'pointer' | 'direct') => {
    setInput(source);
    setTechnology(value);
  };
  const preview = (event: PointerEvent<HTMLButtonElement>, value: string) => {
    if (event.pointerType === 'touch' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    select(value, 'pointer');
  };

  const linkContent = <> {selected.external ? 'ソースコードを見る' : '紹介を見る'}<ArrowSwap size={15} />
    {selected.external && <span className="sr-only">（新しいタブで開きます）</span>}</>;

  return (
    <div className={styles.root}>
      <div className={styles.heading}>
        <h3 id={headingId}>技術と、使った場面</h3>
        <p>技術名を選ぶと、作品の使用例が切り替わります。</p>
      </div>
      <div className={styles.groups}>
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
                        data-skill-technology={value} className={styles.technology}
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
      <div id={panelId} role="region" aria-labelledby={headingId} className={styles.example}
        data-skill-example={selected.technology} data-input={input}>
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
        <div className={styles.copy}>
          <p className={styles.technologyLabel}>{selected.technology} の使用例</p>
          <h4>{selected.name}</h4>
          <p className={styles.description}>{selected.description}</p>
        </div>
        {selected.external ? (
          <a href={selected.href} target="_blank" rel="noopener noreferrer" className={`${styles.link} arrow-swap-host`}>{linkContent}</a>
        ) : <Link href={selected.href} className={`${styles.link} arrow-swap-host`}>{linkContent}</Link>}
      </div>
    </div>
  );
}
