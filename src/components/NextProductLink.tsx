"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { RollLabel } from './RollLabel';
import { SWIFT_APPS } from '../data/apps';
import { WEB_WORKS } from '../data/works';
import './NextProductLink.css';

// 紹介ページを持つプロダクト（apps.ts / works.ts に detailHref を足せば，ここにも自動で並ぶ）
const DETAIL_PAGES = [
  ...SWIFT_APPS.flatMap((app) =>
    app.detailHref ? [{ name: app.name, tagline: app.tagline, href: app.detailHref, iconSrc: app.imageSrc }] : [],
  ),
  ...WEB_WORKS.flatMap((work) =>
    work.detailHref ? [{ name: work.name, tagline: work.tagline, href: work.detailHref, iconSrc: work.iconSrc }] : [],
  ),
];

// 紹介ページの最後に置く「次のプロダクト」への導線．最後のページの次は最初に戻る．
// 利用規約などの紹介ページ以外では何も出さない
export function NextProductLink() {
  const pathname = usePathname();
  const currentIndex = DETAIL_PAGES.findIndex((page) => page.href === pathname);
  if (currentIndex < 0) {
    return null;
  }
  const nextIndex = (currentIndex + 1) % DETAIL_PAGES.length;
  const nextPage = DETAIL_PAGES[nextIndex];
  // 次に開くプロダクトが，紹介ページ全体の何番目か
  const position = `${String(nextIndex + 1).padStart(2, '0')} / ${String(DETAIL_PAGES.length).padStart(2, '0')}`;

  return (
    <nav className="next-product" aria-label="次のプロダクト">
      <Reveal className="next-product-inner">
        <Link href={nextPage.href} className="next-product-link roll-label-host">
          <span className="next-product-eyebrow">
            <span>Next product</span>
            <span aria-hidden="true">{position}</span>
          </span>
          <span className="next-product-row">
            {nextPage.iconSrc && (
              <img src={nextPage.iconSrc} alt="" width={64} height={64} loading="lazy" decoding="async" className="next-product-icon" />
            )}
            <RollLabel text={nextPage.name} className="next-product-name" />
            <span className="next-product-arrow" aria-hidden="true">
              <ArrowRight size={22} />
            </span>
          </span>
          <span className="next-product-tagline">{nextPage.tagline}</span>
        </Link>
      </Reveal>
    </nav>
  );
}
