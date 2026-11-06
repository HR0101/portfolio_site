import type { ReactNode } from 'react';
import { PageTransition } from '../../components/PageTransition';
import { NextProductLink } from '../../components/NextProductLink';

// アプリの紹介ページどうしを行き来するときも，トップと同じ演出で切り替える．
// 読み終えたところに，次の紹介ページへの導線を添える
export default function AppsTemplate({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      {children}
      <NextProductLink />
    </PageTransition>
  );
}
