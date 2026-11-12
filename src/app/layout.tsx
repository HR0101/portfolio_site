import type { Metadata, Viewport } from 'next';
import './globals.css';
import './design-tokens.css';
import './refinements.css';
import './motion.css';
import './link-motion.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { CursorRing } from '../components/CursorRing';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ScrollProgressBar } from '../components/ScrollProgressBar';
import { BackToTopButton } from '../components/BackToTopButton';
import { CommandPalette } from '../components/CommandPalette';
import { NavigationTransitions } from '../components/NavigationTransitions';
import { ImageReveal } from '../components/ImageReveal';
import { SectionTransitions } from '../components/SectionTransitions';
import { PageLoader } from '../components/PageLoader';
import { FluidCursor } from '../components/animations/fluid/FluidCursor';
import { preloaderBootScript } from '../lib/preloader';
import { siteConfig } from '../config/site';


export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${siteConfig.displayName} | iOS & macOS App Portfolio`,
    template: `%s | ${siteConfig.displayName}`,
  },
  description: siteConfig.description,
  applicationName: `${siteConfig.displayName} Portfolio`,
  authors: [{ name: siteConfig.displayName, url: siteConfig.githubUrl }],
  creator: siteConfig.displayName,
  keywords: [
    'Swift',
    'SwiftUI',
    'iOS アプリ開発',
    'macOS アプリ開発',
    '個人開発',
    'ポートフォリオ',
    siteConfig.displayName,
    siteConfig.githubUsername,
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: siteConfig.siteUrl,
    siteName: `${siteConfig.displayName} | iOS & macOS App Portfolio`,
    title: `${siteConfig.displayName} | iOS & macOS App Portfolio`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.displayName} | iOS & macOS App Portfolio`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

// ブラウザの UI 色（ライト・ダークで切り替える）
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* 初期表示時のテーマちらつき（フラッシュ）防止スクリプト．
            デフォルトはライトモードで，明示的に dark が保存されている場合のみダーク表示にする．
            同じ判定が ThemeProvider にもあるため，変更時は両方を合わせること */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* 読み込み画面の起動スクリプト．初回の訪問のときだけ html に is-preloading を付ける．
            最初の描画から読み込み画面を出すため，<head> の先頭側で実行する（lib/preloader.ts） */}
        <script dangerouslySetInnerHTML={{ __html: preloaderBootScript }} />
      </head>
      <body className="bg-cream dark:bg-night text-ink dark:text-night-ink antialiased transition-colors min-h-screen flex flex-col">
        {/* 初めて開いたときだけ出る読み込み画面（2 回目以降は何も出ない） */}
        <PageLoader />
        <ThemeProvider>
          {/* キーボード操作でヘッダーを読み飛ばすためのリンク */}
          <a
            href="#main-content"
            className="skip-link inline-flex min-h-11 items-center px-4 rounded-full bg-white dark:bg-night-soft border border-soft dark:border-night-border text-sm font-semibold shadow-soft"
          >
            本文へスキップ
          </a>
          <ScrollProgressBar />
          {/* ⌘K で開く操作パネル */}
          <CommandPalette />
          <Navbar />
          <CursorRing />
          {/* 何もない所でマウスに合わせて流れる流体の背景（FEATURES.fluidCursor．最初のマウスの動きまで何も作らない） */}
          <FluidCursor />
          {/* 紹介ページへ移るとき，押したカードの画面を移動先の画面へ変形させる */}
          <NavigationTransitions />
          {/* 遅延読み込みの画像を，読み込み終わったところでふわりと現す */}
          <ImageReveal />
          <SectionTransitions />
          <main id="main-content" className="relative z-10 flex-grow">
            {children}
          </main>
          <Footer />
          <BackToTopButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
