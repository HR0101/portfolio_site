'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useInView } from '../../../hooks/useInView';
import { useLayoutMotion } from '../../../hooks/useLayoutMotion';
import { MotionTabs } from '../../../components/MotionTabs';
import { MotionDisclosure } from '../../../components/MotionDisclosure';
import { MORE_GROUPS, MORE_TOTAL } from './more-data';
import { FeatureDemo, DEMO_TITLES } from './feature-demo';
import styles from './product.module.css';

// 「すべて」を表す絞り込みの値
const ALL = 'all';

// コンテナの通し番号（全体の並びで決めるので，絞り込んでも同じ番号のまま）
const SERIALS = new Map(
  MORE_GROUPS.flatMap((group) => group.items.map((item) => `${group.id}-${item.title}`)).map((key, index) => [key, index + 1] as const),
);


// 一覧の見出しを固定し，クリックで説明を展開する．
// 説明文は裏面に常に置いてあるので，音声読み上げや検索にも文字として残る．
export function MoreGrid() {
  const [filter, setFilter] = useState<string>(ALL);
  const [expanded, setExpanded] = useState(false);
  // 押して裏返したタイル（触れる画面では，ホバーの代わりに使う）
  const [openKey, setOpenKey] = useState<string | null>(null);
  const { ref, isInView } = useInView<HTMLDivElement>(0.08);
  const { ref: listRef, capture } = useLayoutMotion<HTMLUListElement>();

  const visibleGroups = filter === ALL ? MORE_GROUPS : MORE_GROUPS.filter((group) => group.id === filter);
  const allTiles = visibleGroups.flatMap((group) =>
    group.items.map((item) => ({
      key: `${group.id}-${item.title}`,
      // 分野ごとの色（0〜5）．絞り込んでも色が変わらないよう，全体の並びから決める
      hue: MORE_GROUPS.findIndex((candidate) => candidate.id === group.id),
      item,
    })),
  );

  // 最初は各分野から1件ずつ．先頭の分野だけに偏らせない．
  const tiles = filter === ALL && !expanded
    ? allTiles.filter(tile => MORE_GROUPS.some(group => tile.item === group.items[0]))
    : allTiles;

  function selectFilter(next: string) {
    capture();
    setFilter(next);
    setExpanded(false);
    setOpenKey(null);
  }

  return (
    <div ref={ref} className={styles.moreWrap} data-visible={isInView}>
      <MotionTabs activeKey={filter} className={styles.moreFilter} role="group" aria-label="分野で絞り込む">
        <button type="button" aria-pressed={filter === ALL} onClick={() => selectFilter(ALL)}>
          <LayoutGrid size={15} aria-hidden="true" />
          {filter === ALL && expanded ? 'すべて' : 'おすすめ'}<span>{filter === ALL && expanded ? MORE_TOTAL : MORE_GROUPS.length}</span>
        </button>
        {MORE_GROUPS.map((group, index) => (
          <button
            key={group.id}
            type="button"
            data-hue={index}
            aria-pressed={filter === group.id}
            onClick={() => selectFilter(group.id)}
          >
            <group.icon size={15} aria-hidden="true" />
            {group.title}
            <span>{group.items.length}</span>
          </button>
        ))}
      </MotionTabs>

      {filter !== ALL && (
        <p className={styles.moreLead} aria-live="polite">
          {visibleGroups[0].lead}
        </p>
      )}

      {filter === ALL && <p className={styles.moreLead} role="status">{expanded ? `全${MORE_TOTAL}機能を表示しています．` : `各分野から${MORE_GROUPS.length}機能を紹介します．分野を選ぶと，その分野の全機能を表示します．`}</p>}

      {/* 同じ機能の DOM を保ち，並び替えでは新しい位置まで移動させる */}
      <ul ref={listRef} id="ark-feature-list" className={styles.moreTiles}>
        {tiles.map(({ key, hue, item }, index) => {
          const isOpen = openKey === key;
          if (DEMO_TITLES.includes(item.title)) return <li key={key} data-layout-key={key} className={styles.featureDemoItem} style={{ ['--i' as string]: index }}><FeatureDemo title={item.title} text={item.text} hue={hue} icon={<item.icon size={22} aria-hidden="true" />} /></li>;
          return (
            <li key={key} data-layout-key={key} style={{ ['--i' as string]: index }}>
              <div className={styles.tileSpotlight}>
              <div className={styles.featureCard} data-hue={hue}>
                <button
                  type="button"
                  className={styles.featureCardToggle}
                  aria-expanded={isOpen}
                  aria-controls={`feature-info-${SERIALS.get(key)}`}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                >
                  <span className={styles.featureCardIcon}><item.icon size={22} aria-hidden="true" /></span>
                  <strong>{item.title}</strong>
                  <span className={styles.featureCardAction}>{isOpen ? '説明を閉じる −' : '説明を見る ＋'}</span>
                </button>
                <MotionDisclosure id={`feature-info-${SERIALS.get(key)}`} open={isOpen}>
                  <div className={styles.featureCardDescription}>{item.text}</div>
                </MotionDisclosure>
              </div>
              </div>
            </li>
          );
        })}
      </ul>
      {filter === ALL && <div className={styles.featureListActions}>
        <button type="button" aria-expanded={expanded} aria-controls="ark-feature-list" onClick={() => { capture(); setExpanded(value => !value); setOpenKey(null); }}>
          {expanded ? 'おすすめ6機能に戻す' : `すべての機能を見る（${MORE_TOTAL}件）`}
        </button>
      </div>}
      <p className={styles.moreHint} aria-hidden="true">
        カードを押すと説明が開きます．「デモを試す」のカードは操作できます．
      </p>
    </div>
  );
}
