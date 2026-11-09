const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function getShowcaseScrollState(
  trackTop: number, trackHeight: number, stageHeight: number, stickyTop: number, count: number,
) {
  const total = Math.max(1, Math.floor(count));
  const travel = Math.max(0, trackHeight - stageHeight);
  const progress = travel > 0 ? clamp((stickyTop - trackTop) / travel) : 0;
  const index = Math.min(total - 1, Math.floor(progress * total));
  return { progress, index, chapterProgress: clamp(progress * total - index), travel };
}

// Land inside a chapter so direct selection won't sit on a boundary.
export function getShowcaseChapterOffset(index: number, count: number, travel: number) {
  const total = Math.max(1, Math.floor(count));
  const chapter = Math.max(0, Math.min(total - 1, Math.floor(index)));
  return Math.max(0, travel) * (chapter + 0.5) / total;
}

// ===== 回転するカード（自己紹介） =====
// 4 枚のカードを「表と裏の 2 面」だけで回していく．位置（position）は 0〜count-1 の実数で，
// 整数のときにちょうどその番号のカードが正面を向く．回転の角度は position × 180° で，向きは常に同じ．
// 表（front）は偶数番，裏（back）は奇数番のカードを持ち，見えていない間にだけ中身を入れ替える．

// 章と章のあいだ（中心から中心まで）のうち，実際に回っている割合．残りは正面で止まって読ませる
const FLIP_SHARE = 0.6;
// 正面から外れても核（点）が見えている範囲と，完全に消える範囲（position の整数からの距離）
const PRESENCE_FLAT = 0.08;
const PRESENCE_GONE = 0.3;

const smoothstep = (value: number) => value * value * (3 - 2 * value);

// スクロール全体の進捗（0〜1）から，回転カードの位置を求める．各章の中心で止まり，章の境目をまたいで半回転する
export function getFlipPosition(progress: number, count: number, share: number = FLIP_SHARE) {
  const total = Math.max(1, Math.floor(count));
  const last = total - 1;
  // 先頭の章の中心を 0 とした距離（章の数を単位にする）
  const distance = clamp(progress) * total - 0.5;
  if (last === 0 || distance <= 0) return 0;
  if (distance >= last) return last;
  const base = Math.floor(distance);
  const hold = (1 - share) / 2;
  return base + smoothstep(clamp((distance - base - hold) / share));
}

// 位置から，表と裏が持つカードの番号を求める．見えている面は常に round(position) のカードになる
export function getFlipFaces(position: number, count: number) {
  const last = Math.max(0, Math.floor(count) - 1);
  const lastEven = last - (last % 2);
  const lastOdd = last % 2 === 1 ? last : Math.max(0, last - 1);
  return {
    front: Math.min(lastEven, 2 * Math.round(position / 2)),
    back: Math.min(lastOdd, 2 * Math.floor(position / 2) + 1),
  };
}

// 正面を向いているほど 1，横を向くほど 0．核は，カードが回っている間だけ薄れる
export function getFlipPresence(position: number) {
  const offset = Math.abs(position - Math.round(position));
  return 1 - smoothstep(clamp((offset - PRESENCE_FLAT) / (PRESENCE_GONE - PRESENCE_FLAT)));
}

// 自己紹介の一文は，カードと同じ数の区切りに分け，k 番目の区切りを k 番目のカードへ向かって灯す．
// 位置が k - 1 から k へ進むあいだに 0 → 1 になり，それ以降は灯ったまま（0 番目は最初から灯っている）
export function getFlipLight(position: number, segment: number) {
  return clamp(position - segment + 1);
}

// 小さな英字ラベルの「並べ替え」．resolved（0〜1）の割合だけ，左から順に元の文字が戻り，残りは同じ文字を並べ替えた形になる．
// 同じ入力からは必ず同じ文字列になる（スクロールのたびにちらつかない）．空白は動かさず，戻った文字の数にも数えない
export function getShuffledLabel(text: string, resolved: number) {
  const letters = Array.from(text);
  const movable = letters.flatMap((letter, index) => (letter === ' ' ? [] : [index]));
  const settled = Math.floor(clamp(resolved) * movable.length);
  if (settled >= movable.length) return text;
  const slots = movable.slice(settled);
  const pool = slots.map(index => letters[index]);
  // 決まった種から並べ替える（戻った文字の数ごとに別の並びになる）
  let seed = (text.length * 31 + settled * 17 + 7) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  // たまたま元と同じ並びになったら，ひとつずらして必ず崩す（残りが同じ文字だけのときは崩しようがない）
  if (pool.every((letter, index) => letter === letters[slots[index]]) && new Set(pool).size > 1) {
    pool.push(pool.shift() as string);
  }
  slots.forEach((slot, index) => { letters[slot] = pool[index]; });
  return letters.join('');
}
