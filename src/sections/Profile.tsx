'use client';

import type { CSSProperties } from 'react';
import { AvailabilityBadge } from '../components/AvailabilityBadge';
import { RollingNumber } from '../components/RollingNumber';
import { useInView } from '../hooks/useInView';
import { staggerDelay } from '../lib/choreography';
import { Reveal } from '../components/Reveal';
import { ScrollTimeline } from '../components/ScrollTimeline';
import { SectionHeading } from '../components/SectionHeading';
import { AmbientMesh } from '../components/ambient/AmbientMesh';
import { siteConfig } from '../config/site';
import { SWIFT_APPS } from '../data/apps';
import { PROFILE_FACTS, buildProfileSpecs, normalizeProfileFacts } from '../data/profile';
import { TIMELINE_MILESTONES } from '../data/timeline';
import { ALL_WORKS } from '../data/works';
import { RecentMusic } from './RecentMusic';
import styles from './Profile.module.css';

// Skills の4枚の言語カードで紹介している言語．本数・公開時期は作品と年表から読む．
const profileLanguages = ['Swift', 'TypeScript', 'Python', 'C'];
const profileStats = [
  { value: SWIFT_APPS.length, label: 'iOS・macOS アプリ' },
  { value: ALL_WORKS.length, label: 'Web サービスとゲーム' },
  { value: TIMELINE_MILESTONES[0].period, label: '最初のアプリを公開' },
  { value: profileLanguages.join(' / '), label: '使っている言語', words: true },
];

// 名前・行・数字は別々の交差監視で始め，親の Reveal と動きを重ねません．
const WORD_STEP_MS = 60;
const ROW_STEP_MS = 80;
const DIGIT_STEP_MS = 30;

export function Profile() {
  const identity = useInView<HTMLDivElement>();
  const specsEntrance = useInView<HTMLDivElement>();
  const statsEntrance = useInView<HTMLDListElement>();
  const profile = normalizeProfileFacts(PROFILE_FACTS);
  // ステータス・外部リンク・資格には専用の表示を使い，表との重複を避ける．
  const specs = buildProfileSpecs({
    ...profile, availability: undefined, socialLinks: [], credentials: [],
  }, siteConfig);

  return (
    <section id="profile" data-testid="profile-section" className={`scroll-mt-24 relative isolate ${styles.section}`}>
      <AmbientMesh palette="blue" intensity={0.18} testId="ambient-profile" />
      <div className="max-w-6xl mx-auto px-6 relative z-[1]">
        <SectionHeading
          label="06. Profile"
          title="プロフィール"
          description="作品をつくっている人と，これまでの歩みです．"
        />

        <div className={styles.layout}>
          <div className={styles.identityColumn}>
            <div className="lg:sticky lg:top-28">
              <div ref={identity.ref} data-entered={identity.isInView} className={styles.identity}>
                {profile.japaneseName && (
                  <p className={styles.japaneseName}>
                    {profile.japaneseName.name}
                    {profile.japaneseName.reading && <span>（{profile.japaneseName.reading}）</span>}
                  </p>
                )}
                <h3>
                  <span className="sr-only">{siteConfig.displayName}</span>
                  <span aria-hidden="true">
                    {siteConfig.displayName.split(' ').map((word, index) => (
                      <span className={styles.wordMask} key={`${word}-${index}`}>
                        <span style={{ '--profile-delay': `${staggerDelay(index, { stepMs: WORD_STEP_MS })}ms` } as CSSProperties}>{word}</span>
                        {index < siteConfig.displayName.split(' ').length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </span>
                </h3>
                <a className={`${styles.textLink} ${styles.handle} press-effect`} href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer">
                  <span className={styles.handleText}>@{siteConfig.githubUsername}</span>
                </a>
                <p className={styles.role}>{siteConfig.role}</p>
                <AvailabilityBadge availability={profile.availability} />
              </div>
            </div>
          </div>

          <div className={styles.content}>
            <div ref={specsEntrance.ref} data-entered={specsEntrance.isInView}>
              <dl className={styles.specs} data-testid="profile-specs">
                {specs.map(({ label, value, href }, index) => (
                  <div key={label} className={styles.row} style={{ '--profile-delay': `${staggerDelay(index, { stepMs: ROW_STEP_MS })}ms` } as CSSProperties}>
                    <dt>{label}</dt>
                    <dd>{href ? <a className={`${styles.textLink} press-effect`} href={href}>{value}</a> : value}</dd>
                  </div>
                ))}
              </dl>
              {Boolean(profile.credentials?.length) && (
                <div className={styles.additional}>
                  <h4>資格・受賞歴</h4>
                  <ul>{profile.credentials?.map((credential) => <li key={credential}>{credential}</li>)}</ul>
                </div>
              )}
              {Boolean(profile.socialLinks?.length) && (
                <div className={styles.additional}>
                  <h4>外部リンク</h4>
                  <ul className={styles.socialLinks}>
                    {profile.socialLinks?.map((link) => (
                      <li key={link.url}>
                        <a className={`${styles.textLink} press-effect`} href={link.url} target="_blank" rel="noopener noreferrer">{link.name} ↗</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <dl ref={statsEntrance.ref} data-entered={statsEntrance.isInView} className={styles.stats} data-testid="profile-stats">
              {profileStats.map(({ value, label, words }, index) => (
                <div key={label} className={styles.stat} style={{ '--profile-delay': `${staggerDelay(index, { stepMs: ROW_STEP_MS })}ms` } as CSSProperties}>
                  <dt>{label}</dt>
                  <dd className={words ? styles.languages : undefined}>
                    {typeof value === 'number' ? <RollingNumber value={value} /> : words ? (
                      <span className={styles.languageWords}>{value}</span>
                    ) : (
                      <>
                        <span className="sr-only">{value}</span>
                        <span aria-hidden="true">
                          {Array.from(String(value)).map((digit, digitIndex) => (
                            <span className={styles.dateMask} key={digitIndex}>
                              <span style={{ '--digit-delay': `${staggerDelay(digitIndex, { stepMs: DIGIT_STEP_MS })}ms` } as CSSProperties}>{digit}</span>
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <RecentMusic />

            {profile.origin && (
              <Reveal variant="up">
                <div className={styles.narrative} data-testid="profile-origin">
                  <h3>原点</h3>
                  <p>{profile.origin}</p>
                </div>
              </Reveal>
            )}

            <div className={styles.timeline}>
              <Reveal variant="up">
                <h3>開発の軌跡</h3>
                <p className={styles.timelineDescription}>スクロールに合わせて，これまでにつくってきたアプリの流れをたどれます．</p>
              </Reveal>
              <ScrollTimeline />
            </div>

            {profile.nextStep && (
              <Reveal variant="up">
                <div className={styles.narrative} data-testid="profile-next-step">
                  <h3>これから</h3>
                  <p>{profile.nextStep}</p>
                </div>
              </Reveal>
            )}
          </div>
        </div>

        <Reveal variant="up">
          <div className={styles.closing}>
            <a className={`${styles.textLink} press-effect`} href="#contact"><span>ご相談・ご質問は <span className={styles.closingArrow}>→</span> お問い合わせへ</span></a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
