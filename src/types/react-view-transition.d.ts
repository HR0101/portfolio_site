// Next.js の App Router は React の canary 版を同梱しており，<ViewTransition> が使える．
// 依存関係の型定義（@types/react 18）にはまだ無いため，使う範囲だけをここで補う．
import 'react';

declare module 'react' {
  // 遷移の種類ごとに付ける view-transition-class（'none' でその場面の演出を止める）
  type ViewTransitionClass = string | Record<string, string>;

  interface ViewTransitionProps {
    name?: string;
    enter?: ViewTransitionClass;
    exit?: ViewTransitionClass;
    update?: ViewTransitionClass;
    share?: ViewTransitionClass;
    default?: ViewTransitionClass;
    children?: ReactNode;
  }

  export const ViewTransition: (props: ViewTransitionProps) => ReactElement | null;
}
