'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';
import { fetchRecentMusic, type RecentMusicResponse } from '../services/musicService';
import { staggerDelay } from '../lib/choreography';
import styles from './RecentMusic.module.css';

const MUSIC_ROW_STEP_MS = 40;

export function RecentMusic() {
  // 集計行を監視し，読み込み用の枠や高さをページへ追加しない．
  const { isInView } = useInView<HTMLDListElement>(0, false, '[data-testid="profile-stats"]', '200px');
  const [data, setData] = useState<RecentMusicResponse | null>(null);
  useEffect(() => {
    if (!isInView) return;
    let active = true;
    void fetchRecentMusic().then((result) => {
      if (active) setData(result);
    });
    return () => { active = false; };
  }, [isInView]);

  if (data?.apiStatus !== 'success' || data.tracks.length === 0) return null;
  return (
    <div className={styles.block} data-testid="recent-music">
      <h3 className={styles.heading}>最近聴いた曲</h3>
      <ul className={styles.list}>
        {data.tracks.map((track, index) => (
          <li className={styles.row} style={{ '--music-delay': `${staggerDelay(index, { stepMs: MUSIC_ROW_STEP_MS })}ms` } as CSSProperties} key={`${index}-${track.title}-${track.artist}`}>
            {track.artworkUrl && <img className={styles.artwork} src={track.artworkUrl} alt="" width={48} height={48} loading="lazy" />}
            <div className={styles.details}>
              <p className={styles.title}>
                {track.url ? <a href={track.url} target="_blank" rel="noopener noreferrer" aria-label={`${track.title}（Apple Music で開きます）`}>{track.title}</a> : track.title}
              </p>
              <p className={styles.meta}>{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.note}>Apple Music の再生履歴です．数分おきに更新されます．</p>
    </div>
  );
}
