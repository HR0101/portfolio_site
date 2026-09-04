import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout';
import {
  staticEvents,
  type GitHubEvent,
  type ApiStatus,
} from '../../../../services/githubService';
import { siteConfig } from '../../../../config/site';

// 取得するイベントの最大件数
const EVENTS_PER_PAGE = 10;
// サーバー側フェッチの再検証間隔（秒）
const REVALIDATE_SECONDS = 900;

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_FORBIDDEN = 403;

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Portfolio-Site-App',
    Accept: 'application/vnd.github+json',
  };
  const githubToken = process.env.GITHUB_TOKEN ?? '';
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }
  return headers;
}

function fallbackResponse(apiStatus: ApiStatus) {
  return NextResponse.json(
    { events: staticEvents, apiStatus },
    {
      status: HTTP_STATUS_OK,
      headers: { 'x-api-status': apiStatus, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}

// GitHub Events API のレスポンス型（必要なフィールドのみ）
interface RawEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    size?: number;
    commits?: unknown[];
    ref_type?: string;
    action?: string;
  };
}

// イベント種別を日本語の説明文に変換する
function describeEvent(rawEvent: RawEvent): string {
  const repoShortName = rawEvent.repo.name.split('/').pop() ?? rawEvent.repo.name;

  switch (rawEvent.type) {
    case 'PushEvent': {
      // payload.commits は省略されることがあるため，コミット数は size を優先する
      const commitCount =
        rawEvent.payload?.size ?? rawEvent.payload?.commits?.length ?? 0;
      return commitCount > 0
        ? `${repoShortName} に ${commitCount}件のコミットをプッシュ`
        : `${repoShortName} にプッシュ`;
    }
    case 'CreateEvent':
      return rawEvent.payload?.ref_type === 'repository'
        ? `${repoShortName} を新規作成`
        : `${repoShortName} にブランチを作成`;
    case 'WatchEvent':
      return `${repoShortName} にスターを付けた`;
    case 'ForkEvent':
      return `${repoShortName} をフォーク`;
    case 'IssuesEvent':
      return `${repoShortName} の Issue を更新`;
    case 'PullRequestEvent':
      return `${repoShortName} のプルリクエストを更新`;
    case 'PublicEvent':
      return `${repoShortName} を公開`;
    default:
      return `${repoShortName} で活動`;
  }
}

export async function GET() {
  try {
    const url = `https://api.github.com/users/${siteConfig.githubUsername}/events/public?per_page=${EVENTS_PER_PAGE}`;
    const response = await fetchWithTimeout(url, {
      headers: buildHeaders(),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (response.status === HTTP_STATUS_FORBIDDEN) {
      return fallbackResponse('rate_limited');
    }
    if (response.status !== HTTP_STATUS_OK) {
      return fallbackResponse('offline');
    }

    const rawEvents: RawEvent[] = await response.json();
    const events: GitHubEvent[] = rawEvents.map((rawEvent) => ({
      id: rawEvent.id,
      type: rawEvent.type,
      repoName: rawEvent.repo.name,
      summary: describeEvent(rawEvent),
      createdAt: rawEvent.created_at,
    }));

    return NextResponse.json(
      { events, apiStatus: 'success' },
      {
        status: HTTP_STATUS_OK,
        headers: { 'x-api-status': 'success', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      },
    );
  } catch {
    return fallbackResponse('offline');
  }
}
