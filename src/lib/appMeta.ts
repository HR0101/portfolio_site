interface MetaApp {
  platform: string;
  year: string;
  repositories: readonly { name: string }[];
}

// 複数リポジトリの作品は，全件の公開名を確認できたときだけ作品全体を「公開」とする．
export function getAppMeta(app: MetaApp, publicNames: readonly string[]) {
  const names = new Set(publicNames.map(name => name.toLowerCase()));
  const isPublic = app.repositories.length > 0 && app.repositories.every(repository => names.has(repository.name.toLowerCase()));
  return {
    platform: app.platform,
    year: app.year,
    role: '個人開発',
    sourceStatus: isPublic ? 'GitHub でソースコード公開' : null,
  };
}
