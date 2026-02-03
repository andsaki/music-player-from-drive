# ADR 002: モノレポアーキテクチャの採用

## ステータス
**提案中** - 2026-02-03

## コンテキスト

### 現在の問題
現在のプロジェクトは、フロントエンド（React）とバックエンド（Express）が同一リポジトリ内に存在するものの、適切なモノレポ構成になっていません。

**現在の構造**:
```
music-player-from-drive/
├── src/                 # フロントエンド（React + Vite）
├── server/              # バックエンド（Express + TypeScript）
│   ├── src/
│   ├── package.json     # 独立したpackage.json
│   └── node_modules/    # 独立したnode_modules
├── package.json         # ルートのpackage.json
├── node_modules/        # ルートのnode_modules
└── dist/                # フロントエンドのビルド成果物
```

**現在の課題**:

1. **依存関係の重複**
   - フロントエンドとバックエンドで重複した依存関係
   - ESLint、TypeScript、Prettierなど開発ツールが重複
   - ディスク容量の無駄遣い

2. **ビルド・開発の非効率性**
   - フロントエンドとバックエンドを個別に起動
   - 共通コードの共有が困難
   - ビルドキャッシュの未活用

3. **コード共有の困難**
   - 型定義（API レスポンス、エラー型など）を共有できない
   - バリデーションロジックの重複
   - 設定ファイルの重複

4. **スケーラビリティの欠如**
   - 新しいパッケージ（例: shared, types, utils）を追加しづらい
   - モバイルアプリや管理画面を追加する際の拡張性が低い

5. **開発体験の問題**
   - ルートとserver/で異なるnpm/pnpmコマンド実行が必要
   - コードジャンプ（Go to Definition）が効かない
   - 統一的なLint・Formatが困難

## 検討した選択肢

### 選択肢1: 現状維持（src/ + server/）
- **メリット**: 変更不要、シンプル
- **デメリット**: 上記の課題が全て未解決
- **評価**: 将来的な拡張性と効率性に欠ける

### 選択肢2: Lerna + npm workspaces
- **メリット**: 実績豊富、npm標準機能
- **デメリット**: Lernaのメンテナンスが停滞気味、ビルドキャッシュなし
- **評価**: モダンな選択肢として他に優れたものがある

### 選択肢3: **pnpm workspaces + Turborepo**（採用）
- **メリット**:
  - **高速**: pnpmのシンボリックリンク方式でインストール高速
  - **効率的**: 依存関係の重複排除でディスク容量節約
  - **ビルドキャッシュ**: Turborepoによる増分ビルド
  - **並列実行**: 複数パッケージのビルド・テストを並列実行
  - **将来性**: モダンな技術スタック、活発な開発
  - **開発体験**: 統一的なコマンド実行、型安全なコード共有
- **デメリット**:
  - pnpmのインストールが必要（CI/CDでも）
  - 学習コスト（Turborepo設定）
  - 移行コスト
- **評価**: 最もモダンで効率的。長期的に最適

### 選択肢4: Yarn workspaces + Nx
- **メリット**: Nxの強力な機能、依存関係グラフ可視化
- **デメリット**: Nxの設定が複雑、オーバースペック気味
- **評価**: 大規模プロジェクト向け。現時点では不要

## 決定

### 採用する技術スタック

**パッケージマネージャー**: **pnpm**
- **理由**:
  - npmより3倍高速なインストール
  - ディスク容量を最大70%節約（コンテンツアドレッサブルストレージ）
  - 厳格な依存関係解決（Phantom dependencies問題を回避）
  - モノレポに最適化されている

**ビルドシステム**: **Turborepo**
- **理由**:
  - 増分ビルドとキャッシュで高速化
  - タスクの並列実行
  - リモートキャッシュ対応（CI/CD高速化）
  - pnpm workspacesとの優れた統合
  - Vercel製で活発にメンテナンス

**プロジェクト構造**: **apps/ + packages/ 構成**

```
music-player-from-drive/
├── apps/
│   ├── web/                 # フロントエンド（React + Vite）
│   │   ├── src/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   └── server/              # バックエンド（Express）
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── packages/
│   ├── shared/              # 共通コード
│   │   ├── src/
│   │   │   ├── types/       # API型定義、エラー型など
│   │   │   ├── utils/       # 共通ユーティリティ
│   │   │   └── constants/   # 定数
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── eslint-config/       # 共通ESLint設定
│   │   ├── index.js
│   │   └── package.json
│   └── typescript-config/   # 共通TypeScript設定
│       ├── base.json
│       ├── react.json
│       ├── node.json
│       └── package.json
├── package.json             # ルートpackage.json（ワークスペース設定）
├── pnpm-workspace.yaml      # pnpmワークスペース設定
├── turbo.json               # Turborepo設定
├── .npmrc                   # pnpm設定
├── tsconfig.json            # ルートTypeScript設定（参照用）
├── .eslintrc.js             # ルートESLint設定
└── docs/
    └── adr/
```

### 新しいアーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                   Root Workspace                     │
│  pnpm-workspace.yaml, turbo.json, package.json      │
└─────────────────────────────────────────────────────┘
           │
           ├─────────────┬─────────────┬────────────────
           ↓             ↓             ↓
    ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │ apps/web │  │apps/     │  │ packages/    │
    │ (React)  │  │server    │  │ shared       │
    └──────────┘  │(Express) │  │ (共通コード) │
           │      └──────────┘  └──────────────┘
           │           │                │
           └───────────┴────────────────┘
                       ↓
              依存関係: @music-player/shared
```

### 実装する機能

#### 1. pnpm workspaces 設定
**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**ルートpackage.json**:
```json
{
  "name": "music-player-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\""
  }
}
```

#### 2. Turborepo 設定
**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

#### 3. 共通パッケージ（@music-player/shared）
**packages/shared/package.json**:
```json
{
  "name": "@music-player/shared",
  "version": "0.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**共有する型定義の例**:
```typescript
// packages/shared/src/types/api.ts
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    email: string;
    name: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
```

#### 4. パッケージ間の依存関係
**apps/web/package.json**:
```json
{
  "name": "@music-player/web",
  "dependencies": {
    "@music-player/shared": "workspace:*"
  }
}
```

**apps/server/package.json**:
```json
{
  "name": "@music-player/server",
  "dependencies": {
    "@music-player/shared": "workspace:*"
  }
}
```

#### 5. TypeScript Project References
**ルートtsconfig.json**:
```json
{
  "files": [],
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/server" },
    { "path": "./packages/shared" }
  ]
}
```

## 結果

### 良い点

✅ **パフォーマンスの大幅向上**
- pnpmによる高速インストール（npm比で3倍）
- Turborepoによるビルドキャッシュと並列実行
- CI/CDパイプラインの高速化

✅ **ディスク容量の節約**
- 依存関係の重複排除で最大70%削減
- シンボリックリンクによる効率的な管理

✅ **コード共有の実現**
- 型定義の共有でフロント・バック間の型安全性向上
- バリデーションロジックの一元管理
- ユーティリティ関数の再利用

✅ **開発体験の向上**
- 統一的なコマンド実行（`pnpm dev`, `pnpm build`）
- Go to Definitionが正しく動作
- 統一的なLint・Format
- ホットリロードの高速化

✅ **スケーラビリティ**
- 新しいアプリ・パッケージの追加が容易
- モバイルアプリ（React Native）の追加が可能
- 管理画面の追加が容易

✅ **CI/CDの最適化**
- 変更されたパッケージのみビルド・テスト
- リモートキャッシュで他の開発者のビルドを再利用
- デプロイ時間の短縮

### 悪い点（トレードオフ）

❌ **学習コスト**
- pnpmの概念（ワークスペース、プロトコル）
- Turborepoの設定方法
- モノレポ特有のベストプラクティス

❌ **移行コスト**
- 既存ファイルの移動とパス修正
- import文の書き換え
- CI/CDパイプラインの更新

❌ **ツールのインストール**
- 開発者全員がpnpmをインストール必要
- CI/CD環境でもpnpmセットアップが必要

❌ **複雑性の増加**
- ファイル構造が深くなる
- パッケージ間の依存関係管理
- デバッグ時の追跡が複雑化する場合がある

## 移行計画

### Phase 1: pnpm + workspace 基本セットアップ（本フェーズ）
- [x] ADRの作成
- [ ] pnpmのインストールとセットアップ
- [ ] pnpm-workspace.yaml作成
- [ ] ルートpackage.jsonの更新
- [ ] .npmrc設定

### Phase 2: ディレクトリ再編成
- [ ] apps/web/へフロントエンドを移動
- [ ] apps/server/へバックエンドを移動
- [ ] packages/shared/の作成
- [ ] パッケージ名を@music-player/*に変更

### Phase 3: Turborepo導入
- [ ] Turborepoのインストール
- [ ] turbo.json作成
- [ ] ビルド・開発スクリプトの統合
- [ ] キャッシュ動作の確認

### Phase 4: 共通コードの抽出
- [ ] API型定義の移動（packages/shared/types）
- [ ] 共通ユーティリティの抽出
- [ ] 定数の一元管理

### Phase 5: 設定ファイルの統合
- [ ] TypeScript設定の統合（packages/typescript-config）
- [ ] ESLint設定の統合（packages/eslint-config）
- [ ] Prettier設定の統合
- [ ] Project Referencesの設定

### Phase 6: CI/CDの更新
- [ ] GitHub Actions/CircleCIでpnpmセットアップ
- [ ] Turborepoキャッシュ設定
- [ ] 変更検出とビルド最適化
- [ ] デプロイパイプラインの更新

### Phase 7: ドキュメントと最適化
- [ ] READMEの更新
- [ ] 開発ガイドの作成
- [ ] パフォーマンス計測
- [ ] 最適化とチューニング

## 代替案の記録

### なぜNxを選ばなかったのか
- Nxは大規模プロジェクト向けで、現時点ではオーバースペック
- 設定が複雑で学習コストが高い
- Turborepoの方がシンプルで十分な機能を提供

### なぜYarnを選ばなかったのか
- pnpmの方が高速で効率的
- Yarn v1はレガシー、Yarn v2/v3はPnP方式が導入障壁
- pnpmの方がnpmとの互換性が高い

### なぜLernaを選ばなかったのか
- メンテナンスが停滞気味
- Turborepoの方がモダンで高速
- pnpm workspacesで十分な機能

## 参考資料

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo Best Practices](https://monorepo.tools/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

## 変更履歴

- 2026-02-03: 初版作成、pnpm workspaces + Turborepo + apps/packages構成の採用を決定
