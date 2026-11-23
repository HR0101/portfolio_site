'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DotPillLink } from '../components/animations/DotPillLink';
import { useInView } from '../hooks/useInView';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { resizeArtworkUrl } from '../lib/edge/appleMusic';
import { fetchRecentMusic, type RecentMusicResponse } from '../services/musicService';
import { staggerDelay } from '../lib/choreography';
import styles from './RecentMusic.module.css';

const MUSIC_ROW_STEP_MS = 40;
// 大きなジャケット（CSS 上で約 184px）を 2 倍の細かさで出すための取得サイズ
const SLEEVE_ARTWORK_SIZE = 360;
// ジャケットの傾きの最大（度）
const SLEEVE_TILT_DEG = 7;
// 傾きの座標は -1〜1 に収める
const POINTER_RANGE = 1;

const pad = (value: number) => String(value).padStart(2, '0');
const clampPointer = (value: number) => Math.min(POINTER_RANGE, Math.max(-POINTER_RANGE, value));

// 最近聴いた曲：いちばん上の曲を大きなレコード盤つきのジャケットで見せ，下の一覧で選んだ曲に切り替える．
// 5 曲ぶんの場面は常に DOM に置き（読み上げ・検索のため），選んだ 1 曲だけを重ねて出す．
// 切り替えは CSS の transition なので，連続して選んでも現在の状態から続く．
export function RecentMusic() {
  // 集計行を監視し，読み込み用の枠や高さをページへ追加しない．
  const { isInView } = useInView<HTMLDListElement>(0, false, '[data-testid="profile-stats"]', '200px');
  const [data, setData] = useState<RecentMusicResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // 最初の描画のあと 1 度だけ true にして，レコード盤をジャケットの陰から滑り出させる
  const [isReady, setIsReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInView) return;
    let active = true;
    void fetchRecentMusic().then((result) => {
      if (active) setData(result);
    });
    return () => { active = false; };
  }, [isInView]);

  const hasTracks = data?.apiStatus === 'success' && data.tracks.length > 0;
  useEffect(() => {
    if (!hasTracks) return;
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, [hasTracks]);

  // カーソルの位置でジャケットをわずかに傾ける（PC のマウスだけ．CSS 変数へ直接書き，再描画しない）
  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = clampPointer(((event.clientX - rect.left) / rect.width) * 2 - 1);
    const y = clampPointer(((event.clientY - rect.top) / rect.height) * 2 - 1);
    stage.style.setProperty('--tilt-x', String(x));
    stage.style.setProperty('--tilt-y', String(y));
  }, [reducedMotion]);
  const resetTilt = useCallback(() => {
    stageRef.current?.style.setProperty('--tilt-x', '0');
    stageRef.current?.style.setProperty('--tilt-y', '0');
  }, []);

  if (!data || data.apiStatus !== 'success' || data.tracks.length === 0) return null;
  const tracks = data.tracks;
  const total = tracks.length;

  return (
    <div className={styles.block} data-testid="recent-music" data-ready={isReady ? 'true' : 'false'}>
      <h3 className={styles.heading}>最近聴いた曲</h3>

      <div
        className={styles.stage}
        ref={stageRef}
        style={{ '--tilt-deg': `${SLEEVE_TILT_DEG}deg` } as CSSProperties}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
      >
        {tracks.map((track, index) => {
          const isActive = index === activeIndex;
          const cover = track.artworkUrl ? `url("${track.artworkUrl}")` : 'none';
          return (
            <article
              className={styles.slide}
              data-active={isActive ? 'true' : 'false'}
              aria-hidden={isActive ? undefined : true}
              aria-label={`${track.title}（${index + 1} / ${total}）`}
              key={`${index}-${track.title}-${track.artist}`}
            >
              <div className={styles.glow} style={{ '--cover': cover } as CSSProperties} aria-hidden="true" />

              <div className={styles.sleeveWrap}>
                {/* レコード盤：ジャケットの陰から右へ滑り出す．ラベルにはジャケットを丸く切り抜いて使う */}
                <div className={styles.disc} aria-hidden="true">
                  <div className={styles.discFace}>
                    <span className={styles.discLabel} style={{ '--cover': cover } as CSSProperties} />
                    <span className={styles.discHole} />
                  </div>
                </div>
                <div className={styles.sleeve}>
                  {track.artworkUrl ? (
                    <img
                      className={styles.sleeveImage}
                      src={resizeArtworkUrl(track.artworkUrl, SLEEVE_ARTWORK_SIZE)}
                      alt=""
                      width={184}
                      height={184}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  ) : (
                    <span className={styles.sleeveFallback} aria-hidden="true" />
                  )}
                </div>
              </div>

              <div className={styles.info}>
                <p className={styles.counter} aria-hidden="true">{pad(index + 1)} / {pad(total)}</p>
                <p className={styles.trackTitle}>{track.title}</p>
                <p className={styles.trackArtist}>{track.artist}</p>
                {track.album && <p className={styles.trackAlbum}>{track.album}</p>}
                {track.url && (
                  <div className={styles.open}>
                    <DotPillLink
                      href={track.url}
                      external
                      size="sm"
                      tabIndex={isActive ? undefined : -1}
                      aria-label={`${track.title}を Apple Music で開く`}
                      icon={<ArrowUpRight size={14} aria-hidden="true" />}
                    >
                      Apple Music で開く
                    </DotPillLink>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <ol className={styles.queue}>
        {tracks.map((track, index) => (
          <li
            className={styles.row}
            data-active={index === activeIndex ? 'true' : 'false'}
            style={{ '--music-delay': `${staggerDelay(index, { stepMs: MUSIC_ROW_STEP_MS })}ms` } as CSSProperties}
            key={`${index}-${track.title}-${track.artist}`}
          >
            <button
              type="button"
              className={styles.rowButton}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onPointerEnter={(event) => { if (event.pointerType === 'mouse') setActiveIndex(index); }}
            >
              <span className={styles.rowIndex} aria-hidden="true">{pad(index + 1)}</span>
              {track.artworkUrl && <img className={styles.rowArtwork} src={track.artworkUrl} alt="" width={40} height={40} loading="lazy" decoding="async" />}
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{track.title}</span>
                <span className={styles.rowMeta}>{track.artist}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className={styles.note}>Apple Music の再生履歴です．数分おきに更新されます．</p>
    </div>
  );
}
