// 言語の割合を「100 個の点」へ割り振る純粋関数．GitHub セクションの言語の帯が使う．
// 他のファイルを import しない（テストは tests/language-dots.test.mjs）．

// 帯に並べる点の数（1 点＝1%）
export const LANGUAGE_DOT_COUNT = 100;
// 名前を出す言語の上限．残りは「その他」へまとめる
export const MAX_NAMED_LANGUAGES = 5;
// 帯の行数（点は列ごとに上から下へ埋める．1 つの言語が左から右へ続く塊になる）
export const LANGUAGE_DOT_ROWS = 4;
// 点が灯る遅れ（列ごと）と，その上限（サイトの約束：段階表示は 480ms で頭打ち）
export const LANGUAGE_DOT_STEP_MS = 18;
export const LANGUAGE_DOT_CAP_MS = 480;
export const OTHER_LANGUAGE_NAME = 'その他';
// 言語の色が分からないときの色（GitHub の既定の灰）
export const DEFAULT_LANGUAGE_COLOR = '#8b949e';

// GitHub の言語の色（linguist の値．API が色を返さないときに使う）
export const GITHUB_LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  Swift: '#f05138',
  Python: '#3572a5',
  C: '#555555',
  'C++': '#f34b7d',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'Jupyter Notebook': '#da5b0b',
  Go: '#00add8',
  Rust: '#dea584',
  Kotlin: '#a97bff',
  Ruby: '#701516',
  Shell: '#89e051',
  'Objective-C': '#438eff',
  Metal: '#8f14e9',
};

// 割合の元になる 1 言語の量（size はバイト数またはリポジトリ数）
export interface LanguageAmount {
  name: string;
  size: number;
  color?: string;
}

// 帯に並べる 1 言語（dots は点の数．合計は LANGUAGE_DOT_COUNT）
export interface LanguageDotGroup {
  name: string;
  size: number;
  dots: number;
  color: string;
}

// #rrggbb の形の色だけを通す（上流の値を style へ渡す前に形を限定する）
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

// 言語の色を決める（API の色 → GitHub の言語の色 → 既定の灰）
export function resolveLanguageColor(name: string, color?: string): string {
  if (isHexColor(color)) return color;
  return GITHUB_LANGUAGE_COLORS[name] ?? DEFAULT_LANGUAGE_COLOR;
}

// 言語の無いリポジトリ（設定ファイルだけなど）に API が付ける名前
export const NO_LANGUAGE_NAME = 'Other';

// リポジトリの主な言語を数えて，件数の量にする（コード量が取れないときの代わり）．
// 言語の無いリポジトリは数えない（「その他」と紛れるため）
export function countRepositoryLanguages(repos: ReadonlyArray<{ language: string }>): LanguageAmount[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    const name = repo.language;
    if (!name || name === NO_LANGUAGE_NAME) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, size]) => ({ name, size }));
}

// 量の多い順に並べ，上位だけ名前を残して点へ割り振る（最大剰余法で合計をちょうど total にする）
export function allocateLanguageDots(
  amounts: readonly LanguageAmount[],
  total = LANGUAGE_DOT_COUNT,
  maxNamed = MAX_NAMED_LANGUAGES,
): LanguageDotGroup[] {
  const valid = amounts.filter((amount) => amount.name && Number.isFinite(amount.size) && amount.size > 0);
  const sum = valid.reduce((acc, amount) => acc + amount.size, 0);
  if (sum <= 0 || total <= 0) return [];

  // 同じ量のときは名前の順にして，同じ入力なら必ず同じ並びにする
  const sorted = [...valid].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  // 1 点に満たない言語は名前を出さず，「その他」へまとめる
  const named = sorted.slice(0, maxNamed).filter((amount) => amount.size / sum >= 1 / total);
  const rest = sorted.filter((amount) => !named.includes(amount));
  const groups: LanguageAmount[] = [...named];
  const restSize = rest.reduce((acc, amount) => acc + amount.size, 0);
  if (restSize > 0) groups.push({ name: OTHER_LANGUAGE_NAME, size: restSize, color: DEFAULT_LANGUAGE_COLOR });

  const exact = groups.map((group) => (group.size / sum) * total);
  const dots = exact.map(Math.floor);
  let remaining = total - dots.reduce((acc, value) => acc + value, 0);
  // 端数の大きい順に 1 点ずつ配る（同じ端数なら先に並ぶほう）
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remaining <= 0) break;
    dots[index] += 1;
    remaining -= 1;
  }

  return groups
    .map((group, index) => ({
      name: group.name,
      size: group.size,
      dots: dots[index],
      color: group.name === OTHER_LANGUAGE_NAME ? DEFAULT_LANGUAGE_COLOR : resolveLanguageColor(group.name, group.color),
    }))
    .filter((group) => group.dots > 0);
}

// 点の並び（i 番目の点がどの言語か）を作る
export function expandLanguageDots(groups: readonly LanguageDotGroup[]): number[] {
  const indexes: number[] = [];
  groups.forEach((group, groupIndex) => {
    for (let dot = 0; dot < group.dots; dot += 1) indexes.push(groupIndex);
  });
  return indexes;
}

// i 番目の点が灯る遅れ（列ごとに左から．上限で頭打ち）
export function languageDotDelay(index: number, rows = LANGUAGE_DOT_ROWS): number {
  const column = Math.floor(Math.max(0, index) / Math.max(1, rows));
  return Math.min(column * LANGUAGE_DOT_STEP_MS, LANGUAGE_DOT_CAP_MS);
}
