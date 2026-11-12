# 🛡️ セキュリティ監査レポート: 秘密鍵パターンの検出

- **対象リポジトリ**: `/Users/Rhara/portfolio_site`
- **検出ツール**: HideTheKey (`hide-the-key`)
- **監査実施日時**: 2026-11-12
- **判定レベル**: 🚨 **CRITICAL (検出フラグ) / 判定: 偽陽性（False Positive）**

---

## 📌 1. 検出された問題の概要

| 項目 | 内容 |
| :--- | :--- |
| **ファイル** | `src/lib/edge/appleMusic.ts` |
| **該当行** | 46 行目 |
| **検知ルール** | `Private Key (RSA / EC / OpenSSH / PGP)` |
| **該当コード** | `const body = pem.replace(/（PEM の BEGIN 行）|（PEM の END 行）|\s/g, '');` |

---

## 🔍 2. 実態と原因の分析

### 結論: 本物の秘密鍵の漏洩ではありません（偽陽性）

コードを精査した結果、**本物の秘密鍵がハードコードされているわけではありません**。  
実際の Apple Music 秘密鍵は、以下の通り環境変数から安全に取得されています（139行目）：

```typescript
// 139行目: 秘密鍵は環境変数から正しく取得されている
const privateKeyPem = env.APPLE_MUSIC_PRIVATE_KEY?.trim();
```

### なぜ CRITICAL として検知されたのか？
46 行目で、環境変数から受け取った PEM 形式の秘密鍵からヘッダー文字列を取り除くために、以下の正規表現リテラルを使用しています：

```typescript
// 46行目: PEMヘッダー/フッターを除去する正規表現
const body = pem.replace(/（PEM の BEGIN 行）|（PEM の END 行）|\s/g, '');
```

セキュリティスキャナー（HideTheKey、GitHub Secret Scanning、Gitleaks、TruffleHog 等）は、コード中の PEM の BEGIN 行（ハイフン 5 個＋BEGIN PRIVATE KEY＋ハイフン 5 個）という文字列パターンを検知して**「秘密鍵のハードコード」と判定するシグネチャ**を持っています。そのため、正規表現リテラルであっても機械的に検知されてしまいます。

---

## ⚠️ 3. 放置した場合のリスク

実キーが漏洩しているわけではありませんが、以下の問題が発生します：

1. **GitHub Secret Scanning / Push Protection による誤ブロック**  
   GitHub のセキュリティ機能や CI/CD パイプラインを強化した際、このファイルが原因で `git push` やビルドが拒否される可能性があります。
2. **セキュリティ監査での無駄なアラート**  
   静的解析ツールを走らせるたびに「CRITICAL」として通知され、本物の漏洩を見落とすノイズ（アラート疲弊）になります。

---

## 🛠️ 4. 推奨される修正方法（1行修正）

ヘッダー文字列を完全一致で書くのではなく、**汎用的な PEM ヘッダー除去パターンに変更する**ことで、機能（Apple Music トークン生成）を 100% 維持したままスキャナーの誤検知を完全に回避できます。

### 修正コード（`src/lib/edge/appleMusic.ts`）

```diff
  export async function buildDeveloperToken(options: TokenOptions): Promise<string> {
    const { teamId, keyId, privateKeyPem, now, subtle } = options;
    const pem = privateKeyPem.replace(/\\n/g, '\n');
-   const body = pem.replace(/（PEM の BEGIN 行）|（PEM の END 行）|\s/g, '');
+   const body = pem.replace(/-----[A-Z ]+-----|\s/g, '');
    const keyBytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
```

#### 💡 なぜこれで解決するのか？
`/ハイフン 5 個＋英大文字と空白＋ハイフン 5 個/` は、PEM の BEGIN 行と END 行の両方にマッチして綺麗に除去しますが、コード上にはシークレットヘッダーの静的文字列が存在しないため、静的スキャナーを確実にパスできます。

---

## 📋 5. 修正後の検証手順

修正後、ポートフォリオのリポジトリ直下で `hide-the-key` を実行し、CRITICAL 警告が解消されることを確認してください：

```bash
cd /Users/Rhara/portfolio_site
/Users/Rhara/Hide-the-key/bin/hide-the-key
```

監査結果が `Critical: 0`（パス）になれば修正完了です。

---

## ✅ 6. 対応結果（2026-11-12）

- `src/lib/edge/appleMusic.ts` の見出し除去を汎用パターンに変更しました（上記の推奨修正と同じ）．
- このレポート自体にも見出し行の文字列が含まれ，スキャナーに検知されたため，文字列を言葉の説明に置き換えました（意味は変えていません）．
- 修正後に `hide-the-key` を再実行し，`Critical: 0` を確認しました．
