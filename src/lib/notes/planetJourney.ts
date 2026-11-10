// 図の区間は説明用の均等配分です．実サイトのスクロール距離・座標ではありません．
export const PLANET_STAGES = [
  { name: 'Hero', action: 'ページの主役として，大きな惑星を見せます．', owner: 'ProductShowcase の DotPlanet' },
  { name: 'Showcase', action: 'アプリ紹介の背景へ，同じ惑星を引き継ぎます．', owner: 'ProductShowcase' },
  { name: 'About', action: 'カードの角へ着地し，次のカードへ運ばれます．', owner: 'About' },
  { name: 'ドック', action: '自己紹介のあと，画面左下で惑星を預かります．', owner: 'PlanetTail' },
  { name: '名前', action: '名前へ向かって移り，大きくなりながら，点が文字へほどけます．', owner: 'PlanetTail / wordmarkMerge' },
] as const;

export function getPlanetJourney(progress: number) {
  const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const position = safeProgress * (PLANET_STAGES.length - 1);
  const index = Math.min(PLANET_STAGES.length - 1, Math.floor(position));
  const stage = PLANET_STAGES[index];
  const next = PLANET_STAGES[Math.min(index + 1, PLANET_STAGES.length - 1)];
  const moving = position > index;
  const mergeStart = PLANET_STAGES.length - 2;
  return {
    progress: safeProgress,
    position,
    index,
    stage,
    label: moving ? `${stage.name} → ${next.name}` : stage.name,
    action: moving ? `${next.name}へ引き継ぐ区間です．${next.action}` : stage.action,
    owner: moving ? `${stage.owner} → ${next.owner}` : stage.owner,
    merge: Math.max(0, position - mergeStart),
  };
}
