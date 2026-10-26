interface RollLabelProps {
  text: string;
  className?: string;
}

// ホバーすると，文字が上へ抜けて同じ文字が下から入ってくるラベル．
// 祖先の要素（リンクやボタン）に roll-label-host を付けると，そのホバーで動く．
export function RollLabel({ text, className = '' }: RollLabelProps) {
  return (
    <span className={`roll-label ${className}`}>
      <span className="roll-label-front">{text}</span>
      <span className="roll-label-back" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
