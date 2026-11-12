export interface Capability {
  id: string;
  label: string;
  match: string[];
}

// 根拠は apps.ts のタグ・説明・キャッチコピーにある語だけ．機能の追加時も同じ基準で確認する．
export const CAPABILITIES: Capability[] = [
  { id: 'widgets', label: 'ホーム画面のウィジェット', match: ['WidgetKit', 'ウィジェット'] },
  { id: 'live-activity', label: 'Live Activity', match: ['Live Activity'] },
  { id: 'app-intents', label: 'Siri・App Intents', match: ['Siri', 'App Intents'] },
  { id: 'local-network', label: '端末間の連携（LAN・Bonjour）', match: ['LAN', 'Bonjour'] },
  { id: 'screen-sharing', label: 'Mac の画面共有', match: ['WebRTC', 'ScreenCaptureKit'] },
  { id: 'pose', label: 'カメラで骨格推定', match: ['MediaPipe'] },
  { id: 'article', label: '記事の診断', match: ['信頼度診断', '鮮度診断'] },
  { id: 'menu-bar', label: 'メニューバー常駐', match: ['メニューバー'] },
];
