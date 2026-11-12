import { Cpu, Terminal, type LucideIcon } from 'lucide-react';
import { SWIFT_APPS, buildRepositoryUrl } from './apps';
import { WEB_WORKS } from './works';
import { siteConfig } from '../config/site';

export interface SkillExample {
  technology: string;
  name: string;
  description: string;
  href: string;
  imageSrc?: string;
  icon?: LucideIcon;
  external: boolean;
}

export const SKILL_TOOL_GROUPS = [
  { title: 'Interface & Experience', technologies: ['SwiftUI', 'WidgetKit', 'Live Activity', 'App Intents', 'React / Next.js', 'Tailwind CSS'] },
  { title: 'Data & System', technologies: ['SwiftData', 'AVFoundation', 'Bonjour / Network.framework', 'ScreenCaptureKit', 'MediaPipe', 'MapKit', 'Python', 'C / Arduino'] },
  { title: 'Everyday Tools', technologies: ['Git / GitHub', 'LaTeX'] },
];

function appExample(technology: string, name: string, description: string): SkillExample {
  const app = SWIFT_APPS.find(item => item.name === name);
  if (!app) throw new Error(`Missing app example: ${name}`);
  return {
    technology, name: app.name, description,
    href: app.detailHref ?? buildRepositoryUrl(siteConfig.githubUsername, app.repositories[0].name),
    imageSrc: app.imageSrc, icon: app.icon, external: !app.detailHref,
  };
}

const portfolio = (technology: string, description: string): SkillExample => ({
  technology, name: 'このポートフォリオ', description,
  href: buildRepositoryUrl(siteConfig.githubUsername, 'portfolio_site'),
  imageSrc: '/favicons/mono/icon-192.png', external: true,
});
const ekihub = WEB_WORKS.find(work => work.id === 'ekihub')!;

// アプリのカタログにない公開リポジトリ．README に書かれている内容だけを，1行の説明にする．
const publicRepository = (technology: string, name: string, description: string, icon: LucideIcon): SkillExample => ({
  technology, name, description, icon,
  href: buildRepositoryUrl(siteConfig.githubUsername, name),
  external: true,
});


// Only link a technology to a concrete use documented in the product catalogue.
export const SKILL_EXAMPLES: SkillExample[] = [
  appExample('SwiftUI', 'BusTimeApp', '次に乗れる便を、iPhoneの画面とウィジェットでわかりやすく案内。'),
  appExample('WidgetKit', 'BusTimeApp', 'アプリを開かず、ホーム画面から次の便を確認できるウィジェット。'),
  appExample('Live Activity', 'BusTimeApp', '移動中に必要なバスの情報を、ロック画面やDynamic Islandへ。'),
  appExample('App Intents', 'BusTimeApp', 'Siriからも、アプリと同じ時刻表データと経路判断を利用。'),
  { technology: 'React / Next.js', name: ekihub.name,
    description: '複数人の最寄駅から、移動時間が公平になる集合駅を探すWebサービス。',
    href: ekihub.detailHref ?? ekihub.url, imageSrc: ekihub.iconSrc, external: !ekihub.detailHref },
  portfolio('Tailwind CSS', '画面幅に合わせたレイアウトと、ライト・ダークの表示を構成。'),
  appExample('SwiftData', 'Fomura', 'フォームの採点履歴と統計を、端末内に蓄積。'),
  appExample('AVFoundation', 'Ark Server × VideoPlayer', 'Macの動画を、iPhoneやブラウザで再生するメディア体験。'),
  appExample('Bonjour / Network.framework', 'WiFiKeyboard', '同じLANのiPhoneから、Macへ文字やキー操作を送る。'),
  appExample('ScreenCaptureKit', 'Glance × GlanceHost', 'Macの画面をキャプチャし、iPhoneへ低遅延で配信。'),
  appExample('MediaPipe', 'Fomura', '33関節の骨格推定から、筋トレのフォームを採点。'),
  appExample('MapKit', 'CIT-Campus-3D', '講義と建物を結びつけ、次の教室へ案内するキャンパスマップ。'),
  portfolio('Git / GitHub', 'ソースコードと変更履歴を公開し、実装を確かめられるように。'),
  publicRepository('Python', 'FraTerm', '動画をターミナル上でASCII文字やANSIカラーとして再生するCLIツール。', Terminal),
  publicRepository('C / Arduino', 'hackathon_42', 'マスタ機が赤外線で送る同期信号に合わせ、最大5台のスレーブ機が輪唱で合奏するシステム。', Cpu),
];
