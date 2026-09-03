import { NextResponse } from 'next/server';
import type { ContributionDay } from '../../../../services/githubService';
import { siteConfig } from '../../../../config/site';

// GitHub GraphQL API のエンドポイント
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
// 草の濃淡レベル（1〜4）の境界となるコントリビューション数
const CONTRIBUTION_LEVEL_THRESHOLDS = [1, 3, 6, 10];

const HTTP_STATUS_OK = 200;

// コントリビューション数を 0〜4 の濃淡レベルに変換する
function calcLevel(count: number): number {
  let level = 0;
  for (const threshold of CONTRIBUTION_LEVEL_THRESHOLDS) {
    if (count >= threshold) {
      level += 1;
    }
  }
  return level;
}

// GraphQL レスポンスの型（必要なフィールドのみ）
interface RawCalendar {
  totalContributions: number;
  weeks: Array<{
    contributionDays: Array<{
      date: string;
      contributionCount: number;
    }>;
  }>;
}

export async function GET() {
  const githubToken = process.env.GITHUB_TOKEN ?? '';

  // トークン未設定時：クライアント側で外部画像（ghchart）にフォールバックさせる
  if (!githubToken) {
    return NextResponse.json(
      { calendar: null, apiStatus: 'no_token' },
      { status: HTTP_STATUS_OK, headers: { 'x-api-status': 'no_token' } },
    );
  }

  try {
    const query = `
      query ($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Portfolio-Site-App',
      },
      body: JSON.stringify({
        query,
        variables: { login: siteConfig.githubUsername },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL APIエラー: ${response.status}`);
    }

    const json = await response.json();
    const rawCalendar: RawCalendar | undefined =
      json?.data?.user?.contributionsCollection?.contributionCalendar;

    if (!rawCalendar) {
      throw new Error('GraphQL レスポンスの形式が不正です');
    }

    // 週ごとの2次元配列に正規化し，濃淡レベルを付与する
    const weeks: ContributionDay[][] = rawCalendar.weeks.map((week) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: calcLevel(day.contributionCount),
      })),
    );

    return NextResponse.json(
      {
        calendar: {
          totalContributions: rawCalendar.totalContributions,
          weeks,
        },
        apiStatus: 'success',
      },
      { status: HTTP_STATUS_OK, headers: { 'x-api-status': 'success' } },
    );
  } catch {
    // 失敗時もクライアント側の画像フォールバックに委ねる
    return NextResponse.json(
      { calendar: null, apiStatus: 'offline' },
      { status: HTTP_STATUS_OK, headers: { 'x-api-status': 'offline' } },
    );
  }
}
