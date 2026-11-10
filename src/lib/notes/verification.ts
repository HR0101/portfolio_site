export const VERIFICATION_STEPS = [
  { name: '型', command: 'npm run typecheck', checks: 'TypeScript で，型の整合性を確かめます．' },
  { name: 'lint', command: 'npm run lint', checks: 'ESLint の指摘を確認します．サイトの方針は警告ゼロです．' },
  { name: '本番ビルド', command: 'npm run build', checks: '本番用のページをビルドできるか確かめます．' },
  { name: 'E2E', command: 'npm test', checks: '本番ビルドを起動し，ページや導線のスモークテストを行います．' },
] as const;

// 失敗より後ろを実行済みに見せないため，表示状態を一か所で計算します．
export function getVerificationStates(selected: number, failed: boolean) {
  const index = Number.isFinite(selected) ? Math.min(VERIFICATION_STEPS.length - 1, Math.max(0, Math.floor(selected))) : 0;
  return VERIFICATION_STEPS.map((_, step) => {
    if (step < index) return 'passed';
    if (step === index) return failed ? 'failed' : 'selected';
    return 'waiting';
  });
}
