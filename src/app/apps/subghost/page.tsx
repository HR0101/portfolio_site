import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Ban,
  BellOff,
  Crosshair,
  Eraser,
  EyeOff,
  Layers,
  LifeBuoy,
  MoveRight,
  RefreshCw,
  WifiOff,
  Zap,
} from 'lucide-react';
import { siteConfig } from '../../../config/site';
import { HookFlow } from './hook-flow';
import { NotchStage } from './notch-stage';
import { PixelGhost } from './pixel-ghost';
import styles from './product.module.css';

const description =
  'Claude Code / Codex CLI のタスク状態を Mac のノッチに表示する常駐アプリ。フックだけを見る監視専用の設計、Working と Done の2状態、既定で本文を読まないプライバシー方針を紹介します。';

export const metadata: Metadata = {
  title: 'Subghost — 見に行かなくても、終わったら分かる。',
  description,
  alternates: { canonical: '/apps/subghost' },
  openGraph: {
    title: 'Subghost — 見に行かなくても、終わったら分かる。',
    description,
    url: '/apps/subghost',
    type: 'website',
  },
};

// 確認のために往復している時間を，3つに分けて示す
const problems = [
  {
    icon: RefreshCw,
    title: '確認のために、戻る。',
    text: '進んでいるかを知りたいだけなのに，そのたびにウィンドウを切り替える．いま考えていたことを，一度手放すことになります．',
  },
  {
    icon: BellOff,
    title: '集中すると、気づかない。',
    text: '別の作業に入り込むと，終わったことに何分も気づけない．待っていないのに待たされる時間が，静かに積もります．',
  },
  {
    icon: Layers,
    title: 'どれが動いているのか。',
    text: 'セッションが増えるほど，どのターミナルがまだ働いているのか，ひとつずつ開いてみないと分かりません．',
  },
];

// フックイベントと，Subghost が取る状態の対応
const stateRows: [string, 'working' | 'done', string][] = [
  ['SessionStart', 'done', 'セッションが立ち上がった直後．まだ何も始まっていない．'],
  ['UserPromptSubmit', 'working', '指示が送られた合図．ここから作業中に入る．'],
  ['PreToolUse / PostToolUse', 'working', 'ツールの呼び出し前後．作業が進んでいる証拠．'],
  ['SubagentStart / SubagentStop', 'working', 'サブエージェントの稼働中も，全体としては作業中．'],
  ['Notification / PermissionRequest', 'working', '承認待ちも作業の途中．Subghost は可否を答えない．'],
  ['Stop', 'done', 'タスクの終了．通知とサウンドはここで鳴る．'],
  ['SessionEnd', 'done', '完了として扱い，60秒後に一覧から静かに消す．'],
  ['StopFailure', 'done', '内部ではエラーとして記録し，2状態の表示では完了に寄せる．'],
];

// 意図的に持たせていない機能
const boundaries = [
  {
    title: 'プロンプトを送らない',
    text: 'Subghost から CLI へ文字を送る経路そのものを持ちません．入力欄も送信ボタンも画面にありません．',
  },
  {
    title: '承認や質問に答えない',
    text: 'PermissionRequest にも空の応答だけを返します．許可するかどうかの判断は，CLI 本来の画面に委ねます．',
  },
  {
    title: 'キー入力を作らない',
    text: 'アクセシビリティ権限を入力の合成には使いません．見えている端末へ勝手に打ち込むことはありません．',
  },
  {
    title: 'プロセスを終了しない',
    text: 'CLI へシグナルを送る経路を置かず，「その経路が存在しないこと」自体をテストで確かめています．',
  },
];

// プライバシーの約束
const privacyPoints = [
  {
    icon: EyeOff,
    title: '本文は、既定で読まない。',
    text: '会話本文のプレビューは初期状態で無効です．この間は，フックが指し示すセッション記録を開きません．状態監視に本文は要らないからです．',
  },
  {
    icon: Eraser,
    title: '戻せば、履歴からも消える。',
    text: 'プレビューを無効へ戻した時点で，保存済み履歴の本文はプレースホルダへ置き換わり，Subghost からは復元できなくなります．',
  },
  {
    icon: WifiOff,
    title: '外へは、出ない。',
    text: '通信は同じ Mac の中の Unix ドメインソケットだけ．会話も履歴も診断情報も，インターネットへ送る機能を持ちません．',
  },
];

export default function SubghostPage() {
  return (
    <article className={styles.page}>
      <nav className={styles.localNav} aria-label="Subghost ナビゲーション">
        <Link href="/#projects">← アプリ一覧</Link>
        <span>Subghost</span>
        <a href="#subghost-flow">仕組みを見る ↓</a>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>WATCHING, NEVER TOUCHING</p>
          <div className={styles.appName}>
            <img src="/projects/subghost.webp" alt="" width={36} height={36} loading="eager" />
            Subghost <span>for Mac</span>
          </div>
          <h1>
            見に行かなくても、
            <br />
            <em>終わったら分かる。</em>
          </h1>
          <p className={styles.lead}>
            ターミナルの「終わった」を、
            <br />
            Macのノッチで。
          </p>
          <p className={styles.bodyCopy}>
            Claude Code と Codex CLI のタスク状態を，ノッチに置きっぱなしに．
            <br className="sm:hidden" />
            確かめに戻らなくても，完了のほうから知らせます．
          </p>
          <a className={styles.primaryLink} href="#subghost-flow">
            仕組みを見てみる <span aria-hidden="true">↓</span>
          </a>
          <p className={styles.heroNote}>
            企画・デザイン・Swift / SwiftUI実装：{siteConfig.displayName}
          </p>
        </div>
        <NotchStage
          variant="timeline"
          caption="フックを受け取ってから完了を知らせるまでの流れ（このページ上での再現です）"
        />
      </header>

      <section className={styles.intro} aria-labelledby="subghost-problem">
        <p className={styles.eyebrow}>THE COST OF CHECKING</p>
        <h2 id="subghost-problem">
          「終わったかな」を、
          <br />
          <span>何度も確かめている。</span>
        </h2>
        <p>
          AI CLI に任せた作業は，数十秒で片づくこともあれば，十数分かかることもあります．待つでもなく，忘れるでもなく，ターミナルを何度も覗く．その往復をなくすために作りました．
        </p>
        <div className={styles.threeColumns}>
          {problems.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={27} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panelSection} aria-labelledby="subghost-panel-heading">
        <div className={styles.panelGrid}>
          <div>
            <p className={styles.eyebrow}>ONE GLANCE, EVERY SESSION</p>
            <h2 id="subghost-panel-heading">
              ひと押しで、
              <br />
              <span>いま動いている全部。</span>
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 24 }}>
              <span className={styles.shortcut}>⌥ Space</span> でセッション一覧が下りてきます．CLI，作業フォルダ，状態，最終活動時刻．知りたいことだけを，同じ並びで．
            </p>
            <ul className={styles.panelPoints}>
              <li>
                <MoveRight size={17} aria-hidden="true" />
                <span>
                  <strong>並ぶのは、フックが作ったセッションだけ</strong>
                  プロセスを探し回って勝手に一覧へ足すことはしません．検出はあくまで補助で，PIDとTTYを補う役目に留めています．
                </span>
              </li>
              <li>
                <MoveRight size={17} aria-hidden="true" />
                <span>
                  <strong>同じ端末の中でも、取り違えない</strong>
                  ひとつのTTY上に複数のセッションがあっても，別のものとして扱います．取り違えないことを，テストで固定しています．
                </span>
              </li>
              <li>
                <MoveRight size={17} aria-hidden="true" />
                <span>
                  <strong>行からできるのは、移動だけ</strong>
                  送信ボタンも，承認の選択肢もありません．開くのは，そのセッションが動いているターミナルだけです．
                </span>
              </li>
            </ul>
          </div>
          <NotchStage variant="panel" caption="セッション一覧の表示イメージ（このページ上での再現です）" />
        </div>
      </section>

      <section id="subghost-flow" className={styles.flowSection} aria-labelledby="subghost-flow-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>IT READS EVENTS, NOT SCREENS</p>
          <h2 id="subghost-flow-heading">
            見ているのは、
            <br />
            <span>画面ではない。</span>
          </h2>
          <p>
            端末のキャプチャも，ターミナルマルチプレクサも使いません。
            <br />
            CLIが発するフックイベントを、同じMacの中のソケットで受け取るだけです。
          </p>
        </div>
        <HookFlow />
        <p className={styles.finePrint} style={{ textAlign: 'center', color: '#8f96ae' }}>
          フック設定は Claude Code なら <code>~/.claude/settings.json</code>，Codex なら{' '}
          <code>~/.codex/hooks.json</code> へ追記します．変更前にバックアップを作り，Subghost が目印を付けた項目だけを扱うので，自分で書いたフックはそのまま残ります．
        </p>
      </section>

      <section className={styles.stateSection} aria-labelledby="subghost-state-heading">
        <p className={styles.eyebrow}>TWO STATES. NO MORE.</p>
        <h2 id="subghost-state-heading">
          Working と Done、
          <br />
          <span>ふたつだけ。</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 26, maxWidth: 660 }}>
          状態を増やすほど，見た瞬間の判断は遅くなります．ノッチという狭い場所に置くものは，2つに絞りました．
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.stateTable}>
            <caption>受け取ったフックイベントと、そのときの表示</caption>
            <thead>
              <tr>
                <th scope="col">フックイベント</th>
                <th scope="col">表示</th>
                <th scope="col">扱い</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map(([event, state, note]) => (
                <tr key={event}>
                  <td>{event}</td>
                  <td>
                    <span className={styles.badge} data-state={state}>
                      <span className={styles.statusDot} />
                      {state === 'working' ? 'Working' : 'Done'}
                    </span>
                  </td>
                  <td>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.stateNote}>
          <strong>時間では、完了にしない。</strong>
          <p>
            終了イベントを受け取れなかったときは，どれだけ待っても Working のままにします．疎通が切れていただけなのに「終わりました」と伝えるほうが，ずっと困るからです．疑わしいときのために，設定には受信テストと，CLIごとの最終受信時刻を置いています．
          </p>
        </div>
      </section>

      <section className={styles.boundary} aria-labelledby="subghost-boundary-heading">
        <p className={styles.eyebrow}>A LINE THAT DOES NOT MOVE</p>
        <h2 id="subghost-boundary-heading">
          できないことを、
          <br />
          <span>決めてある。</span>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 26 }}>
          常駐して，ずっと動いているアプリです．だからこそ，踏み込まない線をはっきり引きました．
        </p>
        <div className={styles.boundaryGrid}>
          {boundaries.map(({ title, text }) => (
            <div className={styles.boundaryItem} key={title}>
              <Ban size={20} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className={styles.boundaryAllow}>
          <MoveRight size={18} aria-hidden="true" />
          できるのは，そのターミナルへ移動することと，指定したタスクの完了後に Mac をスリープさせることだけ．
        </p>
      </section>

      <section className={styles.privacy} aria-labelledby="subghost-privacy-heading">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>OFF BY DEFAULT</p>
          <h2 id="subghost-privacy-heading">
            読まない、が<span>既定。</span>
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 24 }}>
            手元の記録を扱うアプリだからこそ，初期値を安全側に置いています．
          </p>
        </div>
        <div className={styles.privacyGrid}>
          {privacyPoints.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={25} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.craft} aria-labelledby="subghost-craft-heading">
        <p className={styles.eyebrow}>THOUGHTFUL, INSIDE AND OUT</p>
        <h2 id="subghost-craft-heading">
          そばに置き続けるものは、
          <br />
          <span>邪魔をしないことが先。</span>
        </h2>
        <div className={styles.craftGrid}>
          <div>
            <span className={styles.number}>01 / RESILIENCE</span>
            <h3>
              <Zap size={22} aria-hidden="true" /> 落ちていても、CLIを止めない。
            </h3>
            <p>
              ソケットが無ければブリッジは何もせず正常終了し，応答が遅いときも1秒で切り上げます．Subghost の不調が，CLI の作業を待たせる理由になってはいけません．
            </p>
            <code className={styles.craftCode}>{`[ -S "$SOCK" ] || exit 0
curl -s -m "$TIMEOUT" --unix-socket "$SOCK" …`}</code>
          </div>
          <div>
            <span className={styles.number}>02 / PRECISION</span>
            <h3>
              <Crosshair size={22} aria-hidden="true" /> どの端末かを、祖先まで遡って。
            </h3>
            <p>
              フックは <code>/bin/sh -c</code> 経由で呼ばれ，その中間シェルは制御端末を持ちません（tty が <code>??</code> になる）．親を1段見るだけでは特定できないため，10段まで祖先をたどり，最初に制御端末を持つプロセスを CLI 本体とみなします．
            </p>
            <code className={styles.craftCode}>{`while [ "$cur" -gt 1 ] && [ "$depth" -lt 10 ]; do
  ps -o ppid=,tty= -p "$cur"  # tty が "??" なら親へ
done`}</code>
          </div>
          <div>
            <span className={styles.number}>03 / RECOVERY</span>
            <h3>
              <LifeBuoy size={22} aria-hidden="true" /> 見失っても、戻れる。
            </h3>
            <p>
              外部ディスプレイやノッチのない Mac でも困らないよう，メニューバーから一覧・設定・終了へ行けます．通知の許可も，オンボーディングか設定で選ばれたときだけ求めます．
            </p>
            <span className={styles.tech}>SwiftUI · macOS 14+ · UserNotifications</span>
          </div>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="subghost-end-heading">
        <span className={styles.closingGhost}>
          <PixelGhost size={64} idPrefix="closing" />
        </span>
        <h2 id="subghost-end-heading">
          確かめに戻る時間を、
          <br />
          手放すために。
        </h2>
        <p>Subghost の設計と実装を，ソースコードで公開しています．</p>
        <a
          className={styles.primaryLink}
          href={`${siteConfig.githubUrl}/subghost`}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHubでソースを見る <ArrowUpRight size={17} aria-hidden="true" />
        </a>
        <Link className={styles.backLink} href="/#projects">
          ほかのアプリも見る →
        </Link>
      </section>
    </article>
  );
}
