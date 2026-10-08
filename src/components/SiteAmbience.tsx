"use client";

import { useEffect } from 'react';
import { siteConfig } from '../config/site';

// 別タブへ移ったときに出す，控えめな見出し
const AWAY_TITLE = 'またあとで見に来てください 👋';

// タブを離れたときのタイトル変更と，開発者向けの隠しメッセージ．
// 画面の見た目には一切影響しない，小さな仕掛け．
export function SiteAmbience() {
  useEffect(() => {
    let originalTitle = document.title;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        originalTitle = document.title;
        document.title = AWAY_TITLE;
      } else if (document.title === AWAY_TITLE) {
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    // コンソールを開いた人だけに見えるメッセージ
    console.info(
      `%c${siteConfig.displayName}%c\n` +
        'ソースまで見に来てくれてありがとうございます．\n' +
        'このサイトは Next.js + TypeScript 製で，アニメーションは外部ライブラリなしの自作です．\n' +
        `アプリのコードはこちら → ${siteConfig.githubUrl}\n` +
        'ヒント: ⌘K（Ctrl+K）でコマンドパレットが開きます．',
      'font-size:20px;font-weight:700;color:#0369a1',
      'color:inherit',
    );
  }, []);

  return null;
}
