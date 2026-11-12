"use client";

import { useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { LiquidTabs } from '../components/animations/liquid/LiquidTabs';
import { FEATURES } from '../config/features';
import { OTHER_APPS, OTHER_APPS_PATH, SWIFT_APPS, type SwiftApp } from '../data/apps';
import { CAPABILITIES, type Capability } from '../data/capabilities';
import { findAppsByCapability } from '../lib/capabilities';
import { staggerDelay } from '../lib/choreography';
import { useInView } from '../hooks/useInView';
import styles from './CapabilityIndex.module.css';

export type AppBrowseMode = 'sequence' | 'list';
const browseModes = [
  { id: 'sequence', label: '順に見る' },
  { id: 'list', label: '一覧で見る' },
] as const;
const capabilityGroups = CAPABILITIES.map(capability => ({ capability, apps: findAppsByCapability(SWIFT_APPS, capability) })).filter(group => group.apps.length > 0);
const resultsId = 'apps-capability-results';
const CHIP_STEP_MS = 40;
const CHIP_START_MS = 120;
const RESULT_STEP_MS = 30;

// 矢印・Home・End でも選べる，フォーカスが一つだけのラジオグループ．
// 選択中の面は，FEATURES.liquidTabs が true なら流体タブ（粘って移る）で，false なら今までの滑る面で見せる．
export function BrowseModeSwitch({ mode, onChange }: { mode: AppBrowseMode; onChange: (mode: AppBrowseMode) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const groupProps = {
    className: styles.modes,
    'data-mode': mode,
    role: 'radiogroup',
    'aria-label': 'アプリの閲覧モード',
    'data-testid': 'apps-browse-mode',
  };
  const modeButtons = browseModes.map((item, index) => (
    <button key={item.id} ref={node => { buttons.current[index] = node; }} type="button" role="radio" className="press-effect" aria-checked={mode === item.id} aria-controls="apps-wall" tabIndex={mode === item.id ? 0 : -1} onClick={() => onChange(item.id)} onKeyDown={event => {
      let nextIndex: number;
      if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = browseModes.length - 1;
      else if (['ArrowRight', 'ArrowDown'].includes(event.key)) nextIndex = (index + 1) % browseModes.length;
      else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) nextIndex = (index + browseModes.length - 1) % browseModes.length;
      else return;
      event.preventDefault();
      onChange(browseModes[nextIndex].id);
      buttons.current[nextIndex]?.focus({ preventScroll: true });
    }}>{item.label}</button>
  ));
  if (FEATURES.liquidTabs) return <LiquidTabs activeKey={mode} {...groupProps}>{modeButtons}</LiquidTabs>;
  return <div {...groupProps}>{modeButtons}</div>;
}

interface CapabilityIndexProps {
  mode: AppBrowseMode;
  activeId: string | null;
  onChange: (capability: Capability | null) => void;
  onSelectApp: (app: SwiftApp) => void;
}

// 壁にない作品も索引から落とさず，「その他」の既存カードへ直接案内する．
export function CapabilityIndex({ mode, activeId, onChange, onSelectApp }: CapabilityIndexProps) {
  const [expanded, setExpanded] = useState(false);
  // 閉じる間は最後の結果を保つ．選択解除は即時に読み上げとカードへ反映する．
  const [retainedId, setRetainedId] = useState(activeId);
  const { ref, isInView } = useInView<HTMLDivElement>();
  const results = useRef<HTMLDivElement | null>(null);
  const chipButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const selected = capabilityGroups.find(group => group.capability.id === activeId);
  const displayed = selected ?? capabilityGroups.find(group => group.capability.id === retainedId);
  const isExpanded = Boolean(selected && expanded);
  const close = () => {
    setExpanded(false);
    if (activeId) chipButtons.current[activeId]?.focus({ preventScroll: true });
  };
  return (
    <div ref={ref} className={styles.index} data-entered={isInView} data-testid="capability-index" onKeyDown={event => {
      if (event.key === 'Escape' && expanded) { event.preventDefault(); close(); }
    }}>
      <span className={styles.label} id="apps-capability-label">できることから探す</span>
      <div className={styles.chips} role="group" aria-labelledby="apps-capability-label">
        {capabilityGroups.map(({ capability }, index) => (
          <span key={capability.id} className={styles.chipEntrance} style={{ '--chip-delay': `${staggerDelay(index, { stepMs: CHIP_STEP_MS, startMs: CHIP_START_MS })}ms` } as CSSProperties}>
          <button ref={node => { chipButtons.current[capability.id] = node; }} type="button" className="press-effect" aria-pressed={activeId === capability.id} aria-controls={`apps-wall ${resultsId}`} aria-expanded={activeId === capability.id && expanded} onClick={event => {
            const next = activeId === capability.id ? null : capability;
            if (next) {
              setRetainedId(next.id);
              const host = ref.current;
              const popover = results.current;
              if (host && popover) {
                const origin = event.currentTarget.getBoundingClientRect();
                const bounds = host.getBoundingClientRect();
                // transform 前の配置を使い，押したチップの中心から開く．
                popover.style.setProperty('--result-origin-x', `${origin.left + origin.width / 2 - bounds.left - popover.offsetLeft}px`);
                popover.style.setProperty('--result-origin-y', `${origin.top + origin.height / 2 - bounds.top - popover.offsetTop}px`);
              }
            }
            onChange(next);
            setExpanded(Boolean(next));
          }}>{capability.label}</button>
          </span>
        ))}
      </div>
      <div ref={node => {
        results.current = node;
        // React 18 は inert の真偽値を DOM に渡さないため，属性を直接切り替える．
        node?.toggleAttribute('inert', !isExpanded);
      }} id={resultsId} className={styles.results} data-expanded={isExpanded} aria-hidden={!isExpanded}>
        {displayed && <>
          <div className={styles.resultHeading}>
            <p>{displayed.capability.label}：{displayed.apps.length}本</p>
            <button type="button" className="press-effect" onClick={close} aria-label="対応する作品の一覧を閉じる">閉じる</button>
          </div>
          <ul key={displayed.capability.id} aria-label={`${displayed.capability.label} に対応する作品`}>
            {displayed.apps.map((app, index) => {
              const otherIndex = OTHER_APPS.indexOf(app);
              return <li key={app.name} style={{ '--result-delay': `${staggerDelay(index, { stepMs: RESULT_STEP_MS })}ms` } as CSSProperties}>{otherIndex >= 0 ? (
                <Link href={`${OTHER_APPS_PATH}#other-app-${otherIndex}`} className="press-effect">{app.name} <span>その他のアプリへ</span></Link>
              ) : (
                <button type="button" className="press-effect" onClick={() => { setExpanded(false); onSelectApp(app); }}>{app.name}<span>{mode === 'sequence' ? '大きく見る' : 'カードへ'}</span></button>
              )}</li>;
            })}
          </ul>
          {mode === 'list' && <p className={styles.hint}>対応するカードを強調しています．同じ機能をもう一度押すと解除します．</p>}
        </>}
      </div>
      <p className="sr-only" role="status">{selected ? `${selected.capability.label} に対応する作品は ${selected.apps.length} 本です` : '機能を選ぶと，対応する作品を探せます．'}</p>
    </div>
  );
}
