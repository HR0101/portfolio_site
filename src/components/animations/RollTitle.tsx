import { Fragment, type CSSProperties } from 'react';
import { splitGraphemes, staggerDelay } from '../../lib/choreography';
import './RollTitle.css';

// 1 文字ごとの遅れ（ミリ秒）と，全体の遅れの上限．長い題名でも，回り終わるまで 600ms 前後に収める
const ROLL_STEP_MS = 16;
const ROLL_CAP_MS = 160;
// 和文（かな・漢字・全角の記号）を含む語は，文字と文字の間で折り返せるようにする
const CJK_PATTERN = /[぀-ヿ㐀-鿿＀-￯]/;

interface RollTitleProps {
  // 題名
  text: string;
  className?: string;
  // true のときは，読み上げ用の文字列を出さず，見た目の文字だけを出す．
  // 見出しなど，元の文字列を別の要素に置くときに使う
  visualOnly?: boolean;
}

interface RollWord {
  characters: string[];
  // この語の最初の文字が，題名の中で何文字目か（遅れの計算に使う）
  startIndex: number;
  // 語の途中で折り返さない（欧文の語）
  keepTogether: boolean;
}

// 題名を語に分け，語ごとに文字へ分ける
function splitWords(text: string): RollWord[] {
  const words: RollWord[] = [];
  let startIndex = 0;
  text
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      const characters = splitGraphemes(word);
      words.push({ characters, startIndex, keepTogether: !CJK_PATTERN.test(word) });
      startIndex += characters.length;
    });
  return words;
}

// 1 文字ぶんの窓．同じ文字を 2 枚重ね，ホバーで上へ送る
function RollCharacter({ character, index }: { character: string; index: number }) {
  const delay = staggerDelay(index, { stepMs: ROLL_STEP_MS, capMs: ROLL_CAP_MS });
  return (
    <span className="roll-char" style={{ '--roll-delay': `${delay}ms` } as CSSProperties}>
      <span className="roll-char-face">{character}</span>
      <span className="roll-char-face">{character}</span>
    </span>
  );
}

// ホバーとキーボードのフォーカスで，題名の文字が 1 文字ずつ上へ抜け，同じ文字が下から入ってくる．
// 祖先に data-roll-host を付けると，そのホバー（とフォーカス）で動く．
// 分けた文字は aria-hidden にし，元の文字列を sr-only で別に置く（visualOnly のときは置かない）．
// サーバーコンポーネントのまま使える（動きは CSS のトランジションだけ）．
export function RollTitle({ text, className = '', visualOnly = false }: RollTitleProps) {
  const words = splitWords(text);

  return (
    <span className={className ? `roll-title ${className}` : 'roll-title'}>
      {!visualOnly && <span className="sr-only">{text}</span>}
      <span className="roll-title-visual" aria-hidden="true">
        {words.map((word, wordIndex) => {
          const characters = word.characters.map((character, offset) => (
            <RollCharacter key={offset} character={character} index={word.startIndex + offset} />
          ));
          return (
            <Fragment key={`${word.startIndex}-${word.characters.join('')}`}>
              {wordIndex > 0 && ' '}
              {word.keepTogether ? <span className="roll-word">{characters}</span> : characters}
            </Fragment>
          );
        })}
      </span>
    </span>
  );
}
