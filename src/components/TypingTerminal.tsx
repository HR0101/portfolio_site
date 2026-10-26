"use client";

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// 1文字を打つ間隔（ミリ秒）．人の打鍵に近づけるため，毎回少しだけ揺らす
const TYPING_BASE_MS = 62;
const TYPING_JITTER_MS = 55;
// 打ち終えてから Enter を押し，結果が出るまでの間（ミリ秒）
const ENTER_DELAY_MS = 420;
// 結果の行が1行ずつ流れ出る間隔（ミリ秒）
const OUTPUT_LINE_INTERVAL_MS = 140;
// 結果を出し切ってから見せておく時間（ミリ秒）
const HOLD_RESULT_MS = 2000;
// 画面を消して（⌘K）から次のコマンドを打ち始めるまでの間（ミリ秒）
const CLEAR_PAUSE_MS = 350;

export interface TerminalLine {
  // 打ち込むコマンド
  command: string;
  // Enter を押したあとに出る結果（1要素が1行）
  output: string[];
}

interface TypingTerminalProps {
  lines: TerminalLine[];
  // プロンプトの表示（例: "~/portfolio %"）
  prompt?: string;
  // 読み上げ用の説明（見た目の打鍵は読み上げない）
  accessibleText: string;
  className?: string;
}

type Phase = 'typing' | 'running' | 'cleared';

// ターミナルにコマンドを打ち込み，Enter で結果が出て，画面を消して（⌘K）次のコマンドへ移る演出
export function TypingTerminal({ lines, prompt = '%', accessibleText, className = '' }: TypingTerminalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');

  const currentLine = lines[lineIndex];

  useEffect(() => {
    if (prefersReducedMotion || !currentLine) {
      return;
    }

    if (phase === 'typing') {
      // 打ち終えたら Enter を押して結果を出す
      if (typedCount >= currentLine.command.length) {
        const timeoutId = window.setTimeout(() => setPhase('running'), ENTER_DELAY_MS);
        return () => window.clearTimeout(timeoutId);
      }
      const timeoutId = window.setTimeout(
        () => setTypedCount((count) => count + 1),
        TYPING_BASE_MS + Math.random() * TYPING_JITTER_MS,
      );
      return () => window.clearTimeout(timeoutId);
    }

    if (phase === 'running') {
      const outputDurationMs = currentLine.output.length * OUTPUT_LINE_INTERVAL_MS;
      const timeoutId = window.setTimeout(() => {
        setTypedCount(0);
        setPhase('cleared');
      }, outputDurationMs + HOLD_RESULT_MS);
      return () => window.clearTimeout(timeoutId);
    }

    // 画面を消したあと，少し置いてから次のコマンドを打ち始める
    const timeoutId = window.setTimeout(() => {
      setLineIndex((index) => (index + 1) % lines.length);
      setPhase('typing');
    }, CLEAR_PAUSE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [currentLine, lines.length, phase, prefersReducedMotion, typedCount]);

  if (!currentLine) {
    return null;
  }

  // 動きを減らす設定では，最初のコマンドと結果を打ち終えた状態で止めておく
  const visibleCommand = prefersReducedMotion ? currentLine.command : currentLine.command.slice(0, typedCount);
  const isOutputVisible = prefersReducedMotion || phase === 'running';
  // 行数の違うコマンドに切り替わっても窓の高さが揺れないよう，最も長い結果の行数ぶん（＋次のプロンプト1行）を確保する
  const maxOutputLines = Math.max(...lines.map((line) => line.output.length)) + 1;

  return (
    <div className={`typing-terminal ${className}`}>
      <p className="sr-only">{accessibleText}</p>
      <div aria-hidden="true">
        <div className="typing-terminal-bar">
          <span />
          <span />
          <span />
        </div>
        <p className="typing-terminal-line">
          <span className="typing-terminal-prompt">{prompt}</span>
          <span className="typing-terminal-command">{visibleCommand}</span>
          {!prefersReducedMotion && phase !== 'running' && <span className="typing-terminal-caret" />}
        </p>
        <div className="typing-terminal-output" style={{ minHeight: `${maxOutputLines * 1.6}em` }}>
          {currentLine.output.map((outputLine, index) => (
            <p
              key={`${lineIndex}-${index}`}
              className={isOutputVisible ? 'is-visible' : ''}
              style={{ transitionDelay: isOutputVisible && !prefersReducedMotion ? `${index * OUTPUT_LINE_INTERVAL_MS}ms` : '0ms' }}
            >
              {outputLine}
            </p>
          ))}
          {/* 結果を出し切ると，本物のターミナルと同じく次のプロンプトが出て入力待ちになる */}
          {!prefersReducedMotion && (
            <p
              className={`typing-terminal-next ${isOutputVisible ? 'is-visible' : ''}`}
              style={{ transitionDelay: isOutputVisible ? `${currentLine.output.length * OUTPUT_LINE_INTERVAL_MS}ms` : '0ms' }}
            >
              <span className="typing-terminal-prompt">{prompt}</span>
              <span className="typing-terminal-caret" />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
