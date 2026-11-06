import styles from './product.module.css';

// 波の1周期ぶんの幅と，並べる回数．全体の幅は，横にずらしても継ぎ目が出ない 2 × (周期 × 4) にそろえる
const WAVE_PERIOD = 300;
const WAVE_REPEAT = 8;
const WAVE_HEIGHT = 120;
const WAVE_AMPLITUDE = 10;

// 山と谷が続く1本の波．同じ形を周期ごとにくり返す
function buildWavePath() {
  const half = WAVE_PERIOD / 2;
  const segment = `c ${half * 0.27} ${-WAVE_AMPLITUDE}, ${half * 0.53} ${WAVE_AMPLITUDE}, ${half} 0 s ${half * 0.73} ${-WAVE_AMPLITUDE}, ${half} 0 `;
  return `M0 ${WAVE_HEIGHT * 0.3} ${segment.repeat(WAVE_REPEAT)}V ${WAVE_HEIGHT} H 0 Z`;
}

const WAVE_PATH = buildWavePath();

// 仕組みの図の水面に敷く，静止した波（動かさない）
export function Waves() {
  return (
    <div className={styles.waves} aria-hidden="true">
      <svg className={styles.waveSheet} viewBox={`0 0 ${WAVE_PERIOD * WAVE_REPEAT} ${WAVE_HEIGHT}`} preserveAspectRatio="none">
        <path d={WAVE_PATH} />
      </svg>
    </div>
  );
}
