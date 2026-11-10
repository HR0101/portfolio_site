'use client';

import Link from 'next/link';
import { MotionTabs } from '../../components/MotionTabs';
import { siteConfig } from '../../config/site';
import { buildRepositoryUrl } from '../../data/apps';
import { HardwareSync } from './HardwareSync';
import { FraTermAscii } from './FraTermAscii';
import { EkiHubCompare } from './EkiHubCompare';
import { TsumugiWeave } from './TsumugiWeave';
import styles from './SkillLab.module.css';

const exhibits = [
  { id: 'hardware', label: 'C / Arduino', repository: 'hackathon_42', kind: 'READMEに基づく仕組みの再現', Component: HardwareSync },
  { id: 'python', label: 'Python', repository: 'FraTerm', kind: '合成映像を使った変換の再現', Component: FraTermAscii },
  { id: 'web', label: 'Web', repository: 'EkiHub', kind: '説明用の固定データ', href: '/apps/ekihub', Component: EkiHubCompare },
  { id: 'tsumugi', label: 'Tsumugi', repository: 'Tsumugi', kind: '名前を表す視覚的な比喩', href: '/apps/tsumugi', Component: TsumugiWeave },
] as const;
export type SkillLabId = typeof exhibits[number]['id'];

export function SkillLab({ selected, onSelect }: { selected: SkillLabId; onSelect: (id: SkillLabId) => void }) {
  return <div id="skill-lab" data-testid="skill-lab" className={styles.lab}>
    <div className={styles.labHeading}><p className={styles.eyebrow}>Skills / 小さな実装</p><h3>実装の展示室</h3><p>技術を，動くものとして見せます．実際の作品と，再現・説明用のものを分けて書いています．</p></div>
    <MotionTabs activeKey={selected} role="tablist" aria-label="実装の展示を選択" className={styles.tabs}>
      {exhibits.map((item, index) => <button key={item.id} id={`skill-lab-tab-${item.id}`} role="tab" type="button" className="press-effect" aria-selected={selected === item.id} aria-controls={`skill-lab-panel-${item.id}`} tabIndex={selected === item.id ? 0 : -1} onClick={() => onSelect(item.id)} onKeyDown={event => {
        let next: number;
        if (event.key === 'ArrowRight') next = (index + 1) % exhibits.length;
        else if (event.key === 'ArrowLeft') next = (index + exhibits.length - 1) % exhibits.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = exhibits.length - 1;
        else return;
        event.preventDefault();
        const id = exhibits[next].id;
        onSelect(id);
        document.getElementById(`skill-lab-tab-${id}`)?.focus({ preventScroll: true });
      }}>{item.label}</button>)}
    </MotionTabs>
    {exhibits.map(item => <div key={item.id} id={`skill-lab-panel-${item.id}`} role="tabpanel" aria-labelledby={`skill-lab-tab-${item.id}`} tabIndex={0} hidden={selected !== item.id} className={styles.panel}>
      {selected === item.id && <><item.Component /><footer className={styles.exhibitFooter}><span>{item.kind}</span><div>{'href' in item && <Link className="press-effect" href={item.href}>{item.repository}の実画面・設計を見る ↗</Link>}<a className="press-effect" href={buildRepositoryUrl(siteConfig.githubUsername, item.repository)}>公開リポジトリ ↗</a><a className="press-effect" href={siteConfig.githubUrl}>GitHub ↗</a></div></footer></>}
    </div>)}
  </div>;
}
