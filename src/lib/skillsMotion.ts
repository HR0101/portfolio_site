export interface SkillIndicatorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 1px 幅の下線を，レイアウトを動かさず選択したボタンの下へ運ぶ．
export function getSkillIndicatorTransform(box: SkillIndicatorBox): string {
  const finite = (value: number) => Number.isFinite(value) ? value : 0;
  const x = finite(box.x);
  const y = finite(box.y) + Math.max(0, finite(box.height));
  const width = Math.max(0, finite(box.width));
  return `translate3d(${x}px, ${y}px, 0) scaleX(${width})`;
}
