import type { ReactNode } from 'react';
import { PageTransition } from '../components/PageTransition';

// ページを移るたびに作り直されるテンプレート．入れ替えの演出を挟む
export default function PageTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
