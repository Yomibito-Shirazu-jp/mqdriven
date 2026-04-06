# CLAUDE.md - AI向けプロジェクトガイドライン

## 金額取得ロジック（重要）

申請データ（formData）から金額を取得するときは、必ず `utils.ts` の `deriveApplicationAmount(formData)` を使うこと。

**絶対にやってはいけないこと:**
- `formData.amount || formData.totalAmount || 0` のようなインライン金額取得を書かないこと
- 各コンポーネントに独自の金額取得ロジックを実装しないこと

**理由:** 経費精算フォーム(EXP)は金額を `formData.invoice.totalGross` に保存するが、他のフォームは `formData.amount` や `formData.totalAmount` に保存する。過去にインラインの金額取得が `invoice.totalGross` を参照し忘れて0円表示になるバグが繰り返し発生した。

```typescript
// OK
import { deriveApplicationAmount } from '../utils';
const amount = deriveApplicationAmount(app.formData);

// NG - 絶対にやらないこと
const amount = formData?.totalAmount || formData?.amount || 0;
```
