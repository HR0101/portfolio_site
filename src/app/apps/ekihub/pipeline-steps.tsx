"use client";

import { useScrollLinked } from '../../../hooks/useScrollLinked';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import styles from './product.module.css';

// 中心駅を決めるまでの5段階（EkiHub の README の算出手順に沿う）
const STEPS = [
  {
    title: '重心を出す',
    text: '入力された駅の緯度・経度を人数で重み付けして平均し，地理的な重心を求めます．ただしこれは地図に描く参考値で，答えには使いません．',
  },
  {
    title: '線路のつながりを組む',
    text: '全国約8,200駅を，近い6駅どうしで結んだグラフにします．つなぐ距離は12kmまで．ダイクストラ法で，各メンバーから全駅への所要時間を出します．',
  },
  {
    title: '候補を絞る',
    text: '「主要駅だけ」なら乗降客数が1日20万人以上の駅に，「すべての駅」なら規模を問わず候補にします．',
  },
  {
    title: '公平さで採点する',
    text: '所要時間のばらつきの小ささ（公平さ）・平均の短さ（近さ）・運賃を正規化して重み付けし，1つの点数にまとめます．',
  },
  {
    title: '上位だけ精緻化する',
    text: '経路 API が使えるときは上位8駅だけ実際の所要時間・運賃・乗換回数で採点し直します．使えなければ距離からの概算に戻します．',
  },
];

// スクロールに合わせて縦線が伸び，通過した段階が点灯する手順表
export function PipelineSteps() {
  const { ref, progress } = useScrollLinked<HTMLOListElement>('fill');
  const prefersReducedMotion = usePrefersReducedMotion();
  const displayedProgress = prefersReducedMotion ? 1 : progress;

  return (
    <ol ref={ref} className={styles.pipeline}>
      <span className={styles.pipelineTrack} aria-hidden="true">
        <span style={{ transform: `scaleY(${displayedProgress.toFixed(3)})` }} />
      </span>
      {STEPS.map((step, index) => {
        // 縦線の先端がその段階の位置を越えたら点灯させる
        const isReached = displayedProgress >= index / STEPS.length + 0.04;
        return (
          <li key={step.title} className={isReached ? styles.pipelineStepReached : styles.pipelineStep}>
            <span className={styles.pipelineIndex}>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
