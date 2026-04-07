import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";

// ═══════════════════════════════════════
// 色定義
// ═══════════════════════════════════════
const PRIORITY_COLORS = { S: "#dc2626", A: "#f97316", B: "#eab308", C: "#3b82f6" };

// ═══════════════════════════════════════
// データ定義（全て Supabase bp-erp 実データ・斉藤除外）
// ═══════════════════════════════════════

// MQ率帯別分布
const mqBandData = [
  { band: "5%以下(停止)", orders: 4, revenue: 19.2, mq: 0.2, color: "#dc2626" },
  { band: "5-10%", orders: 3, revenue: 3.0, mq: 0.1, color: "#f97316" },
  { band: "10-20%(検討)", orders: 40, revenue: 47.3, mq: 1.1, color: "#eab308" },
  { band: "20-46%(条件付)", orders: 335, revenue: 126.0, mq: 31.7, color: "#3b82f6" },
  { band: "47%以上(即受注)", orders: 2039, revenue: 1014.2, mq: 364.4, color: "#22c55e" },
];

// 営業担当別
const salesRepData = [
  { name: "山田", revenue: 392.1, mqRate: 76.4, orders: 716 },
  { name: "宮本", revenue: 224.8, mqRate: 75.4, orders: 427 },
  { name: "稲垣", revenue: 147.4, mqRate: 66.6, orders: 469 },
  { name: "横山", revenue: 134.7, mqRate: 70.4, orders: 168 },
  { name: "布施", revenue: 104.3, mqRate: 68.7, orders: 160 },
  { name: "稲葉", revenue: 47.6, mqRate: 74.3, orders: 29 },
  { name: "石川", revenue: 44.4, mqRate: 56.3, orders: 116 },
  { name: "北原", revenue: 39.8, mqRate: 72.4, orders: 201 },
  { name: "須藤", revenue: 38.5, mqRate: 50.2, orders: 69 },
  { name: "保木", revenue: 34.9, mqRate: 39.9, orders: 68 },
];

// ★ MQ率5%以下 実案件一覧（斉藤除外・Supabase実データ）
const mqUnder5Orders = [
  { code: "95607", customer: "中央経済社", item: "所得税取扱通達集（2026年）", pq: 590340, vq: 701500, mq: -111160, mqRate: -18.8, rep: "山田", action: "原価超過。VQ見直し or 価格改定", notification: "「本案件は原材料費が販売価格を超過しており、現行条件での継続が困難です。つきましては、価格の見直しをご相談させていただきたく存じます。具体的には、○○円→○○円への改定をお願いできればと考えております。」" },
  { code: "95920", customer: "武蔵野", item: "クリーン・リフレ物流発送費 [11/30まで]", pq: 45000, vq: 45080, mq: -80, mqRate: -0.2, rep: "稲垣", action: "物流費赤字。発送単価の見直し", notification: "「物流発送費につきまして、現行の発送単価では運送費の上昇により採算が取れない状況です。次回契約更新時に、発送単価の見直しをお願いできればと存じます。」" },
  { code: "96497", customer: "武蔵野", item: "クリーン・リフレ物流発送費 [12/31まで]", pq: 46200, vq: 45080, mq: 1120, mqRate: 2.4, rep: "稲垣", action: "MQ率2.4%。発送単価改定が必要", notification: "「（上記と同一案件系統。まとめて交渉）発送費の単価改定をお願いいたします。」" },
  { code: "92424", customer: "自由民主党本部", item: "第27回参院選確認団体ポスター", pq: 9576000, vq: 9292000, mq: 284000, mqRate: 3.0, rep: "布施", action: "大型案件だがMQ3%。次回は価格改定必須", notification: "「長年のお付き合いに心より感謝申し上げます。誠に恐縮ですが、原材料費・人件費の高騰により、現行価格での品質維持が困難な状況です。次回ご発注の際には、○○%の価格改定をご検討いただけますと幸いです。品質は従来通り最高水準を維持いたします。」" },
];

// ★ MQ率5-10% 実案件一覧
const mq5to10Orders = [
  { code: "95460", customer: "昭和情報プロセス", item: "キタミ式イラストIT塾 基本情報技術者 令和08年", pq: 1510012, vq: 1413600, mq: 96412, mqRate: 6.4, rep: "横山", action: "仕様見直しでVQ削減を検討" },
  { code: "95468", customer: "東京大学", item: "QUOカード1000円分", pq: 11300, vq: 10400, mq: 900, mqRate: 8.0, rep: "横山", action: "少額案件。付帯サービスで利益補完" },
  { code: "96971", customer: "お口の健康", item: "2026年2月バースデーDM", pq: 129102, vq: 116319, mq: 12783, mqRate: 9.9, rep: "保木", action: "DM単価を10%引き上げ交渉" },
];

// ★ MQ率10-20% 主要案件（改善検討対象）
const mq10to20Orders = [
  { code: "95461", customer: "昭和情報プロセス", item: "キタミ式IT塾 ITパスポート 令和08年", mqRate: 10.0, pq: 1018440, rep: "横山" },
  { code: "95493", customer: "お口の健康", item: "バースデーDM（11月）", mqRate: 10.6, pq: 113939, rep: "保木" },
  { code: "94976", customer: "お口の健康", item: "バースデーDM（10月）", mqRate: 10.7, pq: 112315, rep: "保木" },
  { code: "95816", customer: "お口の健康", item: "バースデーDM（12月）", mqRate: 11.6, pq: 102710, rep: "保木" },
  { code: "95172", customer: "アジア口腔顎顔面外科学会", item: "口座振替請求書", mqRate: 12.3, pq: 70079, rep: "須藤" },
  { code: "95821", customer: "お口の健康", item: "クリスマスキャンペーンDM", mqRate: 12.6, pq: 231155, rep: "保木" },
  { code: "93529", customer: "山田美樹事務所", item: "機関誌 自由民主", mqRate: 12.9, pq: 1105800, rep: "稲垣" },
  { code: "95627", customer: "山田美樹事務所", item: "機関誌 自由民主 12/25発行", mqRate: 14.0, pq: 1120400, rep: "稲垣" },
  { code: "95013", customer: "ニコリオ", item: "自社後払い用ユーザー納品書", mqRate: 14.3, pq: 367500, rep: "保木" },
  { code: "多数", customer: "研友流通", item: "月刊WAM（7-2月号・8件）", mqRate: 14.3, pq: 483600, rep: "山田" },
  { code: "92839", customer: "環境省", item: "熱中症普及啓発資料印刷", mqRate: 17.2, pq: 507098, rep: "石川" },
  { code: "95171", customer: "アジア口腔顎顔面外科学会", item: "郵便振替請求書", mqRate: 16.9, pq: 67388, rep: "須藤" },
];

// 休眠顧客
const recoveryTargets = [
  { name: "本間様・中川様", revenue: 10.2, priority: "S", action: "架電→訪問", message: "「最近の印刷はどちらに？品質・納期でお困りの点はありますか？」", timing: "今週中", assignee: "山田/宮本" },
  { name: "村上様", revenue: 5.7, priority: "S", action: "架電→訪問", message: "「ご無沙汰しております。近況伺いと新サービスのご紹介をさせてください」", timing: "今週中", assignee: "山田" },
  { name: "細井様", revenue: 5.5, priority: "S", action: "架電→訪問", message: "「以前はありがとうございました。最近の案件状況をお聞かせください」", timing: "今週中", assignee: "宮本" },
  { name: "有定様", revenue: 4.7, priority: "A", action: "架電", message: "「お世話になっていた有定様にご挨拶を。新しい提案がございます」", timing: "来週", assignee: "稲垣" },
  { name: "花岡様", revenue: 4.5, priority: "A", action: "架電", message: "「AI書類保管サービスの無料トライアルのご案内です」", timing: "来週", assignee: "横山" },
  { name: "坂本様", revenue: 4.3, priority: "A", action: "架電", message: "「印刷＋クリエイティブの一括対応で、コスト削減のご提案があります」", timing: "来週", assignee: "布施" },
  { name: "都築様", revenue: 4.3, priority: "A", action: "架電", message: "「前回のお取引から時間が経ちましたが、新体制でのサービスをご紹介させてください」", timing: "来週", assignee: "稲垣" },
  { name: "石橋先生", revenue: 3.4, priority: "B", action: "メール→架電", message: "「先生の研究に関連した出版・印刷のサポートを改めてご提案したく」", timing: "2週間以内", assignee: "稲葉" },
  { name: "山岸先生", revenue: 3.3, priority: "B", action: "メール→架電", message: "「学術出版の新しいワークフロー（AI校正等）のご紹介」", timing: "2週間以内", assignee: "稲葉" },
  { name: "前田様", revenue: 3.2, priority: "B", action: "メール→架電", message: "「価格見直しのご案内と、ワンストップサービスのご提案」", timing: "2週間以内", assignee: "北原" },
];

// クロスセル対象
const crossSellTargets = [
  { name: "中央経済社", revenue: 216.9, mqRate: 87.5, orders: 169, action: "クロスセル提案", message: "「印刷に加えて、クリエイティブ制作・物流の一括対応で業務効率化を」", timing: "今月中", assignee: "山田" },
  { name: "金融財政事情研究会", revenue: 77.0, mqRate: 79.7, orders: 103, action: "クロスセル提案", message: "「秋葉原Bスタジオでの撮影・動画制作もセットでご提案」", timing: "今月中", assignee: "山田" },
  { name: "日本法令", revenue: 73.5, mqRate: 79.9, orders: 147, action: "増刷リマインド", message: "「在庫状況を確認させてください。増刷タイミングを最適化するご提案です」", timing: "今月中", assignee: "宮本" },
  { name: "小学館", revenue: 60.6, mqRate: 84.9, orders: 163, action: "クロスセル提案", message: "「AI書類保管サービスで、校正原稿の管理を効率化しませんか」", timing: "今月中", assignee: "宮本" },
  { name: "研友社印刷", revenue: 26.9, mqRate: 92.0, orders: 223, action: "取引拡大", message: "「MQ率最高水準のパートナーとして、新規案件の優先受注をご提案」", timing: "今月中", assignee: "稲垣" },
];

// 設計経営の数式
const designFormula = [
  { label: "Q（受注数）", current: "2,437件", target: "2,800件", gap: "+363件", method: "休眠復活＋新規開拓" },
  { label: "P（単価）", current: "496千円", target: "600千円", gap: "+104千円", method: "単価交渉＋クロスセル" },
  { label: "MQ率", current: "32.8%", target: "47%+", gap: "+14.2pt", method: "赤字案件停止＋価格改定" },
  { label: "F（固定費）", current: "推定180百万/年", target: "160百万/年", gap: "-20百万", method: "用紙▲200万+外注▲200万/月" },
];

// KPIレーダー
const kpiPillars = [
  { subject: "離脱顧客奪還", target: 100, actual: 0 },
  { subject: "AI書類保管", target: 100, actual: 0 },
  { subject: "秋葉原Bスタジオ", target: 100, actual: 0 },
  { subject: "経費構造改革", target: 100, actual: 0 },
  { subject: "単価改善・新規", target: 100, actual: 0 },
];

// ★ 宮川商店の原則と文唱堂の対応表
const miyakawaTable = [
  { principle: "MQ率47%以上ルール", miyakawa: "MQ率47%未満の仕事は受けない。利益なき繁忙を排除。", bunshodo_current: "83.7%がMQ47%以上（斉藤除外後）。しかし335件が20-46%帯に滞留。", bunshodo_action: "MQ5%以下4件を即停止。20-46%帯の335件は単価交渉でMQ47%以上に引き上げ。", gap: "中" },
  { principle: "「売らない経営」", miyakawa: "売り込みではなく顧客の困りごとを「聴く」。承認欲求を満たす接客。", bunshodo_current: "トークスクリプト未整備。営業スタイルの転換が未着手。", bunshodo_action: "全営業にトークスクリプト配布。「最近どちらに発注？」「お困りの点は？」を入口に。", gap: "大" },
  { principle: "前受金モデル", miyakawa: "キャッシュフロー安定化のため、入金サイクルを先行させる。", bunshodo_current: "前受金モデル未導入。買掛金130.6百万円が全額未払い。", bunshodo_action: "標準契約書に前受金条項を追加。新規案件から段階的に導入。", gap: "大" },
  { principle: "客数維持の仕組み", miyakawa: "離脱防止：増刷リマインド、定期接触。復活：休眠客への架電システム。", bunshodo_current: "休眠20社が全社未接触。増刷リマインド仕組みなし。", bunshodo_action: "今週中にTop3架電。増刷リマインドシステムをPhase2で構築。", gap: "大" },
  { principle: "F（固定費）の可変化", miyakawa: "固定費をできるだけ変動費化。内製/外注の最適配分。", bunshodo_current: "用紙仕入月1,900万・外注費月700万。目標設定済みだが実績ゼロ。", bunshodo_action: "用紙→1,700万、外注→500万/月に削減。仕入先相見積もり・多能工化。", gap: "中" },
  { principle: "5事業クロスセル", miyakawa: "印刷だけでなく複数事業をクロスセルし、1顧客あたりの売上・利益を最大化。", bunshodo_current: "5事業クロスセルマトリクス未運用。営業ツール化されていない。", bunshodo_action: "Phase1でマトリクスを印刷配布。中央経済社・日本法令等へ5事業提案。", gap: "大" },
  { principle: "「一人50社覚える」", miyakawa: "全営業が50社の顧客情報を共有。担当外でも対応可能に。", bunshodo_current: "週次顧客共有MTG未開始。属人的な顧客管理。", bunshodo_action: "Phase2で週次MTG開始。10名×50社=500社の顧客網を構築。", gap: "大" },
  { principle: "見積→受注の転換率", miyakawa: "見積から受注への転換率を計測し、ボトルネックを特定して改善。", bunshodo_current: "estimates 38,155件 vs orders 2,437件。転換率追跡の仕組みなし。", bunshodo_action: "Phase2で計測の仕組み構築。Phase3で転換率を評価しボトルネック特定。", gap: "大" },
  { principle: "設計経営 G=Q×P×MQ率-F", miyakawa: "4変数を全て改善し、利益を「設計」する。感覚経営からの脱却。", bunshodo_current: "Q:2,437件 P:496千円 MQ率:32.8% F:推定180百万/年。全変数に改善余地。", bunshodo_action: "Q→2,800 P→600千円 MQ率→47%+ F→160百万。4変数同時改善で黒字転換。", gap: "中" },
];

// ═══════════════════════════════════════
// 共通コンポーネント
// ═══════════════════════════════════════

function MetricCard({ label, value, sub, color = "blue" }) {
  const colors = {
    red: "bg-red-50 border-red-200 text-red-700",
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`rounded-lg border-2 p-4 ${colors[color]}`}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  );
}

function PriorityBadge({ level }) {
  const cls = { S: "bg-red-600 text-white", A: "bg-orange-500 text-white", B: "bg-yellow-400 text-gray-900", C: "bg-blue-400 text-white" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls[level]}`}>{level}</span>;
}

function GapBadge({ gap }) {
  const cls = { "大": "bg-red-100 text-red-700", "中": "bg-yellow-100 text-yellow-700", "小": "bg-green-100 text-green-700" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls[gap]}`}>Gap: {gap}</span>;
}

// ═══════════════════════════════════════
// メインコンポーネント
// ═══════════════════════════════════════

export default function TurnaroundReport() {
  const [tab, setTab] = useState("contact");

  const sections = [
    { id: "contact", label: "連絡アクション", icon: "📞" },
    { id: "mq_list", label: "MQ率一覧", icon: "📋" },
    { id: "notification", label: "価格改定案", icon: "📨" },
    { id: "miyakawa", label: "宮川原則表", icon: "📖" },
    { id: "s1", label: "現状認識", icon: "🔍" },
    { id: "s3", label: "販売5仕組み", icon: "🛠" },
    { id: "s4", label: "顧客7打ち手", icon: "👥" },
    { id: "s6", label: "90日計画", icon: "📅" },
    { id: "s7", label: "数字根拠", icon: "📊" },
    { id: "s8", label: "設計経営", icon: "🏗" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <header className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h1 className="text-xl font-bold text-gray-900">文唱堂印刷 黒字転換プラン ─ 実行レポート</h1>
        <p className="text-xs text-gray-500 mt-1">bp-erp Supabase | 2026年4月7日 | 第85期 | orders_v2: 2,437件（斉藤除外）</p>
        <nav className="flex flex-wrap gap-1 mt-3 bg-gray-100 rounded-lg p-1">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setTab(s.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tab === s.id
                  ? ["contact","mq_list","notification"].includes(s.id) ? "bg-red-600 text-white shadow" : s.id === "miyakawa" ? "bg-blue-700 text-white shadow" : "bg-white shadow text-blue-700"
                  : ["contact","mq_list","notification"].includes(s.id) ? "text-red-600 hover:bg-red-50 font-bold" : "text-gray-600 hover:text-gray-800"
              }`}
            >{s.icon} {s.label}</button>
          ))}
        </nav>
      </header>

      {/* ═══════════════════════════════════════ */}
      {/* 連絡アクションリスト */}
      {/* ═══════════════════════════════════════ */}
      {tab === "contact" && (
        <div className="space-y-6">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
            <h2 className="text-lg font-bold text-red-800 mb-1">どこに・どんな連絡をするか ─ 具体的アクションリスト</h2>
            <p className="text-sm text-red-600">全項目に担当者・トークスクリプト・タイミングを設定済み。</p>
          </div>

          {/* サマリーテーブル */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">連絡アクション全体サマリー</h3>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-gray-100">
                <th className="p-2 text-left border">カテゴリ</th><th className="p-2 text-right border">対象</th><th className="p-2 text-right border">売上規模</th><th className="p-2 text-left border">期限</th><th className="p-2 text-left border">アクション</th>
              </tr></thead>
              <tbody>
                <tr className="bg-red-50"><td className="p-2 border font-bold text-red-700">① 赤字案件停止</td><td className="p-2 border text-right">4件(3社)</td><td className="p-2 border text-right">PQ計10.3百万</td><td className="p-2 border">今週中</td><td className="p-2 border">価格改定通知 or 辞退</td></tr>
                <tr className="bg-orange-50"><td className="p-2 border font-bold text-orange-700">② 休眠顧客奪還</td><td className="p-2 border text-right">20社</td><td className="p-2 border text-right">69.4百万円</td><td className="p-2 border">今週〜2週間</td><td className="p-2 border">架電→訪問→提案</td></tr>
                <tr className="bg-green-50"><td className="p-2 border font-bold text-green-700">③ 高MQクロスセル</td><td className="p-2 border text-right">5社</td><td className="p-2 border text-right">454.9百万円</td><td className="p-2 border">今月中</td><td className="p-2 border">5事業クロスセル提案</td></tr>
                <tr className="bg-yellow-50"><td className="p-2 border font-bold text-yellow-700">④ MQ改善交渉</td><td className="p-2 border text-right">40件+</td><td className="p-2 border text-right">47.3百万円</td><td className="p-2 border">Phase1-2</td><td className="p-2 border">単価交渉・仕様見直し</td></tr>
              </tbody>
            </table>
          </div>

          {/* 赤字案件 */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-bold text-red-700 mb-3">🔴 最優先：赤字案件への価格改定通知（MQ5%以下・4件）</h3>
            {mqUnder5Orders.map((o, i) => (
              <div key={i} className="mb-3 border-2 border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PriorityBadge level="S" />
                    <span className="font-bold">{o.customer}</span>
                    <span className="text-xs text-gray-500">#{o.code}</span>
                  </div>
                  <span className="text-red-600 font-bold">MQ率 {o.mqRate}%</span>
                </div>
                <div className="text-sm text-gray-700 mb-1">案件: {o.item}</div>
                <div className="text-sm mb-1">PQ: {(o.pq/10000).toFixed(1)}万 | VQ: {(o.vq/10000).toFixed(1)}万 | MQ: {(o.mq/10000).toFixed(1)}万 | 担当: {o.rep}</div>
                <div className="text-sm text-blue-700 font-medium mb-2">→ {o.action}</div>
                <div className="text-sm bg-white rounded p-3 border border-red-200 italic">{o.notification}</div>
              </div>
            ))}
          </div>

          {/* 休眠顧客 */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-bold text-orange-700 mb-3">🟠 休眠顧客への架電（20社・69.4百万円・全社未接触）</h3>
            <div className="space-y-3">
              {recoveryTargets.map((t, i) => (
                <div key={i} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PriorityBadge level={t.priority} />
                      <span className="font-bold text-gray-800">{t.name}</span>
                      <span className="text-sm text-blue-700 font-medium">{t.revenue}百万円</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">担当: {t.assignee}</span>
                      <span className="text-sm text-gray-500">{t.timing}</span>
                    </div>
                  </div>
                  <div className="text-sm mb-1"><span className="font-medium text-gray-700">方法: </span><span className="text-blue-600">{t.action}</span></div>
                  <div className="text-sm bg-blue-50 rounded p-2 border border-blue-100 italic text-gray-700">{t.message}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200 text-sm">
              <span className="font-bold text-yellow-700">トーク原則：</span>「売り込みではなく聴く」。相手の現状を把握した上で、5事業から最適な提案を出す。
            </div>
          </div>

          {/* クロスセル */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-lg font-bold text-green-700 mb-3">🟢 高利益顧客へのクロスセル提案（上位5社）</h3>
            <div className="space-y-3">
              {crossSellTargets.map((t, i) => (
                <div key={i} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PriorityBadge level="A" />
                      <span className="font-bold">{t.name}</span>
                      <span className="text-sm text-blue-700">{t.revenue}百万円</span>
                      <span className="text-sm text-green-700">MQ {t.mqRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">担当: {t.assignee}</span>
                      <span className="text-sm text-gray-500">{t.timing}</span>
                    </div>
                  </div>
                  <div className="text-sm mb-1"><span className="font-medium">方法: </span><span className="text-blue-600">{t.action}</span></div>
                  <div className="text-sm bg-green-50 rounded p-2 border border-green-100 italic">{t.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* MQ率一覧（実データ） */}
      {/* ═══════════════════════════════════════ */}
      {tab === "mq_list" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b pb-2">全案件 MQ率一覧 ─ 要対処案件の特定（斉藤除外・Supabase実データ）</h2>

            {/* MQ≤5% */}
            <h3 className="font-bold text-red-700 mt-6 mb-3 flex items-center gap-2">
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs">停止</span>
              MQ率5%以下：4件 ─ 即停止 or 価格改定必須
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mb-6">
                <thead><tr className="bg-red-50">
                  <th className="p-2 border text-left">注文#</th><th className="p-2 border text-left">顧客名</th><th className="p-2 border text-left">案件名</th>
                  <th className="p-2 border text-right">PQ(万)</th><th className="p-2 border text-right">VQ(万)</th><th className="p-2 border text-right">MQ(万)</th>
                  <th className="p-2 border text-right">MQ率</th><th className="p-2 border text-left">担当</th><th className="p-2 border text-left">対処</th>
                </tr></thead>
                <tbody>
                  {mqUnder5Orders.map((o, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50"}>
                      <td className="p-2 border">{o.code}</td><td className="p-2 border font-medium">{o.customer}</td><td className="p-2 border">{o.item}</td>
                      <td className="p-2 border text-right">{(o.pq/10000).toFixed(1)}</td><td className="p-2 border text-right">{(o.vq/10000).toFixed(1)}</td>
                      <td className="p-2 border text-right text-red-600 font-bold">{(o.mq/10000).toFixed(1)}</td>
                      <td className="p-2 border text-right text-red-600 font-bold">{o.mqRate}%</td>
                      <td className="p-2 border">{o.rep}</td><td className="p-2 border text-red-700 font-medium">{o.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MQ 5-10% */}
            <h3 className="font-bold text-orange-700 mt-6 mb-3 flex items-center gap-2">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs">注意</span>
              MQ率5-10%：3件 ─ 価格交渉 or 仕様見直し
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mb-6">
                <thead><tr className="bg-orange-50">
                  <th className="p-2 border text-left">注文#</th><th className="p-2 border text-left">顧客名</th><th className="p-2 border text-left">案件名</th>
                  <th className="p-2 border text-right">PQ(万)</th><th className="p-2 border text-right">MQ率</th><th className="p-2 border text-left">担当</th><th className="p-2 border text-left">対処</th>
                </tr></thead>
                <tbody>
                  {mq5to10Orders.map((o, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}>
                      <td className="p-2 border">{o.code}</td><td className="p-2 border font-medium">{o.customer}</td><td className="p-2 border">{o.item}</td>
                      <td className="p-2 border text-right">{(o.pq/10000).toFixed(1)}</td>
                      <td className="p-2 border text-right text-orange-600 font-bold">{o.mqRate}%</td>
                      <td className="p-2 border">{o.rep}</td><td className="p-2 border text-orange-700">{o.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MQ 10-20% */}
            <h3 className="font-bold text-yellow-700 mt-6 mb-3 flex items-center gap-2">
              <span className="bg-yellow-400 text-gray-900 px-2 py-0.5 rounded text-xs">検討</span>
              MQ率10-20%：40件（主要案件を抜粋）─ 改善検討対象
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mb-6">
                <thead><tr className="bg-yellow-50">
                  <th className="p-2 border text-left">注文#</th><th className="p-2 border text-left">顧客名</th><th className="p-2 border text-left">案件名</th>
                  <th className="p-2 border text-right">PQ(万)</th><th className="p-2 border text-right">MQ率</th><th className="p-2 border text-left">担当</th>
                </tr></thead>
                <tbody>
                  {mq10to20Orders.map((o, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-yellow-50"}>
                      <td className="p-2 border">{o.code}</td><td className="p-2 border font-medium">{o.customer}</td><td className="p-2 border">{o.item}</td>
                      <td className="p-2 border text-right">{(o.pq/10000).toFixed(1)}</td>
                      <td className="p-2 border text-right text-yellow-700 font-bold">{o.mqRate}%</td>
                      <td className="p-2 border">{o.rep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200 text-sm">
              <span className="font-bold text-blue-700">要点：</span> MQ5%以下4件は今週中に価格改定通知。5-10%の3件は来週中に交渉開始。10-20%の40件はPhase1-2で順次改善。特に保木担当のお口の健康案件（計8件）は一括交渉が効率的。
            </div>
          </div>

          {/* MQ帯別グラフ */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">MQ率帯別 受注分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mqBandData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="band" tick={{ fontSize: 10 }} interval={0} />
                <YAxis yAxisId="left" label={{ value: "件数", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "売上(百万)", angle: 90, position: "insideRight", fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="受注件数" />
                <Bar yAxisId="right" dataKey="revenue" fill="#22c55e" name="売上(百万)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* 価格改定通知案 */}
      {/* ═══════════════════════════════════════ */}
      {tab === "notification" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">赤字案件 価格改定通知案 ─ 顧客別ドラフト</h2>

            {/* 中央経済社 */}
            <div className="mb-6 border-2 border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 font-bold text-red-800">① 中央経済社 ─ 所得税取扱通達集（MQ率 -18.8%）</div>
              <div className="p-4 text-sm space-y-2">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><span className="text-gray-500">担当:</span> <span className="font-medium">山田</span></div>
                  <div><span className="text-gray-500">PQ:</span> <span className="font-medium">59.0万</span></div>
                  <div><span className="text-gray-500">VQ:</span> <span className="font-medium text-red-600">70.2万（PQ超過）</span></div>
                </div>
                <div className="bg-gray-50 rounded p-4 border">
                  <div className="font-bold text-gray-700 mb-2">通知案文:</div>
                  <p className="text-gray-800 leading-relaxed">
                    株式会社 中央経済社 御中<br/><br/>
                    平素より大変お世話になっております。文唱堂印刷の山田でございます。<br/><br/>
                    「所得税取扱通達集（2026年）」につきまして、ご相談がございます。<br/>
                    昨今の原材料費の高騰により、現行のお見積り条件では製造原価が販売価格を上回る状況となっております。<br/>
                    具体的には、現状の変動費が約70.2万円に対し、販売価格が59.0万円となっており、1冊あたり約11.2万円の逆ザヤが発生しております。<br/><br/>
                    つきましては、次回ご発注時より、<span className="font-bold">販売価格を75万円程度</span>（約27%の改定）にお見直しいただけないかご相談させていただきたく存じます。<br/>
                    代替案として、用紙の銘柄変更や製本仕様の見直しによるコスト削減もご提案可能です。<br/><br/>
                    貴社との長年のお取引を大切にしており、品質を維持しながら持続可能な条件を一緒に検討させていただければ幸いです。
                  </p>
                </div>
              </div>
            </div>

            {/* 武蔵野 */}
            <div className="mb-6 border-2 border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 font-bold text-red-800">② 武蔵野 ─ クリーン・リフレ物流発送費（MQ率 -0.2%〜2.4%）</div>
              <div className="p-4 text-sm space-y-2">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><span className="text-gray-500">担当:</span> <span className="font-medium">稲垣</span></div>
                  <div><span className="text-gray-500">対象:</span> <span className="font-medium">2件（11月・12月分）</span></div>
                  <div><span className="text-gray-500">状況:</span> <span className="font-medium text-red-600">発送費が実費とほぼ同額</span></div>
                </div>
                <div className="bg-gray-50 rounded p-4 border">
                  <div className="font-bold text-gray-700 mb-2">通知案文:</div>
                  <p className="text-gray-800 leading-relaxed">
                    株式会社 武蔵野 御中<br/><br/>
                    平素よりお世話になっております。文唱堂印刷の稲垣でございます。<br/><br/>
                    「クリーン・リフレ物流発送費（加盟店様分）」の件でご相談がございます。<br/>
                    現在の発送単価につきまして、運送費の上昇に伴い、弊社の手数料がほぼゼロの状態となっております。<br/>
                    （11月分: PQ 4.5万/VQ 4.5万、12月分: PQ 4.6万/VQ 4.5万）<br/><br/>
                    つきましては、次回契約更新時に<span className="font-bold">発送単価を15-20%程度</span>お見直しいただけないかご相談させていただきたく存じます。<br/>
                    発送品質・スケジュールはこれまで通り維持いたします。
                  </p>
                </div>
              </div>
            </div>

            {/* 自民党本部 */}
            <div className="mb-6 border-2 border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 font-bold text-red-800">③ 自由民主党本部 ─ 参院選確認団体ポスター（MQ率 3.0%）</div>
              <div className="p-4 text-sm space-y-2">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><span className="text-gray-500">担当:</span> <span className="font-medium">布施</span></div>
                  <div><span className="text-gray-500">PQ:</span> <span className="font-medium">957.6万（大型案件）</span></div>
                  <div><span className="text-gray-500">MQ:</span> <span className="font-medium text-red-600">28.4万（MQ率3.0%）</span></div>
                </div>
                <div className="bg-gray-50 rounded p-4 border">
                  <div className="font-bold text-gray-700 mb-2">通知案文:</div>
                  <p className="text-gray-800 leading-relaxed">
                    自由民主党本部 御中<br/><br/>
                    平素より格別のお引き立てを賜り、厚く御礼申し上げます。文唱堂印刷の布施でございます。<br/><br/>
                    先般の参院選確認団体ポスター（約1,915万円）を無事納品させていただきました。ありがとうございました。<br/><br/>
                    今後のお取引につきまして、率直にご相談させていただきたく存じます。<br/>
                    昨今の用紙・インク価格の高騰、および人件費の上昇により、現行の製造原価率が97%に達しており、<br/>
                    弊社としても品質を維持しながらの継続が厳しい状況です。<br/><br/>
                    次回ご発注の際には、<span className="font-bold">10-15%程度の価格改定</span>をご検討いただけますと幸いです。<br/>
                    もちろん、仕様の最適化（用紙銘柄・印刷方式の見直し等）によるコスト削減のご提案も併せてさせていただきます。<br/>
                    長年のお付き合いを大切にしながら、持続可能なお取引条件を一緒に考えさせていただければと存じます。
                  </p>
                </div>
              </div>
            </div>

            {/* 保木担当まとめ交渉 */}
            <div className="mb-6 border-2 border-yellow-200 rounded-lg overflow-hidden">
              <div className="bg-yellow-50 px-4 py-2 font-bold text-yellow-800">④ お口の健康（保木担当）─ バースデーDM等8件一括交渉（MQ率9.9-15.5%）</div>
              <div className="p-4 text-sm space-y-2">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div><span className="text-gray-500">担当:</span> <span className="font-medium">保木</span></div>
                  <div><span className="text-gray-500">対象:</span> <span className="font-medium">バースデーDM・キャンペーンDM等8件</span></div>
                  <div><span className="text-gray-500">現MQ率:</span> <span className="font-medium text-yellow-700">9.9%〜15.5%</span></div>
                </div>
                <div className="bg-gray-50 rounded p-4 border">
                  <div className="font-bold text-gray-700 mb-2">通知案文:</div>
                  <p className="text-gray-800 leading-relaxed">
                    お口の健康株式会社 御中<br/><br/>
                    いつもお世話になっております。文唱堂印刷の保木でございます。<br/><br/>
                    バースデーDM、キャンペーンDMなど、毎月ご発注いただき誠にありがとうございます。<br/><br/>
                    定期的にご発注いただいている案件につきまして、包括的なお見積りの見直しをご提案させていただきたく存じます。<br/>
                    現在、個別案件ごとの原価率が85-90%となっており、弊社としても品質維持のための投資が難しい水準です。<br/><br/>
                    <span className="font-bold">年間一括契約</span>にしていただくことで、<br/>
                    ・弊社: 安定した利益確保（目標MQ率20%以上）<br/>
                    ・御社: 年間発注の手間削減＋ボリュームディスカウント<br/>
                    という双方にメリットのある形をご提案できます。<br/><br/>
                    詳細は改めてお打ち合わせさせていただければ幸いです。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* 宮川商店の原則（表形式） */}
      {/* ═══════════════════════════════════════ */}
      {tab === "miyakawa" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">宮川商店の原則 vs 文唱堂の現状 ─ 対応表</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-3 border text-left w-1/6">宮川原則</th>
                    <th className="p-3 border text-left w-1/4">宮川商店の答え</th>
                    <th className="p-3 border text-left w-1/4">文唱堂の現状</th>
                    <th className="p-3 border text-left w-1/4">文唱堂の次のアクション</th>
                    <th className="p-3 border text-center w-16">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {miyakawaTable.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-3 border font-bold text-blue-800">{row.principle}</td>
                      <td className="p-3 border text-gray-700">{row.miyakawa}</td>
                      <td className="p-3 border text-gray-700">{row.bunshodo_current}</td>
                      <td className="p-3 border text-blue-700 font-medium">{row.bunshodo_action}</td>
                      <td className="p-3 border text-center"><GapBadge gap={row.gap} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-red-50 rounded border border-red-200 text-sm">
              <span className="font-bold text-red-700">結論：</span>9原則のうち7原則でGap「大」。特に「売らない経営」「客数維持」「クロスセル」「見積転換率」の4原則は仕組み自体が存在しない。
              MQ率47%ルールだけは斉藤除外後に83.7%達成しているが、残り335件の改善と仕組みの構築が急務。
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* セクション1: 現状認識 */}
      {/* ═══════════════════════════════════════ */}
      {tab === "s1" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">現状認識 ── 3つの病巣</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="受注総額" value="1,210.5百万" sub="2,437件（斉藤除外）" color="blue" />
              <MetricCard label="平均受注単価" value="496.7千円" sub="目標600千円" color="yellow" />
              <MetricCard label="MQ47%以上" value="83.7%" sub="2,039件" color="green" />
              <MetricCard label="KPI達成" value="0%" sub="39KPI全未着手" color="red" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-bold text-red-700 mb-1">病巣① PQ（販売力）</h4>
                <p>MQ5%以下は4件に縮小したが、20-46%帯に335件・126百万円が滞留。保木（39.9%）・須藤（50.2%）の構造改善が焦点。休眠20社（69.4百万）全社未接触。</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-bold text-orange-700 mb-1">病巣② F（固定費）</h4>
                <p>買掛金130.6百万円全額未払い。用紙仕入▲200万/月、外注費▲200万/月の目標は設定済みだが実績ゼロ。</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-bold text-yellow-700 mb-1">病巣③ Q（量）</h4>
                <p>5柱のKPI39項目・アクション30項目が全て未着手。実行が圧倒的に不足。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* セクション3: 販売5仕組み */}
      {/* ═══════════════════════════════════════ */}
      {tab === "s3" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">販売力強化 5つの仕組み</h2>
            {[
              { n: "①", t: "増刷リマインド", s: "未構築", d: "日本法令147件、小学館163件の増刷タイミングを逃している可能性。" },
              { n: "②", t: "5事業クロスセルマトリクス", s: "未運用", d: "中央経済社216.9百万への印刷以外の提案余地大。" },
              { n: "③", t: "一人50社覚えるMTG", s: "未開始", d: "10名×50社=500社の顧客網を共有できれば紹介営業が可能に。" },
              { n: "④", t: "見積シミュレーション", s: "未運用", d: "MQ20%以下の案件を受注前にブロックできていない。" },
              { n: "⑤", t: "見積→受注の転換率計測", s: "未構築", d: "estimates 38,155件 vs orders 2,437件の追跡仕組みなし。" },
            ].map((item, i) => (
              <div key={i} className="mb-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{item.n}</span>
                  <span className="font-bold">{item.t}</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">{item.s}</span>
                </div>
                <p className="text-sm text-gray-600">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* セクション4: 顧客7打ち手 */}
      {/* ═══════════════════════════════════════ */}
      {tab === "s4" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">顧客数底上げ 7つの打ち手</h2>
            <div className="mb-6">
              <h3 className="font-bold text-red-700 mb-3">打ち手① 離脱顧客20社の復活（69.4百万円）</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={recoveryTargets} margin={{ bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                  <YAxis label={{ value: "百万円", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" name="過去年間売上(百万)">
                    {recoveryTargets.map((e, i) => <Cell key={i} fill={PRIORITY_COLORS[e.priority]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {[
              { n: "②", t: "AI書類保管の拡販", d: "現5社→目標300社。DM2,666通未発送。", k: "0/2,666通" },
              { n: "③", t: "秋葉原Bスタジオ稼働率UP", d: "30%→60%目標。外部予約サイト掲載強化。", k: "未着手" },
              { n: "④", t: "Web新規開拓", d: "リード49件未対応。SEO・GMB未着手。", k: "0/49件" },
              { n: "⑤", t: "増刷リマインド", d: "日本法令147件、小学館163件の定期増刷をシステム化。", k: "未構築" },
              { n: "⑥", t: "5事業クロスセル", d: "印刷のみ顧客にクリエイティブ・物流・AI保管・スタジオを提案。", k: "未運用" },
              { n: "⑦", t: "紹介の仕組み化", d: "「一人50社覚える」で担当外顧客への紹介ルート構築。", k: "未開始" },
            ].map((item, i) => (
              <div key={i} className="mb-2 p-3 bg-gray-50 rounded border text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{item.n} {item.t}</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs">{item.k}</span>
                </div>
                <p className="text-gray-600 mt-1">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* セクション6: 90日計画 */}
      {/* ═══════════════════════════════════════ */}
      {tab === "s6" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">90日アクションプラン ── 30項目全未着手</h2>
            <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300 mb-6 text-center">
              <div className="text-2xl font-bold text-red-600">30項目 全て「not_started」</div>
            </div>
            {[
              { phase: "Phase 1（1-30日）: 止血と可視化", bg: "bg-red-50", items: [
                "全案件MQ率一覧の作成 → 本レポート「MQ率一覧」タブで完了",
                "赤字案件の価格改定通知 → 本レポート「価格改定案」タブにドラフト完成",
                "月次P/L・CFの週次モニタリング開始", "メンテナンス費の見える化",
                "前受金モデルの標準契約書作成", "休眠顧客Top50選定→Top20は本レポートで特定済み",
                "全問い合わせ対応ログ開始", "千代田エコシステム・荒川区提案の次アクション",
                "見積シミュレーション1件試行", "5事業クロスセルマトリクスの印刷配布",
              ]},
              { phase: "Phase 2（31-60日）: 仕組み構築", bg: "bg-blue-50", items: [
                "増刷リマインドシステム構築", "クロスセルマトリクスのERP実装",
                "週次顧客共有MTG開始", "AI予算達成案の運用テスト", "多能工化教育計画策定",
                "休眠50社接触（週10社ペース）", "5事業別入口コンテンツ企画",
                "SEO記事・GMB最適化", "提案シミュレーション運用開始", "見積→受注転換率の計測構築",
              ]},
              { phase: "Phase 3（61-90日）: 検証と調整", bg: "bg-green-50", items: [
                "MQ率改善の効果測定", "クロスセル実績集計", "顧客承認欲求施策の検証",
                "損益分岐点の再計算", "月次P/Lで黒字達成確認", "休眠復活数カウント（目標10社）",
                "Web問い合わせ件数（目標月5件）", "見積→受注転換率のボトルネック特定",
                "25シナリオ実績評価", "営業利益率12%・CF黒字化の進捗確認",
              ]},
            ].map((p, pi) => (
              <div key={pi} className="mb-4">
                <h4 className="font-bold text-sm mb-2">{p.phase}</h4>
                <div className="space-y-1">
                  {p.items.map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm p-2 ${p.bg} rounded`}>
                      <span className={`w-4 h-4 rounded flex-shrink-0 ${i < 2 && pi === 0 ? "bg-green-500" : "border-2 border-gray-300"}`} />
                      <span className={i < 2 && pi === 0 ? "line-through text-gray-400" : ""}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* セクション7: 数字根拠 */}
      {/* ═══════════════════════════════════════ */}
      {tab === "s7" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">数字根拠 ── 営業担当別分析</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={salesRepData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" label={{ value: "売上(百万)", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: "MQ率(%)", angle: 90, position: "insideRight", fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="売上(百万)" />
                <Bar yAxisId="right" dataKey="mqRate" fill="#22c55e" name="MQ率(%)" />
              </BarChart>
            </ResponsiveContainer>
            <table className="w-full text-sm mt-4">
              <thead><tr className="bg-gray-100">
                <th className="p-2 text-left">担当</th><th className="p-2 text-right">売上(百万)</th><th className="p-2 text-right">MQ率</th><th className="p-2 text-right">件数</th><th className="p-2 text-left">評価</th>
              </tr></thead>
              <tbody>
                {salesRepData.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2 text-right">{r.revenue}</td>
                    <td className="p-2 text-right font-bold" style={{ color: r.mqRate >= 70 ? "#16a34a" : r.mqRate >= 50 ? "#ca8a04" : "#dc2626" }}>{r.mqRate}%</td>
                    <td className="p-2 text-right">{r.orders}</td>
                    <td className="p-2">{r.mqRate >= 70 ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">優秀</span> : r.mqRate >= 50 ? <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">改善余地</span> : <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">要対策</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-3">顧客売上Top10</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={[
                { name: "中央経済社", v: 216.9 }, { name: "金融財政事情研究会", v: 77.0 }, { name: "日本法令", v: 73.5 },
                { name: "小学館", v: 60.6 }, { name: "NHK出版", v: 51.7 }, { name: "日本入試ｾﾝﾀｰ", v: 50.9 },
                { name: "富士産業", v: 49.3 }, { name: "フードニュース", v: 34.8 }, { name: "自民党本部", v: 29.1 }, { name: "研友流通", v: 26.9 },
              ]} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: "百万円", position: "insideBottom", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                <Tooltip /><Bar dataKey="v" fill="#3b82f6" name="受注額(百万)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* セクション8: 設計経営 */}
      {/* ═══════════════════════════════════════ */}
      {tab === "s8" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">設計経営 ── G = Q × P × MQ率 - F</h2>
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 mb-6 text-center">
              <div className="text-lg font-bold text-blue-800">G（利益）= Q（受注数）× P（単価）× MQ率 - F（固定費）</div>
            </div>
            <table className="w-full text-sm border-collapse mb-6">
              <thead><tr className="bg-gray-100">
                <th className="p-3 border text-left">変数</th><th className="p-3 border text-right">現状</th><th className="p-3 border text-right">目標</th><th className="p-3 border text-right">Gap</th><th className="p-3 border text-left">手段</th>
              </tr></thead>
              <tbody>
                {designFormula.map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-3 border font-bold">{d.label}</td><td className="p-3 border text-right">{d.current}</td>
                    <td className="p-3 border text-right text-blue-600 font-medium">{d.target}</td>
                    <td className="p-3 border text-right text-red-600 font-medium">{d.gap}</td>
                    <td className="p-3 border text-gray-600">{d.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="font-bold text-gray-800 mb-3">5つの柱 KPIレーダー</h3>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={kpiPillars}>
                  <PolarGrid /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="目標" dataKey="target" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  <Radar name="実績" dataKey="actual" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-gray-900 rounded-lg text-white text-center">
              <p className="text-lg font-bold mb-2">足りないのは戦略ではなく「実行」</p>
              <p className="text-sm text-gray-300">今日から「連絡アクション」タブの1件目を実行すること。</p>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-gray-400 pb-6">
        Supabase bp-erp (rwjhpfghhgstvplmggks) | orders_v2（斉藤除外）, customer_recovery_targets, turnaround_kpi_targets, action_plan_items, payables_v2 | 2026年4月7日
      </footer>
    </div>
  );
}
