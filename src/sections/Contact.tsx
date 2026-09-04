"use client";

import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import { siteConfig } from '../config/site';

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

export function Contact() {
  const [formValues, setFormValues] = useState<ContactFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});
  // 送信操作の結果（読み上げ用に aria-live 領域へ出す）
  const [statusMessage, setStatusMessage] = useState('');

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
      setStatusMessage('入力内容に誤りがあります．赤字の項目をご確認ください．');
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
    setStatusMessage(
      'メールソフトを起動しました．内容をご確認のうえ送信してください．起動しない場合は，左のメールアドレス宛に直接ご連絡ください．',
    );
  };

  // 項目のエラー表示に使う共通のクラス
  const buildFieldClassName = (fieldName: keyof ContactFormValues) =>
    `${inputClassName} ${
      formErrors[fieldName] ? 'border-red-400 focus:ring-red-400/40' : ''
    }`;

  const inputClassName =
    'w-full px-4 py-3 rounded-2xl bg-white dark:bg-night-soft border border-soft dark:border-night-border text-ink dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 focus:-translate-y-0.5 focus:shadow-soft transition-all duration-200';

  return (
    <section id="contact" data-testid="contact-section" className="scroll-mt-24 py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="05. Contact"
          title="お問い合わせ"
          description="お仕事のご相談・ご質問など，お気軽にご連絡ください．入力内容を反映したメールをお使いのメールソフトで開きます．"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 左カラム：直接の連絡先リンク */}
          <Reveal variant="left">
            <div className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                フォームからのお問い合わせのほか，メールや GitHub から
                直接ご連絡いただくことも可能です．
              </p>
              <div className="space-y-4">
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:translate-x-1 hover:shadow-soft transition-all duration-300"
                >
                  <span className="w-10 h-10 rounded-full bg-sky-400/12 dark:bg-sky-500/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Mail className="animate-wiggle w-5 h-5 text-sky-700 dark:text-sky-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                      Email
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {siteConfig.email}
                    </p>
                  </div>
                </a>
                <a
                  href={siteConfig.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-night-soft border border-soft dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 hover:translate-x-1 hover:shadow-soft transition-all duration-300"
                >
                  <span className="w-10 h-10 rounded-full bg-sky-400/12 dark:bg-sky-500/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <GitHubIcon className="animate-wiggle w-5 h-5 text-sky-700 dark:text-sky-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                      GitHub
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      github.com/{siteConfig.githubUsername}
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </Reveal>

          {/* 右カラム：問い合わせフォーム */}
          <Reveal delayMs={150} variant="right">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium mb-2">
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
                {formErrors.name && (
                  <p id="contact-name-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium mb-2">
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
                {formErrors.email && (
                  <p id="contact-email-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {formErrors.email}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium mb-2">
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
                  className="mt-2 text-xs text-slate-500 dark:text-slate-400"
                >
                  {MIN_MESSAGE_LENGTH}〜{MAX_MESSAGE_LENGTH}文字（現在{formValues.message.length}文字）
                </p>
                {formErrors.message && (
                  <p id="contact-message-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {formErrors.message}
                  </p>
                )}
              </div>

              {/* 送信操作の結果（スクリーンリーダーにも読み上げられる） */}
              <p
                role="status"
                aria-live="polite"
                className={`text-sm leading-relaxed ${
                  Object.keys(formErrors).length > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {statusMessage}
              </p>

              <button
                type="submit"
                className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white animate-gradient bg-gradient-to-r from-sky-700 via-violet-700 to-sky-700 shadow-soft hover:shadow-soft-lg hover:scale-105 transition-all duration-300"
              >
                <span className="shimmer-sweep absolute inset-0 overflow-hidden rounded-full" aria-hidden="true" />
                <span className="relative">メールソフトで確認する</span>
                <Send className="relative w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
