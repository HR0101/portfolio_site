"use client";

import { useMemo, useState, type CSSProperties } from 'react';
import { RollingNumber } from '../../../components/RollingNumber';
import styles from './product.module.css';

// デモで使う首都圏の駅（緯度・経度はおおよその値）
interface DemoStation {
  name: string;
  lat: number;
  lng: number;
}

const STATIONS: DemoStation[] = [
  { name: '東京', lat: 35.681, lng: 139.767 },
  { name: '新宿', lat: 35.69, lng: 139.7 },
  { name: '渋谷', lat: 35.658, lng: 139.701 },
  { name: '池袋', lat: 35.73, lng: 139.711 },
  { name: '品川', lat: 35.628, lng: 139.739 },
  { name: '上野', lat: 35.714, lng: 139.777 },
  { name: '秋葉原', lat: 35.698, lng: 139.773 },
  { name: '中野', lat: 35.706, lng: 139.666 },
  { name: '吉祥寺', lat: 35.703, lng: 139.58 },
  { name: '立川', lat: 35.698, lng: 139.414 },
  { name: '八王子', lat: 35.656, lng: 139.339 },
  { name: '町田', lat: 35.542, lng: 139.446 },
  { name: '武蔵小杉', lat: 35.576, lng: 139.659 },
  { name: '川崎', lat: 35.531, lng: 139.697 },
  { name: '横浜', lat: 35.466, lng: 139.622 },
  { name: '大崎', lat: 35.62, lng: 139.728 },
  { name: '赤羽', lat: 35.778, lng: 139.721 },
  { name: '浦和', lat: 35.858, lng: 139.657 },
  { name: '大宮', lat: 35.906, lng: 139.624 },
  { name: '北千住', lat: 35.749, lng: 139.805 },
  { name: '錦糸町', lat: 35.697, lng: 139.814 },
  { name: '新木場', lat: 35.646, lng: 139.827 },
  { name: '船橋', lat: 35.702, lng: 139.985 },
  { name: '柏', lat: 35.862, lng: 139.971 },
  { name: '千葉', lat: 35.613, lng: 140.113 },
];

// 選べる人数の範囲
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 5;
const DEFAULT_MEMBERS = ['東京', '川崎', '船橋'];

// 所要時間の概算に使う係数（駅での待ち時間＋1km あたりの分数）
const BASE_MINUTES = 4;
const MINUTES_PER_KM = 1.9;
// 地図の表示範囲（緯度・経度）と描画サイズ
const BOUNDS = { minLat: 35.43, maxLat: 35.94, minLng: 139.3, maxLng: 140.16 };
const MAP_WIDTH = 600;
const MAP_HEIGHT = 420;
const MAP_PADDING = 24;
// ランキングに出す候補の数
const RANKING_SIZE = 3;
// 駅が密集していて名前が重なる都心部（ここの駅は，選ばれたときだけ名前を出す）
const CROWDED_AREA = { minLat: 35.6, maxLat: 35.76, minLng: 139.64, maxLng: 139.84 };

function isInCrowdedArea(station: DemoStation): boolean {
  return (
    station.lat >= CROWDED_AREA.minLat &&
    station.lat <= CROWDED_AREA.maxLat &&
    station.lng >= CROWDED_AREA.minLng &&
    station.lng <= CROWDED_AREA.maxLng
  );
}

// メンバーごとの色
const MEMBER_COLORS = ['#2fd3b5', '#7c8bff', '#ffb547', '#ff7a9a', '#5ecbff'];

// 2点間の距離（km）．球面上の最短距離を使う
function distanceKm(a: DemoStation, b: DemoStation): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

// 直線距離から所要時間（分）を概算する
function estimateMinutes(from: DemoStation, to: DemoStation): number {
  if (from.name === to.name) {
    return 0;
  }
  return Math.round(BASE_MINUTES + distanceKm(from, to) * MINUTES_PER_KM);
}

// 緯度・経度を SVG 上の座標へ変換する
function project(station: DemoStation): { x: number; y: number } {
  const innerWidth = MAP_WIDTH - MAP_PADDING * 2;
  const innerHeight = MAP_HEIGHT - MAP_PADDING * 2;
  const x = MAP_PADDING + ((station.lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * innerWidth;
  const y = MAP_PADDING + ((BOUNDS.maxLat - station.lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * innerHeight;
  return { x, y };
}

interface CandidateScore {
  station: DemoStation;
  minutes: number[];
  average: number;
  longest: number;
  score: number;
}

// 候補駅ごとに「近さ（平均）」と「公平さ（最長）」を混ぜた点数を出し，低い順に並べる
function rankCandidates(members: DemoStation[], fairnessWeight: number): CandidateScore[] {
  return STATIONS.map((station) => {
    const minutes = members.map((member) => estimateMinutes(member, station));
    const average = minutes.reduce((total, value) => total + value, 0) / minutes.length;
    const longest = Math.max(...minutes);
    const score = fairnessWeight * longest + (1 - fairnessWeight) * average;
    return { station, minutes, average, longest, score };
  }).sort((a, b) => a.score - b.score);
}

export function CenterDemo() {
  const [memberNames, setMemberNames] = useState<string[]>(DEFAULT_MEMBERS);
  // 0 = 近さだけを見る，100 = 公平さ（いちばん遠い人）だけを見る
  const [fairnessPercent, setFairnessPercent] = useState(60);
  const [message, setMessage] = useState('');

  const members = useMemo(
    () => memberNames.map((name) => STATIONS.find((station) => station.name === name)).filter((s): s is DemoStation => Boolean(s)),
    [memberNames],
  );
  const ranking = useMemo(() => rankCandidates(members, fairnessPercent / 100), [members, fairnessPercent]);
  const best = ranking[0];
  const center = project(best.station);
  const longestMinutes = Math.max(...best.minutes, 1);

  const toggleMember = (name: string) => {
    if (memberNames.includes(name)) {
      if (memberNames.length <= MIN_MEMBERS) {
        setMessage(`最寄駅は${MIN_MEMBERS}駅以上必要です．`);
        return;
      }
      setMessage('');
      setMemberNames(memberNames.filter((item) => item !== name));
      return;
    }
    if (memberNames.length >= MAX_MEMBERS) {
      setMessage(`このデモで選べるのは${MAX_MEMBERS}駅までです．`);
      return;
    }
    setMessage('');
    setMemberNames([...memberNames, name]);
  };

  return (
    <div className={styles.demo}>
      <div className={styles.demoControls}>
        <fieldset>
          <legend>
            みんなの最寄駅 <span>{members.length} / {MAX_MEMBERS}</span>
          </legend>
          <div className={styles.stationChips}>
            {STATIONS.map((station) => {
              const memberIndex = memberNames.indexOf(station.name);
              const isSelected = memberIndex >= 0;
              return (
                <button
                  key={station.name}
                  type="button"
                  aria-pressed={isSelected}
                  className={isSelected ? styles.chipSelected : styles.chip}
                  style={isSelected ? { '--chip-color': MEMBER_COLORS[memberIndex] } as CSSProperties : undefined}
                  onClick={() => toggleMember(station.name)}
                >
                  {station.name}
                </button>
              );
            })}
          </div>
          <p className={styles.demoMessage} role="status">
            {message}
          </p>
        </fieldset>

        <label className={styles.weightControl}>
          <span>
            <b>近さ</b>
            <b>公平さ</b>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={fairnessPercent}
            onChange={(event) => setFairnessPercent(Number(event.target.value))}
            aria-label="近さと公平さのどちらを重視するか"
            aria-valuetext={`公平さを${fairnessPercent}パーセント重視`}
          />
        </label>
      </div>

      <div className={styles.demoStage}>
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className={styles.demoMap} role="img" aria-label={`提案された中心駅は${best.station.name}です`}>
          {/* 候補になりうるすべての駅 */}
          {STATIONS.map((station) => {
            const point = project(station);
            const isHighlighted = memberNames.includes(station.name) || station.name === best.station.name;
            return (
              <g key={station.name} className={styles.mapStation}>
                <circle cx={point.x} cy={point.y} r={2.6} />
                {!isHighlighted && !isInCrowdedArea(station) && (
                  <text x={point.x + 6} y={point.y + 3}>
                    {station.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* 各メンバーから中心駅への線（中心が変わるたびに描き直す） */}
          {members.map((member, index) => {
            const point = project(member);
            return (
              <line
                key={`${member.name}-${best.station.name}`}
                className={styles.mapRoute}
                x1={point.x}
                y1={point.y}
                x2={center.x}
                y2={center.y}
                pathLength={1}
                stroke={MEMBER_COLORS[index]}
                style={{ animationDelay: `${index * 90}ms` }}
              />
            );
          })}

          {members.map((member, index) => {
            const point = project(member);
            return (
              <g key={member.name} className={styles.mapMember}>
                <circle cx={point.x} cy={point.y} r={11} fill={MEMBER_COLORS[index]} />
                <text x={point.x} y={point.y + 4} textAnchor="middle">
                  {index + 1}
                </text>
                <text className={styles.mapMemberName} x={point.x} y={point.y + 27} textAnchor="middle">
                  {member.name}
                </text>
              </g>
            );
          })}

          <g key={best.station.name} className={styles.mapCenter}>
            <circle className={styles.mapCenterPulse} cx={center.x} cy={center.y} r={16} />
            <circle className={styles.mapCenterRing} cx={center.x} cy={center.y} r={12} />
            <text x={center.x} y={center.y - 22} textAnchor="middle">
              {best.station.name}
            </text>
          </g>
        </svg>

        <div className={styles.demoResult} aria-live="polite">
          <p className={styles.resultLabel}>提案された中心駅</p>
          <p key={best.station.name} className={styles.resultStation}>
            {best.station.name}
          </p>
          <dl className={styles.resultStats}>
            <div>
              <dt>平均</dt>
              <dd>
                <RollingNumber value={Math.round(best.average)} />分
              </dd>
            </div>
            <div>
              <dt>いちばん遠い人</dt>
              <dd>
                <RollingNumber value={best.longest} />分
              </dd>
            </div>
          </dl>

          <ul className={styles.timeBars} aria-label="各メンバーの所要時間（概算）">
            {members.map((member, index) => (
              <li key={member.name}>
                <span>{member.name}</span>
                <span className={styles.timeBarTrack}>
                  <span
                    className={styles.timeBarFill}
                    style={{
                      width: `${(best.minutes[index] / longestMinutes) * 100}%`,
                      background: MEMBER_COLORS[index],
                    }}
                  />
                </span>
                <b>{best.minutes[index]}分</b>
              </li>
            ))}
          </ul>

          <ol className={styles.runnerUps} aria-label="ほかの候補">
            {ranking.slice(1, RANKING_SIZE).map((candidate, index) => (
              <li key={candidate.station.name}>
                <span>{index + 2}</span>
                {candidate.station.name}
                <small>
                  平均{Math.round(candidate.average)}分・最長{candidate.longest}分
                </small>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className={styles.demoNote}>
        このデモは，駅どうしの直線距離から所要時間をおおまかに見積もった簡易版です．実際の EkiHub は，全国約8,200駅の鉄道網に沿った経路で所要時間を計算します．
      </p>
    </div>
  );
}
