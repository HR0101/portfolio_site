'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  BarChart3,
  Check,
  ListOrdered,
  MapPin,
  Sparkles,
  TrainFront,
  Users,
  type LucideIcon,
} from 'lucide-react';
import styles from './product.module.css';

interface TourScreen {
  id: string;
  tab: string;
  step: string;
  icon: LucideIcon;
  title: string;
  copy: string;
  points: [string, string][];
  // public/projects/ekihub-screens/ 配下の画像名と，その実寸
  image: string;
  width: number;
  height: number;
  alt: string;
}

// 「東京・川崎・船橋」で実際に検索したときの画面を，使う順に並べる
const SCREENS: TourScreen[] = [
  {
    id: 'input',
    tab: '駅を入れる',
    step: '01 / INPUT',
    icon: Users,
    title: '集まる人の最寄駅を，並べるだけ．',
    copy: '最寄駅を2つ以上入れて「中心駅を検索する」を押します．駅名は入れはじめると候補が出るので，正式名称を覚えていなくても大丈夫です．',
    points: [
      ['人数も入れられる', '同じ駅から何人来るかを選ぶと，その人数ぶん重みを付けて考えます．'],
      ['候補の範囲を選べる', '乗降客の多い「主要駅だけ」か，規模を問わない「すべての駅」かを切り替えられます．'],
    ],
    image: 'input',
    width: 804,
    height: 910,
    alt: 'EkiHubの入力パネル．最寄駅の欄に東京・川崎・船橋が入り，それぞれ人数は1人',
  },
  {
    id: 'result',
    tab: '中心駅が出る',
    step: '02 / ANSWER',
    icon: Sparkles,
    title: '答えは1駅．根拠の数字と一緒に．',
    copy: '3人の最寄駅から提案されたのは新木場でした．駅名の下に，通っている路線と，決め手になった数字を並べます．',
    points: [
      ['4つの数字', '平均所要時間・時間のばらつき・平均運賃・重心からの距離．'],
      ['そのまま共有', 'URL・共有・QR・結果のテキストコピー・印刷から選べます．'],
    ],
    image: 'result',
    width: 840,
    height: 1412,
    alt: 'EkiHubの結果画面．提案された中心駅は新木場．平均所要時間42分，時間のばらつき±17.2，平均運賃363円，重心までの距離1.4km',
  },
  {
    id: 'times',
    tab: '全員の所要時間',
    step: '03 / FAIRNESS',
    icon: BarChart3,
    title: '遠すぎる人がいないかを，バーで．',
    copy: 'メンバーごとの所要時間と運賃の目安を横棒で並べます．誰か1人だけが遠くないか，ひと目で確かめられます．',
    points: [
      ['鉄道網に沿った概算', '直線距離ではなく，駅どうしのつながりをたどった所要時間です．'],
      ['運賃の目安つき', '時間だけでなく，片道の運賃の目安も並べます．'],
    ],
    image: 'times',
    width: 840,
    height: 243,
    alt: '各最寄駅からの所要時間．東京20分・200円，川崎62分・480円，船橋45分・410円',
  },
  {
    id: 'compare',
    tab: '候補を比べる',
    step: '04 / COMPARE',
    icon: ListOrdered,
    title: '2番目，3番目の候補も，同じ物差しで．',
    copy: '上位8駅を，平均所要時間・時間のばらつき・平均運賃で並べた表です．行を選ぶと，その駅を基準にした結果へ切り替わります．',
    points: [
      ['1位だけで決めない', 'お店の都合や好みで，近い順位の駅に寄せることもできます．'],
      ['数字で見比べる', '時間は少し長くても運賃が安い，といった違いが分かります．'],
    ],
    image: 'compare',
    width: 840,
    height: 682,
    alt: '候補駅の比較表．1位新木場，2位豊洲，3位田町，4位浜松町，5位品川，6位新橋，7位恵比寿，8位大崎',
  },
  {
    id: 'spots',
    tab: '周辺スポット',
    step: '05 / AFTER',
    icon: MapPin,
    title: '決まったら，お店探しへ．',
    copy: '集合駅の近くのお店や公園を，カテゴリを選んで Google マップで探せます．駅が決まったあとの段取りまで，同じ画面から進めます．',
    points: [
      ['7つのカテゴリ', 'カフェ・レストラン・ファストフード・居酒屋・カラオケ・コンビニ・公園．'],
      ['地図アプリへ渡す', '検索条件を付けたまま Google マップを開きます．'],
    ],
    image: 'spots',
    width: 840,
    height: 253,
    alt: '周辺スポットの欄．新木場駅の近くを探すカテゴリのボタンと「Googleマップで探す」ボタン',
  },
  {
    id: 'live',
    tab: '運行情報',
    step: '06 / LIVE',
    icon: TrainFront,
    title: '出かける前に，遅れも確かめる．',
    copy: '首都圏の ODPT 提供路線について，最新の運行情報を表示します．遅れている路線は先頭に，平常運転の路線はまとめて畳みます．',
    points: [
      ['その場で更新', '右上のボタンで，いつでも最新の情報を取り直せます．'],
      ['対象を明記', '全路線を網羅していないことも，画面の中で断っています．'],
    ],
    image: 'live',
    width: 840,
    height: 345,
    alt: '鉄道の運行情報．撮影時点では日比谷線と副都心線に一部列車の遅延があり，他17路線は平常運転',
  },
];

export function ScreenTour() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // タブを切り替えた瞬間に枠だけが見える状態を避けるため，余裕のあるときに残りの画面も読み込んでおく
  useEffect(() => {
    const preload = () => {
      SCREENS.forEach((screen) => {
        const image = new Image();
        image.src = `/projects/ekihub-screens/${screen.image}.webp`;
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
    <div className={styles.tour}>
      <div className={styles.tourTabs} role="tablist" aria-label="EkiHub の画面を選ぶ">
        {SCREENS.map((screen, index) => (
          <button
            key={screen.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`ekihub-tab-${screen.id}`}
            aria-selected={index === active}
            aria-controls={`ekihub-panel-${screen.id}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {screen.tab}
          </button>
        ))}
      </div>

      {SCREENS.map((screen, index) => {
        const Icon = screen.icon;
        return (
          <div
            key={screen.id}
            id={`ekihub-panel-${screen.id}`}
            role="tabpanel"
            aria-labelledby={`ekihub-tab-${screen.id}`}
            hidden={index !== active}
            tabIndex={0}
            className={styles.tourPanel}
          >
            <div className={styles.tourCopy}>
              <span className={styles.tourStep}>{screen.step}</span>
              <h3>
                <Icon size={24} aria-hidden="true" /> {screen.title}
              </h3>
              <p>{screen.copy}</p>
              <ul className={styles.tourPoints}>
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
            <figure className={styles.tourShot}>
              <div className={styles.browser}>
                <div className={styles.browserBar} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <p>ekihub.jp</p>
                </div>
                <div className={styles.browserBody}>
                  <img
                    src={`/projects/ekihub-screens/${screen.image}.webp`}
                    alt={screen.alt}
                    width={screen.width}
                    height={screen.height}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
              </div>
              <figcaption>実際の画面（東京・川崎・船橋で検索．2026年10月撮影）</figcaption>
            </figure>
          </div>
        );
      })}
    </div>
  );
}
