'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

const FEEDBACK_DURATION_MS = 1800;

interface CopyEmailButtonProps {
  email: string;
}

export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(() => () => {
    requestRef.current += 1;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    const request = ++requestRef.current;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    let message = 'コピーしました';
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      message = 'コピーできませんでした';
    }
    // 古いコピー操作の完了やタイマーで，新しい返事を消さないようにします．
    if (request !== requestRef.current) return;
    setStatusMessage(message);
    timeoutRef.current = setTimeout(() => setStatusMessage(''), FEEDBACK_DURATION_MS);
  }, [email]);

  const hasCopied = statusMessage === 'コピーしました';

  return (
    <span className="copy-email relative shrink-0" data-copied={hasCopied}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="メールアドレスをコピーする"
        data-attract
        className="copy-email-button press-effect inline-flex h-11 w-11 items-center justify-center rounded-full text-subtle dark:text-night-subtle"
      >
        {/* 両方を同じ場所に置き，連打でも現在の角度と透明度から切り替えます． */}
        <span className="copy-icons" aria-hidden="true">
          <span className="icon-swap copy-idle"><Copy className="w-4 h-4" /></span>
          <span className="icon-swap copy-done"><Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></span>
        </span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">{statusMessage}</span>
      <span className="copy-feedback absolute -top-9 left-1/2 -translate-x-1/2" aria-hidden="true">
        <span data-visible={hasCopied} className="copy-message whitespace-nowrap px-2.5 py-1 rounded-full text-xs bg-ink text-white dark:bg-white dark:text-ink shadow-soft">コピーしました</span>
        <span data-visible={statusMessage === 'コピーできませんでした'} className="copy-message whitespace-nowrap px-2.5 py-1 rounded-full text-xs bg-ink text-white dark:bg-white dark:text-ink shadow-soft">コピーできませんでした</span>
      </span>
    </span>
  );
}
