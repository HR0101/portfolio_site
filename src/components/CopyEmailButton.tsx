"use client";

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';

// コピー完了の表示を消すまでの時間（ミリ秒）
const FEEDBACK_DURATION_MS = 1800;

interface CopyEmailButtonProps {
  // クリップボードへ入れる文字列
  email: string;
}

// メールアドレスをクリップボードへコピーするボタン．
// 成功すると小さな吹き出しで知らせる．
export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [statusMessage, setStatusMessage] = useState('');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setStatusMessage('コピーしました');
    } catch {
      // 権限がない環境などではコピーできないため，その旨を伝える
      setStatusMessage('コピーできませんでした');
    }
    window.setTimeout(() => setStatusMessage(''), FEEDBACK_DURATION_MS);
  }, [email]);

  const hasCopied = statusMessage === 'コピーしました';

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="メールアドレスをコピーする"
        className="press-effect inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle hover:text-ink dark:hover:text-night-ink hover:bg-mist dark:hover:bg-night transition-colors"
      >
        {hasCopied ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
      {/* コピー結果の吹き出し（読み上げにも伝える） */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
      {statusMessage && (
        <span
          className="animate-toast absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full text-xs bg-ink text-white dark:bg-white dark:text-ink shadow-soft"
          aria-hidden="true"
        >
          {statusMessage}
        </span>
      )}
    </span>
  );
}
