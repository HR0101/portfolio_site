'use client';

import { useState } from 'react';
import { Moon, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react';
import styles from './product.module.css';

interface Scene {
  id: string;
  label: string;
  icon: LucideIcon;
  time: string;
  title: string;
  copy: string;
}

const scenes: Scene[] = [
  {
    id: 'dawn',
    label: '朝',
    icon: Sunrise,
    time: '06:00',
    title: '一日のはじまりを、やわらかく。',
    copy: '淡い紫から、あたたかな朝焼けへ。時間の経過を、空の色で感じられます。',
  },
  {
    id: 'day',
    label: '昼',
    icon: Sun,
    time: '11:00',
    title: '澄んだ青に、ひと息。',
    copy: '明るい空に浮かぶ雲と、水面のきらめき。いつもの確認に、小さな風景を添えます。',
  },
  {
    id: 'sunset',
    label: '夕暮れ',
    icon: Sunset,
    time: '17:30',
    title: '帰り道に、あたたかな色を。',
    copy: '橙色から夜の色へ、少しずつ移る空。アプリでは季節によっても配色が変わります。',
  },
  {
    id: 'night',
    label: '夜',
    icon: Moon,
    time: '21:00',
    title: '夜には、夜の表情を。',
    copy: '暗い空に星が現れ、街の灯りがともる。月の満ち欠けは、水面の光にも映ります。',
  },
];

export function SkyGallery() {
  const [active, setActive] = useState(1);
  const scene = scenes[active];

  return (
    <div className={styles.gallery}>
      {/* 大きな面の上に，時間帯の切り替えを重ねる */}
      <div className={styles.scenePanel}>
        <div className={styles.sceneButtons} role="group" aria-label="背景の時間帯を選ぶ">
          {scenes.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                aria-pressed={active === index}
                onClick={() => setActive(index)}
              >
                <span className={styles.sceneButtonIcon} aria-hidden="true">
                  <Icon size={15} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        <figure className={styles.sceneImage}>
          {scenes.map((item, index) => (
            <img
              key={item.id}
              src={`/projects/bustimeapp-background-${item.id}.png`}
              alt={`BusTimeAppの実際の描画コードで書き出した${item.label}の背景`}
              width={1206}
              height={2622}
              hidden={active !== index}
              loading="lazy"
            />
          ))}
        </figure>
      </div>

      <div className={styles.sceneCopy} aria-live="polite" aria-atomic="true">
        <p className={styles.sceneTime}>{scene.time}</p>
        <h3>{scene.title}</h3>
        <p>{scene.copy}</p>
        <p className={styles.finePrint}>
          アプリの背景描画コードから、ボタンやカードを含めずに書き出した静止画です。秋・晴天の設定で、各時間帯を表示しています。
        </p>
      </div>
    </div>
  );
}
