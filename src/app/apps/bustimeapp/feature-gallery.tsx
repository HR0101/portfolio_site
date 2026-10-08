'use client';

import { useState } from 'react';
import { Screenshot } from './screenshot';
import styles from './product.module.css';

const features = [
  { id: 'timetable', label: '次の便・時刻表', title: 'あと何分。ほかの便は。', copy: 'ホームでは出発までの時間を大きく。時刻表では、その日の便を一覧に。知りたいことに合わせて、ふたつの画面を行き来できます。', shots: [{ image: 'next-bus', alt: '朝のホーム画面。次のバスまであと8分、後続の便も表示', caption: '次の便を大きく' }, { image: 'timetable', alt: '朝の時刻表画面。8時の00分と10分の便が強調されている', caption: '一日の便を一覧に' }] },
  { id: 'notify', label: '出発前の通知', title: '乗る便を決めたら、忘れずに。', copy: '便ごとに5分前・10分前・15分前の通知を選択。設定した通知を一覧で確認でき、出かける準備に合わせて使えます。', shots: [{ image: 'notify', alt: '8時の便の通知設定。5分前、10分前、15分前の選択肢', caption: '通知のタイミングを選ぶ' }, { image: 'notifications', alt: '夜の設定した通知一覧の画面', caption: '設定した通知を確認' }] },
  { id: 'live', label: 'Live Activity', title: 'アプリの外でも、次のバスへ。', copy: 'ロック画面とDynamic Islandに、便の出発時刻と残り時間を表示。アプリを開き直さずに確認できます。', shots: [{ image: 'live-lockscreen', alt: 'iPhoneのロック画面にBusTimeAppの17時46分発の便と残り8分を表示', caption: 'ロック画面' }, { image: 'live-island', alt: '展開されたDynamic IslandにBusTimeAppの経路と残り7分を表示', caption: 'Dynamic Island' }] },
  { id: 'holiday', label: '土日祝の便', title: 'いつもと違う日も、迷わない。', copy: '土日祝ダイヤの日には、運行のお知らせを表示。ホームと時刻表の両方で、その日の便を確認できます。', shots: [{ image: 'holiday-home', alt: '土日祝ダイヤのホーム画面。運行のお知らせと13時08分発の便', caption: '運行日をホームで確認' }, { image: 'holiday-timetable', alt: '土日祝ダイヤの時刻表画面。運行のお知らせを上部に表示', caption: 'その日の時刻表' }] },
  { id: 'large', label: '大きな文字', title: '自分の読みやすさで、使う。', copy: '文字を大きくした状態でも、経路や残り時間、時刻表を確認できます。日々使う画面だから、読みやすさにも配慮しています。', shots: [{ image: 'large-home', alt: '文字サイズを大きくしたBusTimeAppのホーム画面', caption: 'ホームの文字サイズ' }, { image: 'large-timetable', alt: '文字サイズを大きくしたBusTimeAppの時刻表画面', caption: '時刻表の文字サイズ' }] },
  { id: 'languages', label: 'English・中文', title: 'いつもの案内を、使う人の言葉で。', copy: '日本語に加え、英語・中国語の画面も用意。検索条件や案内をそれぞれの言葉で表示します。', shots: [{ image: 'english', alt: '英語のBusTimeAppのホーム画面。Today、Departure、Next busを表示', caption: 'English' }, { image: 'chinese', alt: '中国語のBusTimeAppのホーム画面。今天、出发时间、下一班を表示', caption: '中文' }] },
  { id: 'settings', label: 'はじめ方・設定', title: 'はじめてでも、自分らしく。', copy: 'チュートリアルで使い方を案内し、設定では時刻に合わせた背景やカードの濃さを調整。毎日の使い心地を、自分に合わせられます。', shots: [{ image: 'tutorial', alt: 'BusTimeAppのはじめに画面。バスの時間をもっと気持ちよくと案内', caption: 'はじめての案内' }, { image: 'settings', alt: '背景の時刻連動とカードの濃さ、Live Activityを調整する設定画面', caption: '使い心地を調整' }] },
];

export function FeatureGallery() {
  const [active, setActive] = useState('timetable');
  const feature = features.find(item => item.id === active)!;
  return <div className={styles.featureGallery}>
    <div className={styles.featureButtons} role="group" aria-label="BusTimeAppの機能を選ぶ">
      {features.map(item => <button type="button" key={item.id} aria-pressed={active === item.id} aria-controls="bustime-feature" onClick={() => setActive(item.id)}>{item.label}</button>)}
    </div>
    <div id="bustime-feature" className={styles.featurePanel}>
      <div className={styles.featureCopy} aria-live="polite" aria-atomic="true"><p className={styles.eyebrow}>{feature.label}</p><h3>{feature.title}</h3><p>{feature.copy}</p><span>画面を選ぶと、拡大して確認できます。</span></div>
      <div className={styles.featureScreens} key={feature.id}>{feature.shots.map(shot => <Screenshot key={shot.image} {...shot} />)}</div>
    </div>
    <p className={styles.captureNote}>掲載画面の日時・便は撮影時のものです。Live Activityの表示は端末やOSにより異なります。</p>
  </div>;
}
