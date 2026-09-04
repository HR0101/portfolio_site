import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// Next.js（App Router）向けの設定．
// Vite 時代の react-refresh プラグインは，App Router が要求する
// `export const metadata` 等と噛み合わないため使っていない．
export default tseslint.config(
  {
    ignores: [
      'dist',
      '.next',
      'next-env.d.ts',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        // API ルートやビルド時のコードは Node 環境で動く
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 先頭にアンダースコアを付けた引数は「意図的に未使用」とみなす
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 型の表明より，型ガードでの絞り込みを促す
      '@typescript-eslint/no-explicit-any': 'error',
      // 意図しない console 出力を防ぐ（警告・エラーは許可）
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
)
