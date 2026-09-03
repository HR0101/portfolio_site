/* eslint-disable react-refresh/only-export-components */
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata = {
  title: 'Ryuto Hara | iOS & macOS App Portfolio',
  description:
    '「信頼」を軸に開発に取り組む情報系学生のポートフォリオサイト．Swift / SwiftUI で個人開発した iPhone・Mac アプリと GitHub での活動を紹介しています．',
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
            デフォルトはダークモードで，明示的に light が保存されている場合のみライト表示にする */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-night text-slate-900 dark:text-slate-100 antialiased transition-colors min-h-screen flex flex-col">
        <ThemeProvider>
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
