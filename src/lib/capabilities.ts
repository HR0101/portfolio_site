interface CapabilityApp {
  tags: readonly string[];
  description: string;
  tagline: string;
}

// 名前や推測では紐づけず，タグ・説明・キャッチコピーに根拠の語がある作品だけを返す．
export function findAppsByCapability<T extends CapabilityApp>(apps: readonly T[], capability: { match: readonly string[] }): T[] {
  const terms = capability.match.filter(term => term.trim().length > 0).map(term => term.toLowerCase());
  return apps.filter(app => {
    const evidence = [...app.tags, app.description, app.tagline].map(value => value.toLowerCase());
    return terms.some(term => evidence.some(value => value.includes(term)));
  });
}
