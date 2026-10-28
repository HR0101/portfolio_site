import { ViewTransition, type ReactNode } from 'react';

// ページを移るときの入れ替え．古いページは少し浮きながら消え，新しいページが下から静かに現れる．
// 見た目は globals.css の page-enter / page-exit．同じページの中での更新（タブの切り替えなど）では動かさない
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
