// 読み込み画面（PageLoader）まわりの共有定義．
// <head> の起動スクリプト，PageLoader，usePageRevealed が同じ名前と値を使う．

// この値が sessionStorage にあれば，同じタブでは 2 回目以降として読み込み画面を出さない
export const PRELOADER_STORAGE_KEY = 'portfolio:preloaded';
// 読み込み画面が出ている間だけ html に付くクラス．
// ページ側の CSS アニメーションの停止とスクロールの固定に使う（PageLoader.css）
export const PRELOADING_CLASS = 'is-preloading';
// 画面が開き始めた瞬間に window へ送るイベント．「ここから始める」合図として使う
export const PRELOADER_OPEN_EVENT = 'portfolio:preloader-open';

// 最短の表示時間（ms）．演出が一通り見えて，待たされると感じにくい長さ
export const PRELOADER_MIN_MS = 2000;
// 読み込みが終わらなくても，ここで必ず開く（ms）
export const PRELOADER_MAX_MS = 4000;
// 数字が 100 になってから，閉じ始めるまでの間（ms）
export const PRELOADER_HOLD_MS = 150;
// 閉じる時間（ms）：地図や文字が薄れ，名前だけが画面の中央へ寄る
export const PRELOADER_CLOSE_MS = 500;
// 中央から円形に開く時間（ms）．ここからページ（ヒーローなど）が始まる
export const PRELOADER_OPEN_MS = 1100;
// 読み込みが終わっていない間，数字が止まる上限（%）
export const PRELOADER_WAITING_CEILING = 92;
// JS が止まっても読み込み状態を必ず解除する時間（ms）．
// 通常の最長（最大表示＋開く時間）より十分長くしておく
export const PRELOADER_FAILSAFE_MS = 7000;

// <head> に置く起動スクリプト．初回の訪問のときだけ html に PRELOADING_CLASS を付ける．
// 付けない場合（2 回目以降・動きを減らす設定・storage が使えない）は読み込み画面が出ない．
// 先頭で実行されるので，最初の描画から読み込み画面が出て，ちらつかない
export const preloaderBootScript = `
  (function () {
    try {
      var root = document.documentElement;
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || window.sessionStorage.getItem(${JSON.stringify(PRELOADER_STORAGE_KEY)})) return;
      root.classList.add(${JSON.stringify(PRELOADING_CLASS)});
      // 万一ハイドレーションが失敗しても，ページが固まったままにならないようにする
      window.setTimeout(function () {
        root.classList.remove(${JSON.stringify(PRELOADING_CLASS)});
      }, ${PRELOADER_FAILSAFE_MS});
    } catch (e) {}
  })();
`;
