interface RelatedProduct {
  tags: readonly string[];
  platform?: 'ios' | 'macos' | 'both';
  kind?: 'web' | 'game';
}

// 次の作品の順序は呼び出し側に任せ，実データで説明できる関係だけを言葉にする．
export function getNextReason(current: RelatedProduct, next: RelatedProduct): string | null {
  if (next.kind === 'web') return '次は Web サービスです';
  const commonTag = current.tags.find(tag => tag.trim() && next.tags.some(nextTag => nextTag.toLowerCase() === tag.toLowerCase()));
  if (commonTag) return `どちらも ${commonTag} を使っています`;
  if (current.platform !== next.platform) {
    if (next.platform === 'macos') return '次は Mac のアプリです';
    if (next.platform === 'ios') return '次は iPhone のアプリです';
  }
  return null;
}
