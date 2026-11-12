export const LAB_PATH = '/lab';
export type LabTag = '点' | '物理' | '光' | '生き物';
export interface LabExperiment {
  id: string;
  title: string;
  state: '試作' | '継続中' | '公開';
  summary: string;
  hint: string;
  tags: readonly LabTag[];
  size: 'wide' | 'tall' | 'square';
}

export const LAB_EXPERIMENTS = [
  { id: 'dot-waves', title: '点の波', state: '試作', summary: '正弦波で点の高さと大きさを変え，触れた場所から波紋を重ねる実験です．', hint: '面を触ると波紋が生まれます．スライダーで波の速さを変えられます．', tags: ['点'], size: 'wide' },
  { id: 'dot-orbit', title: '点の軌道', state: '試作', summary: '格子の中心を回る点に，近づくほど軌道が広がるルールを加えました．', hint: 'ポインタを近づけるか，面をタップして軌道を広げてください．', tags: ['点'], size: 'square' },
  { id: 'life', title: '命の遊び', state: '試作', summary: 'RH のセルから始まる，端がつながった Game of Life です．静止や消滅のあとには自動で再投入します．', hint: '押したままなぞるとセルを描けます．世代の速さと初期化も試せます．', tags: ['点', '生き物'], size: 'square' },
  { id: 'boids', title: '情報片が集まる', state: '試作', summary: '分離・整列・結合で動く群れを，カードの形へ集める実験です．実サービスの処理を示すものではありません．', hint: '「集める」で触れた場所にカードを作り，「散らす」で群れに戻します．', tags: ['物理', '生き物'], size: 'wide' },
  { id: 'metaballs', title: 'つながる塊', state: '試作', summary: '機能が 1 つになる，という比喩の実験です．距離から場を計算し，閾値ごとに濃淡を塗り分けました．', hint: '面を触ると，ひとつの塊がついてきます．近づけてつなげてください．', tags: ['光'], size: 'square' },
  { id: 'smoke-ring', title: '煙の環', state: '試作', summary: '連続するノイズで点の環を歪めています．煙の物理を再現したものではありません．', hint: '触れた場所へ環が寄ります．クリックで歪みの強さが変わります．', tags: ['点', '光'], size: 'square' },
  { id: 'spiral', title: '渦', state: '試作', summary: '複数の腕に並べた点を回し，渦の方向を切り替える実験です．', hint: 'クリック・タップで，回転の向きが反転します．', tags: ['点', '光'], size: 'tall' },
  { id: 'particle-text', title: '点の文字', state: '試作', summary: 'Canvas に描いた Trust・信頼・RH のマスクを点にし，時間で文字を渡り歩かせました．', hint: 'ポインタやタップで点を散らせます．離すと元の文字へ戻ります．', tags: ['点'], size: 'wide' },
  { id: 'cloth', title: '布のポスター', state: '試作', summary: '上辺を留めた格子を Verlet 積分と長さの拘束で揺らしています．RH の字も格子に沿って変形する簡略化した布の実験です．', hint: '布を触ってつついてください．風と重力でゆっくり戻ります．', tags: ['物理'], size: 'tall' },
  { id: 'flow-field', title: '流れの場', state: '試作', summary: '連続するノイズから流れを作り，点の短い軌跡を濃淡で残す実験です．', hint: 'クリック・タップで流れが反転します．触れた場所の周りで流れが曲がります．', tags: ['点', '物理'], size: 'wide' },
  { id: 'ripple-field', title: '水面の波紋', state: '試作', summary: '同心円の波を重ね，点の密度で干渉を描く実験です．水の流体計算ではありません．', hint: 'クリック・タップで波紋を置いてください．重なりも残ります．', tags: ['点', '物理'], size: 'square' },
  { id: 'lissajous', title: 'ふたつの振り子', state: '試作', summary: '縦と横の周波数の比から，リサジュー曲線を描いています．', hint: 'クリック・タップで周波数の比が変わり，別の結び目になります．', tags: ['点', '物理'], size: 'square' },
  { id: 'constellation', title: '近づく星座', state: '試作', summary: '漂う点のうち，触れた場所に近い点同士だけを線で結ぶ実験です．', hint: '面をなぞって星座を探してください．クリックで点の配置が変わります．', tags: ['点'], size: 'wide' },
  { id: 'liquid-metal', title: '金属の署名', state: '試作', summary: 'RH の輪郭を固定し，内側に反射を思わせる縞を流す実験です．光学的に正確な金属ではありません．', hint: 'ポインタで縞の光源を動かし，クリックで縞の細かさを変えられます．', tags: ['光'], size: 'square' },
  { id: 'god-rays', title: '光の筋', state: '試作', summary: '濃淡の細い三角形を重ねて，動く光の束を作る実験です．光の散乱を簡略化しています．', hint: '触れた場所が光源になります．クリックで光の広がりが変わります．', tags: ['光'], size: 'wide' },
] as const satisfies readonly LabExperiment[];
export type LabId = typeof LAB_EXPERIMENTS[number]['id'];
