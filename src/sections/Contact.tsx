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

const INITIAL_FORM_VALUES: ContactFormValues = {
  name: '',
  email: '',
  message: '',
};

export function Contact() {
  const [formValues, setFormValues] = useState<ContactFormValues>(INITIAL_FORM_VALUES);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  // バックエンドを持たないため，既定のメーラーを起動して送信する方式
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const isFormIncomplete =
      !formValues.name.trim() || !formValues.email.trim() || !formValues.message.trim();
    if (isFormIncomplete) {
      setErrorMessage('すべての項目を入力してください．');
      return;
    }

    setErrorMessage('');
    const subject = encodeURIComponent(
      `【ポートフォリオ】${formValues.name} 様からのお問い合わせ`,
    );
    const body = encodeURIComponent(
      `お名前: ${formValues.name}\nメールアドレス: ${formValues.email}\n\n${formValues.message}`,
    );
    window.location.href = `mailto:${siteConfig.email}?subject=${subject}&body=${body}`;
  };

  const inputClassName =
    'w-full px-4 py-3 rounded-xl bg-white dark:bg-night-soft border border-slate-300 dark:border-night-border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 transition-colors';

  return (
    <section id="contact" data-testid="contact-section" className="scroll-mt-24 py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          label="05. Contact"
          title="お問い合わせ"
          description="お仕事のご相談・ご質問など，お気軽にご連絡ください．"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 左カラム：直接の連絡先リンク */}
          <Reveal>
            <div className="space-y-6">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                フォームからのお問い合わせのほか，メールや GitHub から
                直接ご連絡いただくことも可能です．
              </p>
              <div className="space-y-4">
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 transition-colors group"
                >
                  <span className="w-10 h-10 rounded-full bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
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
                  className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-night-soft border border-slate-200 dark:border-night-border hover:border-sky-400/50 dark:hover:border-sky-500/50 transition-colors group"
                >
                  <span className="w-10 h-10 rounded-full bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center shrink-0">
                    <GitHubIcon className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
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
          <Reveal delayMs={150}>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium mb-2">
                  お名前
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="山田 太郎"
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium mb-2">
                  メールアドレス
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange}
                  placeholder="example@example.com"
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium mb-2">
                  メッセージ
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={formValues.message}
                  onChange={handleChange}
                  placeholder="お問い合わせ内容をご記入ください"
                  className={`${inputClassName} resize-y`}
                  required
                />
              </div>

              {/* バリデーションエラーの表示 */}
              {errorMessage && (
                <p className="text-sm text-red-500" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-300"
              >
                送信する
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
