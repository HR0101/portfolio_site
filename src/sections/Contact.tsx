"use client";

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { ExternalLink, Mail, Send } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { LightRays } from '../components/ambient/LightRays';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { CopyEmailButton } from '../components/CopyEmailButton';
import { siteConfig } from '../config/site';
import { FEATURES } from '../config/features';
import { PROFILE_FACTS, normalizeProfileFacts } from '../data/profile';
import { AvailabilityBadge } from '../components/AvailabilityBadge';
import introStyles from './ContactIntro.module.css';
import './ContactMotion.css';

const profile = normalizeProfileFacts(PROFILE_FACTS);

// フォーム入力値の型
interface ContactFormValues {
  name: string;
  email: string;
  message: string;
}

// 項目ごとのエラーメッセージ（未入力・書式不正のときだけ値が入る）
type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const INITIAL_FORM_VALUES: ContactFormValues = {
  name: '',
  email: '',
  message: '',
};

// メールアドレスの簡易チェック（記号を含む一般的な形式を許容する）
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 本文の最低文字数（誤送信を防ぐ目安）
const MIN_MESSAGE_LENGTH = 10;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;

// 入力値を検証し，項目ごとのエラーを返す
function validateForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'お名前を入力してください．';
  } else if (values.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `お名前は${MAX_NAME_LENGTH}文字以内でご入力ください．`;
  }
  if (!values.email.trim()) {
    errors.email = 'メールアドレスを入力してください．';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'メールアドレスの形式が正しくありません．';
  } else if (values.email.trim().length > MAX_EMAIL_LENGTH) {
    errors.email = `メールアドレスは${MAX_EMAIL_LENGTH}文字以内でご入力ください．`;
  }
  if (!values.message.trim()) {
    errors.message = 'メッセージを入力してください．';
  } else if (values.message.trim().length < MIN_MESSAGE_LENGTH) {
    errors.message = `メッセージは${MIN_MESSAGE_LENGTH}文字以上でご記入ください．`;
  } else if (values.message.trim().length > MAX_MESSAGE_LENGTH) {
    errors.message = `メッセージは${MAX_MESSAGE_LENGTH}文字以内でご記入ください．`;
  }

  return errors;
}

// エラーを閉じる間だけ元の文を残し，読み上げ対象からはすぐ外します．
function FieldError({ id, message }: { id: string; message?: string }) {
  const [lastMessage, setLastMessage] = useState(message);
  useEffect(() => {
    if (message) setLastMessage(message);
  }, [message]);
  return (
    <div className="contact-error-slot" data-open={Boolean(message)} aria-hidden={!message}>
      <div className="contact-error-clip">
        <p id={id} className="contact-field-error mt-2 text-sm text-red-600 dark:text-red-400">{message || lastMessage}</p>
      </div>
    </div>
  );
}

const ERROR_SHAKE_DURATION_MS = 240;
const ERROR_SHAKE_DISTANCE_PX = 4;

export function Contact() {
  const reducedMotion = usePrefersReducedMotion();
  const fieldAnimations = useRef(new Map<Element, Animation>());
  useEffect(() => {
    const animations = fieldAnimations.current;
    return () => animations.forEach((animation) => animation.cancel());
  }, []);
  useEffect(() => {
    if (reducedMotion) fieldAnimations.current.forEach((animation) => animation.cancel());
  }, [reducedMotion]);
  const [formValues, setFormValues] = useState<ContactFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});
  // 送信操作の結果（読み上げ用に aria-live 領域へ出す）
  const [statusMessage, setStatusMessage] = useState('');
  const [previousStatus, setPreviousStatus] = useState('');
  const updateStatusMessage = (message: string) => {
    if (message === statusMessage) return;
    setPreviousStatus(statusMessage);
    setStatusMessage(message);
  };
  // メールソフトを開いた回数．変わるたびにボタンの紙飛行機が飛び立つ
  const [sendCount, setSendCount] = useState(0);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    // 入力を再開したら，その項目のエラー表示は消す
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // バックエンドを持たないため，既定のメーラーを起動して送信する方式
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validateForm(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      updateStatusMessage('入力内容に誤りがあります．赤字の項目をご確認ください．');
      // 再送信でも前の揺れを止めてやり直し，連打による積み重なりを防ぎます．
      if (!reducedMotion) {
        const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();
        Object.keys(errors).forEach((fieldName) => {
          const field = document.getElementById(`contact-${fieldName}`);
          if (!field || typeof field.animate !== 'function') return;
          fieldAnimations.current.get(field)?.cancel();
          const distance = ERROR_SHAKE_DISTANCE_PX;
          const animation = field.animate(
            [0, -distance, distance, -distance / 2, 0].map((offset) => ({ transform: `translateX(${offset}px)` })),
            { duration: ERROR_SHAKE_DURATION_MS, easing: easing || 'ease-out' },
          );
          fieldAnimations.current.set(field, animation);
        });
      }
      // 最初のエラー項目へフォーカスを移す
      const firstErrorField = (Object.keys(errors) as (keyof ContactFormValues)[])[0];
      document.getElementById(`contact-${firstErrorField}`)?.focus();
      return;
    }

    const subject = encodeURIComponent(
      `【ポートフォリオ】${formValues.name} 様からのお問い合わせ`,
    );
    const body = encodeURIComponent(
      `お名前: ${formValues.name}\nメールアドレス: ${formValues.email}\n\n${formValues.message}`,
    );
    window.location.href = `mailto:${siteConfig.email}?subject=${subject}&body=${body}`;
    setSendCount((count) => count + 1);
    updateStatusMessage(
      'メールソフトを起動しました．内容をご確認のうえ送信してください．起動しない場合は，左のメールアドレス宛に直接ご連絡ください．',
    );
  };

  // 項目のエラー表示に使う共通のクラス
  const buildFieldClassName = (fieldName: keyof ContactFormValues) =>
    `${inputClassName} ${
      formErrors[fieldName] ? 'contact-input-invalid' : ''
    }`;

  const inputClassName =
    'contact-input w-full px-4 py-3 rounded-2xl bg-white dark:bg-night-soft border border-soft dark:border-night-border text-ink dark:text-night-ink placeholder:text-subtle dark:placeholder:text-night-subtle';

  return (
    <section id="contact" data-testid="contact-section" className="scroll-mt-24 py-24 md:py-32 relative isolate">
      <LightRays origin="right" count={5} testId="rays-contact" />
      <div className="max-w-6xl mx-auto px-6 relative z-[1]">
        <SectionHeading
          label="07. Contact"
          title="お問い合わせ"
          description="お仕事のご相談・ご質問など，お気軽にご連絡ください．入力内容を反映したメールをお使いのメールソフトで開きます．"
        />

        {FEATURES.contactIntro && (
        <div className={introStyles.intro} data-testid="contact-entry">
          <h3>相談できること</h3>
          <p>Swift / SwiftUI の iPhone・Mac アプリや，TypeScript / Next.js の Web サービスの制作．</p>
          <p>Python による作業の自動化，C / Arduino を使った電子工作．</p>
          <p>ゲームづくりのアイデアや，掲載作品についてのご質問．</p>
          <p className={introStyles.methods}>連絡はメール・GitHub・フォームから．フォームは入力内容を反映してメールソフトを開きます．</p>
        </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 左カラム：直接の連絡先リンク（大きな画面ではフォームを読み進める間も横に留まる） */}
          <div className="contact-links space-y-6 lg:sticky lg:top-28 self-start">
            <AvailabilityBadge availability={profile.availability} />
            <p className="text-subtle dark:text-night-subtle leading-relaxed">
              フォームからのお問い合わせのほか，メールや GitHub から
              直接ご連絡いただくことも可能です．
            </p>
            <div className="space-y-4">
              <Reveal variant="left" delayMs={0}>
                <div className="contact-tile tile group flex items-center gap-4 p-4">
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="line-sweep-host flex items-center gap-4 min-w-0 flex-grow"
                  >
                    <span className="w-10 h-10 rounded-full bg-mist dark:bg-night flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-ink dark:text-night-ink" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold transition-colors">
                        <span className="line-sweep">Email</span>
                      </p>
                      <p className="text-sm text-subtle dark:text-night-subtle truncate">
                        {siteConfig.email}
                      </p>
                    </div>
                  </a>
                  <CopyEmailButton email={siteConfig.email} />
                </div>
              </Reveal>
              <Reveal variant="left" delayMs={80}>
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-tile line-sweep-host tile group flex items-center gap-4 p-4"
                >
                  <span className="w-10 h-10 rounded-full bg-mist dark:bg-night flex items-center justify-center shrink-0">
                    <GitHubIcon className="w-5 h-5 text-ink dark:text-night-ink" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold transition-colors">
                      <span className="line-sweep">GitHub</span>
                    </p>
                    <p className="text-sm text-subtle dark:text-night-subtle truncate">
                      github.com/{siteConfig.githubUsername}
                    </p>
                  </div>
                </a>
              </Reveal>
              {profile.socialLinks?.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-tile line-sweep-host tile group flex items-center gap-4 p-4"
                >
                  <span className="w-10 h-10 rounded-full bg-mist dark:bg-night flex items-center justify-center shrink-0">
                    <ExternalLink className="w-5 h-5 text-ink dark:text-night-ink" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold"><span className="line-sweep">{link.name}</span></p>
                    <p className="text-sm text-subtle dark:text-night-subtle truncate">{link.url}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* 右カラム：問い合わせフォーム */}
          <Reveal delayMs={150} variant="right">
            <form onSubmit={handleSubmit} className="contact-form space-y-5" noValidate>
              <div className="contact-field">
                <label htmlFor="contact-name" className="block text-sm font-semibold mb-2">
                  お名前
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={MAX_NAME_LENGTH}
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="山田 太郎"
                  className={buildFieldClassName('name')}
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? 'contact-name-error' : undefined}
                  required
                />
                <FieldError id="contact-name-error" message={formErrors.name} />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-email" className="block text-sm font-semibold mb-2">
                  メールアドレス
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={MAX_EMAIL_LENGTH}
                  value={formValues.email}
                  onChange={handleChange}
                  placeholder="example@example.com"
                  className={buildFieldClassName('email')}
                  aria-invalid={Boolean(formErrors.email)}
                  aria-describedby={formErrors.email ? 'contact-email-error' : undefined}
                  required
                />
                <FieldError id="contact-email-error" message={formErrors.email} />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-message" className="block text-sm font-semibold mb-2">
                  メッセージ
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={formValues.message}
                  onChange={handleChange}
                  placeholder="お問い合わせ内容をご記入ください"
                  className={`${buildFieldClassName('message')} resize-y`}
                  aria-invalid={Boolean(formErrors.message)}
                  aria-describedby={
                    formErrors.message
                      ? 'contact-message-hint contact-message-error'
                      : 'contact-message-hint'
                  }
                  required
                />
                <p
                  id="contact-message-hint"
                  className="mt-2 text-xs text-subtle dark:text-night-subtle"
                >
                  {MIN_MESSAGE_LENGTH}〜{MAX_MESSAGE_LENGTH}文字（現在<span className="contact-character-count"><span key={formValues.message.length}>{formValues.message.length}</span></span>文字）
                </p>
                <div className="contact-progress" aria-hidden="true">
                  <span style={{ transform: `scaleX(${Math.min(formValues.message.trim().length / MIN_MESSAGE_LENGTH, 1)})` }} />
                </div>
                <FieldError id="contact-message-error" message={formErrors.message} />
              </div>

              {/* 送信操作の結果（スクリーンリーダーにも読み上げられる） */}
              <p
                role="status"
                aria-live="polite"
                className={`contact-status text-sm leading-relaxed ${
                  Object.keys(formErrors).length > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {/* 読み上げ領域を保ったまま，前の文と新しい文を交差させます． */}
                {previousStatus && <span key={`previous-${statusMessage}`} className="contact-status-previous" aria-hidden="true">{previousStatus}</span>}
                {statusMessage && (
                  <span key={statusMessage} className="contact-status-current">
                    {statusMessage}
                  </span>
                )}
              </p>

              <button
                type="submit"
                data-attract
                className="contact-submit press-effect group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-accent-strong shadow-soft"
              >
                <span className="shimmer-sweep absolute inset-0 overflow-hidden rounded-full" aria-hidden="true" />
                <span className="relative">メールソフトで確認する</span>
                {/* 送るたびに作り直し，右上へ飛び去ってから左下から戻ってくる */}
                <span key={sendCount} className={`relative inline-flex ${sendCount > 0 ? 'contact-send-flight' : ''}`} aria-hidden="true">
                  <Send className="w-4 h-4" />
                </span>
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
