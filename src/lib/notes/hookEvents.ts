// 紹介ページの hook-flow.tsx に掲載された状態遷移を，手動で試す図に整理します．
export const NOTE_HOOK_EVENTS = [
  { name: 'SessionStart', state: 'Done', description: 'セッション開始直後は Done から始まります．' },
  { name: 'UserPromptSubmit', state: 'Working', description: '指示が送られた合図を受け，Working に変わります．' },
  { name: 'PreToolUse', state: 'Working', description: 'ツール実行直前の合図です．Working を保ちます．' },
  { name: 'PermissionRequest', state: 'Working', description: '承認待ちでも Working です．空の応答 {} だけを返し，可否は CLI の画面に委ねます．' },
  { name: 'Stop', state: 'Done', description: 'タスク終了の合図で Done に変わります．' },
  { name: 'SessionEnd', state: 'Done', description: 'セッション終了の合図で Done に変わります．' },
] as const;

export function getNoteHookEvent(name: string) {
  return NOTE_HOOK_EVENTS.find(event => event.name === name) ?? NOTE_HOOK_EVENTS[0];
}
