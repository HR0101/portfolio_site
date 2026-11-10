'use client';

import { useState } from 'react';
import { formatMinutes, getOperatingDaySample, MINUTES_PER_HOUR, OPERATING_DAY_BOUNDARY, SAMPLE_DEPARTURES, TIMELINE_END } from '../../lib/notes/operatingDay';
import { FigureFrame } from './FigureFrame';
import styles from './figures.module.css';

const TIME_TICKS = [0, 4, 8, 12, 16, 20, 24, 28];
const BOUNDARY_EXAMPLES = [OPERATING_DAY_BOUNDARY - 1, OPERATING_DAY_BOUNDARY, 24 * MINUTES_PER_HOUR, TIMELINE_END];
const INITIAL_MINUTES = OPERATING_DAY_BOUNDARY - 1;

export function OperatingDayFigure() {
  const [minutes, setMinutes] = useState(INITIAL_MINUTES);
  const sample = getOperatingDaySample(minutes);
  const dayLabel = sample.day < 0 ? '前日' : sample.day === 0 ? '基準日' : '翌日';
  const valueText = `${formatMinutes(minutes)}，${dayLabel}の運行日，残り${sample.remaining.length}便`;

  return (
    <FigureFrame id="operating-day" title="0時と4時で，何が変わる？" caption="説明用の固定時刻表です．実際の便・休日・現在地は使いません．時刻表の出典：src/lib/notes/operatingDay.ts．">
      <div className={styles.readout} role="status" aria-live="polite" aria-atomic="true">
        <span>基準日の0時から数えた時刻</span>
        <strong>{formatMinutes(minutes)}</strong>
        <p><b>{dayLabel}の時刻表</b>を参照します．残り <b>{sample.remaining.length}便</b>です．</p>
        <small>運行日内の表記：{formatMinutes(sample.timetableMinutes)}（24時以降は翌日の早朝です）</small>
      </div>
      <label className={styles.rangeLabel} htmlFor="notes-time">時刻を動かす</label>
      <input id="notes-time" className={styles.range} type="range" min={0} max={TIMELINE_END} step={1} value={minutes} onChange={event => setMinutes(Number(event.target.value))} aria-label="運行日を調べる時刻" aria-valuetext={valueText} />
      <div className={styles.ticks} aria-hidden="true">{TIME_TICKS.map(hour => <span key={hour}>{hour}:00</span>)}</div>
      <div className={styles.controls} role="group" aria-label="境界の時刻を試す">
        {BOUNDARY_EXAMPLES.map(time => <button className="press-effect" key={time} type="button" aria-pressed={minutes === time} onClick={() => setMinutes(time)}>{formatMinutes(time)}</button>)}
      </div>
      <ul className={styles.departures} aria-label={`${dayLabel}の説明用時刻表`}>
        {SAMPLE_DEPARTURES.map(time => <li key={time} data-past={time < sample.timetableMinutes}><span>{formatMinutes(time)}</span><small>{time < sample.timetableMinutes ? '出発済み' : '残り便'}</small></li>)}
      </ul>
      <p className={styles.fine}>午前4時に運行日が切り替わります．0〜28時はこの図の範囲です．出発ちょうどの便は残します．</p>
    </FigureFrame>
  );
}
