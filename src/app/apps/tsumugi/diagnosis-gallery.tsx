'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  CalendarClock,
  Check,
  Hourglass,
  Layers,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import styles from './product.module.css';

interface DiagnosisScreen {
  id: string;
  tab: string;
  step: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  points: [string, string][];
  // public 配下のスクリーンショット名
  image: string;
  alt: string;
}

const SCREENS: DiagnosisScreen[] = [
  {
    id: 'library',
    tab: 'ライブラリ',
    step: '01 / SAVE',
    icon: Layers,
    title: '「気になる」を、その場で。',
    copy:
      'Safari の共有シートから Tsumugi を選ぶだけ。本文を取り込み、保存したその瞬間に解析まで走らせます。開き直す手間はありません。',
    points: [
      ['共有シートから保存', 'アプリに戻らなくても、読んでいた流れのまま手元に残せます。'],
      ['横断して探せる', 'タイトル・本文・要約・メモ・タグをまとめて検索。意味の近さも手がかりにします。'],
      ['状態で絞り込む', '未読・お気に入り・要注意。読み返すべき記事が、埋もれません。'],
    ],
    image: 'library',
    alt: 'Tsumugiのライブラリ画面。保存した記事が信頼度と鮮度のラベル付きで並ぶ',
  },
  {
    id: 'summary',
    tab: '要約',
    step: '02 / READ',
    icon: Sparkles,
    title: '読む前に、要点だけ。',
    copy:
      'TL;DR とキーポイントを先に示します。いま読むのか、あとに回すのか。その判断を、開いて数秒で済ませるための一段です。',
    points: [
      ['TL;DR とキーポイント', '数行の要約と箇条書き。記事の骨格だけを先に受け取れます。'],
      ['4つのタブで行き来', '要約・本文・診断・メモ。読み方を変えても、同じ画面の中で完結します。'],
      ['読了の目安', '「約1分で読めます」。読む前に、かかる時間まで分かります。'],
    ],
    image: 'item-summary',
    alt: 'Tsumugiの記事画面。上部に織り模様、その下に信頼度56点と鮮度0点、TL;DRが並ぶ',
  },
  {
    id: 'credibility',
    tab: '信頼度',
    step: '03 / TRUST',
    icon: ShieldCheck,
    title: '何を見て、そう判断したのか。',
    copy:
      '発信元・透明性・論拠・中立性・外部照合の5項目を、重み付きで採点します。点数だけでなく、その理由まで開いて見せる設計です。',
    points: [
      ['5項目のレーダー', '弱い軸が、形のゆがみとして見えます。判定できない項目は除いて計算し直します。'],
      ['気になる点を名指し', '「出典の提示がない」「記述に偏りが見られる」。曖昧に濁しません。'],
      ['色と言葉の両方で', '色だけに頼らず、注意の度合いを必ず文章でも伝えます。'],
    ],
    image: 'credibility',
    alt: 'Tsumugiの信頼度診断画面。レーダーチャートとカテゴリ別スコアの内訳',
  },
  {
    id: 'freshness',
    tab: '鮮度',
    step: '04 / TIME',
    icon: Hourglass,
    title: '古びる速さは、話題ごとに違う。',
    copy:
      '同じ1年前の記事でも、生成AIと歴史では意味が違います。トピックごとの半減期を置き、経過日数から情報の古さを見積もります。',
    points: [
      ['トピック別の半減期', 'AI・生成AI なら120日。話題の移り変わる速さを、数字に落とします。'],
      ['本文の年号も見る', '「2023年最新」と書かれた2年前の記事には、補正で減点を効かせます。'],
      ['古いときは、そう言う', '陳腐化の可能性が高い記事では、後続情報の確認をすすめます。'],
    ],
    image: 'freshness',
    alt: 'Tsumugiの情報の新しさ画面。半減期モデルの減衰カーブと適用された補正',
  },
  {
    id: 'digest',
    tab: 'ダイジェスト',
    step: '05 / REVIEW',
    icon: CalendarClock,
    title: '集めた先を、置き去りにしない。',
    copy:
      '今週の保存と未読、古くなった記事、保存の傾向。溜めるだけで終わらせないための、振り返りの一枚です。',
    points: [
      ['今週のまとめ', '保存・未読・要確認・注意の4つを、数字でひと目に。'],
      ['古くなった記事', '鮮度が落ちた記事を拾い上げ、読み直すきっかけをつくります。'],
      ['保存の傾向', '何に関心が寄っているのか。集めたものが、自分の輪郭になります。'],
    ],
    image: 'digest',
    alt: 'Tsumugiのダイジェスト画面。今週のまとめと古くなった記事、未読リマインド',
  },
];

export function DiagnosisGallery() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // タブを切り替えた瞬間に枠だけが見える状態を避けるため，
  // 表示に余裕があるタイミングで残りの画面も読み込んでおく
  useEffect(() => {
    const preload = () => {
      SCREENS.forEach((screen) => {
        const image = new Image();
        image.src = `/projects/tsumugi-screens/${screen.image}.webp`;
      });
    };
    const idle = window.requestIdleCallback;
    if (typeof idle === 'function') {
      const handle = idle(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // WAI-ARIA のタブパターン（←→・Home・End で移動する）
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % SCREENS.length;
        break;
      case 'ArrowLeft':
        next = (index - 1 + SCREENS.length) % SCREENS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = SCREENS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div className={styles.diagTabs} role="tablist" aria-label="Tsumugiの画面を選ぶ">
        {SCREENS.map((screen, index) => (
          <button
            key={screen.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tsumugi-tab-${screen.id}`}
            aria-selected={index === active}
            aria-controls={`tsumugi-panel-${screen.id}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {screen.tab}
          </button>
        ))}
      </div>

      {SCREENS.map((screen, index) => {
        const Icon = screen.icon;
        return (
          <div
            key={screen.id}
            id={`tsumugi-panel-${screen.id}`}
            role="tabpanel"
            aria-labelledby={`tsumugi-tab-${screen.id}`}
            hidden={index !== active}
            tabIndex={0}
            className={styles.diagPanel}
          >
            <div className={styles.diagCopy}>
              <span className={styles.step}>{screen.step}</span>
              <h3>
                <Icon size={26} aria-hidden="true" /> {screen.title}
              </h3>
              <p>{screen.copy}</p>
              <ul className={styles.diagPoints}>
                {screen.points.map(([title, description]) => (
                  <li key={title}>
                    <Check size={17} aria-hidden="true" />
                    <span>
                      <strong>{title}</strong>
                      {description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <figure className={styles.diagShot}>
              <div className={styles.phone}>
                <img
                  src={`/projects/tsumugi-screens/${screen.image}.webp`}
                  alt={screen.alt}
                  width={840}
                  height={1826}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>実際のアプリ画面</figcaption>
            </figure>
          </div>
        );
      })}
    </>
  );
}
