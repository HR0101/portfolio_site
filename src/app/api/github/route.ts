import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '../../../lib/fetchWithTimeout';
import {
  staticRepos,
  type GitHubRepo,
  type ApiStatus,
} from '../../../services/githubService';
import { siteConfig } from '../../../config/site';

// 1ページあたりの取得件数（GitHub API の最大値）
const REPOS_PER_PAGE = 100;
// ページネーションの安全上限（100件 × 5ページ = 最大500リポジトリ）
const MAX_PAGES = 5;
// サーバー側フェッチの再検証間隔（秒）
const REVALIDATE_SECONDS = 3600;

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_FORBIDDEN = 403;

// GitHub API 認証用トークン（未設定でも動作するが，レート制限が厳しくなる）
// .env.local に GITHUB_TOKEN=ghp_xxxx を設定すると有効になる
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

// フォールバック応答（常に HTTP 200 で返し，状態は apiStatus で伝える）
function fallbackResponse(apiStatus: ApiStatus) {
  return NextResponse.json(
    { repos: staticRepos, apiStatus },
    {
      status: HTTP_STATUS_OK,
      headers: { 'x-api-status': apiStatus, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    },
  );
}

// GitHub API のレスポンス型（必要なフィールドのみ）
interface RawRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string;
  topics?: string[];
}

export async function GET() {
  try {
    // ページネーションで全リポジトリを取得する
    const allRawRepos: RawRepo[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = `https://api.github.com/users/${siteConfig.githubUsername}/repos?sort=updated&per_page=${REPOS_PER_PAGE}&page=${page}`;
      const response = await fetchWithTimeout(url, {
        headers: buildHeaders(),
        next: { revalidate: REVALIDATE_SECONDS },
      });

      // レート制限超過：1ページ目で失敗した場合のみフォールバック
      // （途中ページで失敗した場合は取得済み分を返す）
      if (response.status === HTTP_STATUS_FORBIDDEN) {
        if (allRawRepos.length === 0) {
          return fallbackResponse('rate_limited');
        }
        break;
      }
      // その他のエラー
      if (response.status !== HTTP_STATUS_OK) {
        if (allRawRepos.length === 0) {
          return fallbackResponse('offline');
        }
        break;
      }

      const pageRepos: RawRepo[] = await response.json();
      allRawRepos.push(...pageRepos);

      // 取得件数がページサイズ未満なら最終ページなので終了
      if (pageRepos.length < REPOS_PER_PAGE) {
        break;
      }
    }

    const repos: GitHubRepo[] = allRawRepos.map((rawRepo) => ({
      id: rawRepo.id,
      name: rawRepo.name,
      htmlUrl: rawRepo.html_url,
      description: rawRepo.description ?? '',
      language: rawRepo.language ?? 'Other',
      stargazersCount: rawRepo.stargazers_count ?? 0,
      forksCount: rawRepo.forks_count ?? 0,
      updatedAt: rawRepo.updated_at ?? new Date().toISOString(),
      topics: rawRepo.topics ?? [],
    }));

    return NextResponse.json(
      { repos, apiStatus: 'success' },
      {
        status: HTTP_STATUS_OK,
        headers: { 'x-api-status': 'success', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      },
    );
  } catch {
    // ネットワーク不通（オフライン環境）の場合
    return fallbackResponse('offline');
  }
}
