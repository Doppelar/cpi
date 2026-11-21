# 物価のものさし（消費者物価指数をわかりやすく）

総務省統計局「消費者物価指数」の品目別価格指数（CSV）を取り込み、全国・東京都区部の推移と、月ごとに動いた品目をグラフで見られるサイト。

- Next.js（App Router）+ Neon（PostgreSQL）+ Vercel
- 取り込み：`/api/cron/import`（Vercel Cron が毎日 9:17 JST に実行。`Authorization: Bearer $CRON_SECRET` が必要、`?force=1` で強制）
- 計算：`src/lib/cpi/derive.ts`（前月比・前年同月比・寄与度・基準年の接続）

## 環境変数

- `DATABASE_URL`：Neon の接続文字列（Vercel の Neon 連携で自動設定）
- `CRON_SECRET`：取り込み API の鍵

## 開発

```bash
pnpm install
pnpm test
pnpm dev
```

出典：総務省統計局「消費者物価指数」（https://www.stat.go.jp/data/cpi/1.html）
