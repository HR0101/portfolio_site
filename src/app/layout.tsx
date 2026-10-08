import type { Metadata, Viewport } from 'next';
import './globals.css';
import './refinements.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ScrollProgressBar } from '../components/ScrollProgressBar';
import { BackToTopButton } from '../components/BackToTopButton';
import { CommandPalette } from '../components/CommandPalette';
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
    <html lang="ja" suppressHydrationWarning>
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
      </head>
      <body className="bg-cream dark:bg-night text-ink dark:text-night-ink antialiased transition-colors min-h-screen flex flex-col">
        <ThemeProvider>
          {/* キーボード操作でヘッダーを読み飛ばすためのリンク */}
          <a
            href="#main-content"
            className="skip-link inline-flex min-h-11 items-center px-4 rounded-full bg-white dark:bg-night-soft border border-soft dark:border-night-border text-sm font-medium shadow-soft"
          >
            本文へスキップ
          </a>
          <ScrollProgressBar />
          {/* ⌘K で開く操作パネル */}
          <CommandPalette />
          <Navbar />
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
