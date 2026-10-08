'use client';

import { useState } from 'react';
import { Screenshot } from './screenshot';
import styles from './product.module.css';

const scenes = [
  { id: 'dawn', group: '時間帯', label: '夜明け', time: '04:50', title: '空が明るくなる、その前から。', copy: '紫色の空から朝へ。早い時間の確認にも、やわらかな色を添えます。' },
  { id: 'morning', group: '時間帯', label: '朝', time: '07:52', title: '一日のはじまりに、澄んだ青。', copy: '海辺の景色と、次に乗れる便。朝のホーム画面では、出発までの時間をひと目で確認できます。' },
  { id: 'noon', group: '時間帯', label: '昼', time: '12:22', title: '明るい空でも、情報はくっきり。', copy: '白い雲と青い海。明るい背景に合わせたカードで、経路と次の便を読みやすく。' },
  { id: 'sunset', group: '時間帯', label: '夕暮れ', time: '18:48', title: '帰り道に、あたたかな色を。', copy: '空が桃色に染まる夏の夕暮れ。風景が変わっても、必要な情報はいつもの場所に。' },
  { id: 'night', group: '時間帯', label: '夜', time: '21:33', title: '夜には、夜の表情を。', copy: '星と街の灯りがともる海辺。カードと文字も夜の配色へ切り替わります。' },
  { id: 'spring', group: '季節', label: '春の朝', time: '07:52', title: '季節が変わると、空気も変わる。', copy: '春の朝の実画面。同じ朝の時刻でも、季節に合わせた空と光で迎えます。' },
  { id: 'autumn', group: '季節', label: '秋の夕方', time: '16:52', title: '少し早く訪れる、秋の夕暮れ。', copy: '橙色の空と低い日差し。季節に応じた日の長さが、夕方の風景にも映ります。' },
  { id: 'winter', group: '季節', label: '冬の夜明け', time: '06:52', title: '冬の朝には、静かな色を。', copy: '淡い紫と冷たい青。冬の夜明けにも、便の確認は変わらずシンプルです。' },
  { id: 'rain-heavy', group: '雨の夜', label: '強い雨', time: '21:33', title: '雨粒も、夜の光も。', copy: '強い雨の夜。暗い空に重なる雨粒と、路面に映る灯りまで、実際のアプリ画面で確かめられます。' },
  { id: 'rain-winter', group: '雨の夜', label: '冬の雨', time: '21:33', title: '冬の雨には、冬の景色。', copy: '冬の夜に降る雨。強い雨の場面と見比べると、雨の密度や景色の違いが分かります。' },
];

export function SkyGallery() {
  const [active, setActive] = useState('morning');
  const scene = scenes.find(item => item.id === active)!;
  return (
    <div className={styles.gallery}>
      <div className={styles.scenePanel}>
        <div className={styles.sceneControls}>
          {['時間帯', '季節', '雨の夜'].map(group => <div key={group} className={styles.sceneGroup} role="group" aria-label={group}>
            <p>{group}</p>
            <div className={styles.sceneButtons}>{scenes.filter(item => item.group === group).map(item => <button key={item.id} type="button" aria-pressed={active === item.id} aria-controls="bustime-scene" onClick={() => setActive(item.id)}>{item.label}</button>)}</div>
          </div>)}
        </div>
        <div id="bustime-scene" className={styles.sceneImage} key={scene.id}>
          <Screenshot image={scene.id} alt={`BusTimeAppの${scene.label}のホーム画面`} caption={`${scene.label} / ${scene.time}`} />
        </div>
      </div>
      <div className={styles.sceneCopy} aria-live="polite" aria-atomic="true">
        <p className={styles.sceneTime}>{scene.time}</p><h3>{scene.title}</h3><p>{scene.copy}</p>
        <p className={styles.finePrint}>すべて実際のアプリのスクリーンショットです。時刻・天気・便は撮影時の条件です。画像を選ぶと拡大できます。</p>
      </div>
    </div>
  );
}
