export interface ProfileFacts {
  japaneseName?: { name: string; reading?: string };
  university?: string;
  graduation?: string;
  location?: string;
  availability?: { label: string; detail?: string };
  socialLinks?: { name: string; url: string }[];
  credentials?: string[];
  origin?: string;
  nextStep?: string;
}

export interface ProfileSite {
  displayName: string;
  githubUsername: string;
  email: string;
  githubUrl: string;
}

export interface ProfileSpec {
  label: string;
  value: string;
  href?: string;
}

// 本人が確認した事実だけを入れる．空のままなら画面には出ない．
export const PROFILE_FACTS: ProfileFacts = {
  socialLinks: [],
  credentials: [],
};

const PROFILE_FOCUS = 'iOS・macOS（Swift / SwiftUI）／ Web（TypeScript / Next.js）／ 端末間の連携';

// 空文字・空白だけの項目は，画面と構造化データの両方で未設定として扱う．
export function normalizeProfileFacts(facts: ProfileFacts): ProfileFacts {
  const name = facts.japaneseName?.name.trim();
  const label = facts.availability?.label.trim();
  return {
    japaneseName: name ? { name, reading: facts.japaneseName?.reading?.trim() || undefined } : undefined,
    origin: facts.origin?.trim() || undefined,
    nextStep: facts.nextStep?.trim() || undefined,
    university: facts.university?.trim() || undefined,
    graduation: facts.graduation?.trim() || undefined,
    location: facts.location?.trim() || undefined,
    availability: label ? { label, detail: facts.availability?.detail?.trim() || undefined } : undefined,
    socialLinks: (facts.socialLinks ?? []).flatMap((link) => {
      const name = link.name.trim();
      const url = link.url.trim();
      // 外部リンクには HTTP(S) の絶対 URL だけを使う．不正な値は表示しない．
      try {
        const parsed = new URL(url);
        return name && ['https:', 'http:'].includes(parsed.protocol) ? [{ name, url }] : [];
      } catch {
        return [];
      }
    }),
    credentials: (facts.credentials ?? []).map((credential) => credential.trim()).filter(Boolean),
  };
}

// 表示する行をつくる純粋関数．サイト設定や DOM には依存しない．
export function buildProfileSpecs(facts: ProfileFacts, site: ProfileSite): ProfileSpec[] {
  const profile = normalizeProfileFacts(facts);
  const japaneseName = profile.japaneseName;
  const namePrefix = japaneseName
    ? `${japaneseName.name}${japaneseName.reading ? `（${japaneseName.reading}）` : ''} / `
    : '';
  const education = profile.university ? `${profile.university}・情報工学専攻` : '情報工学を専攻';
  const specs: ProfileSpec[] = [
    { label: 'Name', value: `${namePrefix}${site.displayName} (${site.githubUsername})` },
    { label: 'Education', value: `${education}${profile.graduation ? `（${profile.graduation}）` : ''}` },
    { label: 'Focus', value: PROFILE_FOCUS },
    { label: 'Contact', value: site.email, href: `mailto:${site.email}` },
  ];
  if (profile.location) specs.push({ label: 'Location', value: profile.location });
  if (profile.availability) {
    const { label, detail } = profile.availability;
    specs.push({ label: 'Status', value: [label, detail].filter(Boolean).join(' / ') });
  }
  for (const link of profile.socialLinks ?? []) {
    specs.push({ label: link.name, value: link.url, href: link.url });
  }
  if (profile.credentials?.length) {
    specs.push({ label: 'Credentials', value: profile.credentials.join('／') });
  }
  return specs;
}

// 本人情報に対応する Person の属性．未設定の属性はキーごと含めない．
export function buildProfilePersonProperties(facts: ProfileFacts, site: ProfileSite) {
  const profile = normalizeProfileFacts(facts);
  return {
    ...(profile.japaneseName ? { alternateName: profile.japaneseName.name } : {}),
    ...(profile.university ? { alumniOf: { '@type': 'CollegeOrUniversity', name: profile.university } } : {}),
    ...(profile.location ? { homeLocation: { '@type': 'Place', name: profile.location } } : {}),
    sameAs: [...new Set([site.githubUrl, ...(profile.socialLinks ?? []).map((link) => link.url)])],
  };
}
