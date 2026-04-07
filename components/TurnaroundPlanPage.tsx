import * as React from 'react';
import { getSupabase } from '../services/supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Cell
} from 'recharts';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface KpiTarget {
  id: string; pillar: string; pillar_name: string; kpi_name: string;
  target_month: string; target_value: number; actual_value: number;
  unit: string; status: string; owner: string; notes: string | null;
}

interface RecoveryTarget {
  id: string; customer_name: string; previous_annual_revenue: number;
  contact_status: string; contact_date: string | null; contact_by: string | null;
  loss_reason: string | null; recovery_plan: string | null;
  recovered_revenue: number; priority: number; notes: string | null;
}

interface MqOrder {
  order_code: string; customer_name: string; item_name: string;
  amount: string; estimate_pq: string; estimate_vq: string;
  estimate_mq: string; sales_rep: string; mq_rate: number;
}

interface ActionPlanItem {
  id: string; phase: number; phase_label: string; title: string;
  description: string | null; category: string; owner_name: string | null;
  status: string; due_date: string | null; start_day: number; end_day: number;
  target_metric: string | null; target_value: number | null;
  actual_value: number | null; unit: string | null;
}

interface Strategy {
  id: string; section: string; sort_order: number; title: string;
  subtitle: string | null; description: string | null;
  target_metric: string | null; target_value: string | null;
  actual_value: string | null; status: string; owner: string | null;
  due_date: string | null; notes: string | null;
}

interface Benchmark {
  id: string; indicator: string; miyakawa_value: string;
  bunshodo_implication: string; sort_order: number;
}

type TabId = 'overview' | 'miyakawa' | 'sales' | 'customers' | 'cost' | 'actions' | 'mq_list' | 'recovery' | 'design';

// ═══════════════════════════════════════
// Constants
// ═══════════════════════════════════════

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: '未着手', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
  achieved: { label: '達成', color: 'bg-emerald-100 text-emerald-700' },
  behind: { label: '遅延', color: 'bg-red-100 text-red-700' },
};

const CONTACT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_contacted: { label: '未連絡', color: 'bg-slate-100 text-slate-600' },
  contacted: { label: '連絡済', color: 'bg-blue-100 text-blue-700' },
  meeting_set: { label: '面談設定', color: 'bg-indigo-100 text-indigo-700' },
  proposal_sent: { label: '提案中', color: 'bg-amber-100 text-amber-700' },
  recovered: { label: '奪還成功', color: 'bg-emerald-100 text-emerald-700' },
  declined: { label: '辞退', color: 'bg-red-100 text-red-700' },
};

const PILLAR_CONFIG: Record<string, { icon: string; color: string }> = {
  pillar_1: { icon: '📞', color: 'border-l-blue-500' },
  pillar_2: { icon: '📦', color: 'border-l-emerald-500' },
  pillar_3: { icon: '🎙️', color: 'border-l-purple-500' },
  pillar_4: { icon: '✂️', color: 'border-l-amber-500' },
  pillar_5: { icon: '📈', color: 'border-l-rose-500' },
};

const PRIORITY_COLORS: Record<string, string> = { S: '#dc2626', A: '#f97316', B: '#eab308', C: '#3b82f6' };

const RECOVERY_SCRIPTS: Record<string, { action: string; message: string; timing: string; assignee: string; priority: string }> = {
  '本間様・中川様': { action: '架電→訪問', message: '「最近の印刷はどちらに？品質・納期でお困りの点はありますか？」', timing: '今週中', assignee: '山田/宮本', priority: 'S' },
  '村上様': { action: '架電→訪問', message: '「ご無沙汰しております。近況伺いと新サービスのご紹介をさせてください」', timing: '今週中', assignee: '山田', priority: 'S' },
  '細井様': { action: '架電→訪問', message: '「以前はありがとうございました。最近の案件状況をお聞かせください」', timing: '今週中', assignee: '宮本', priority: 'S' },
  '有定様': { action: '架電', message: '「新しい提案がございます」', timing: '来週', assignee: '稲垣', priority: 'A' },
  '花岡様': { action: '架電', message: '「AI書類保管サービスの無料トライアルのご案内です」', timing: '来週', assignee: '横山', priority: 'A' },
  '坂本様': { action: '架電', message: '「印刷＋クリエイティブの一括対応で、コスト削減のご提案があります」', timing: '来週', assignee: '布施', priority: 'A' },
  '都築様': { action: '架電', message: '「新体制でのサービスをご紹介させてください」', timing: '来週', assignee: '稲垣', priority: 'A' },
};

const CROSS_SELL_TARGETS = [
  { name: '中央経済社', revenue: 216.9, mqRate: 87.5, orders: 169, action: 'クロスセル提案', message: '「印刷に加えて、クリエイティブ制作・物流の一括対応で業務効率化を」', timing: '今月中', assignee: '山田' },
  { name: '金融財政事情研究会', revenue: 77.0, mqRate: 79.7, orders: 103, action: 'クロスセル提案', message: '「秋葉原Bスタジオでの撮影・動画制作もセットでご提案」', timing: '今月中', assignee: '山田' },
  { name: '日本法令', revenue: 73.5, mqRate: 79.9, orders: 147, action: '増刷リマインド', message: '「在庫状況を確認させてください。増刷タイミングを最適化するご提案です」', timing: '今月中', assignee: '宮本' },
  { name: '小学館', revenue: 60.6, mqRate: 84.9, orders: 163, action: 'クロスセル提案', message: '「AI書類保管サービスで、校正原稿の管理を効率化しませんか」', timing: '今月中', assignee: '宮本' },
  { name: '研友社印刷', revenue: 26.9, mqRate: 92.0, orders: 223, action: '取引拡大', message: '「MQ率最高水準のパートナーとして、新規案件の優先受注をご提案」', timing: '今月中', assignee: '稲垣' },
];

const MIYAKAWA_TABLE = [
  { principle: 'MQ率47%以上ルール', miyakawa: 'MQ率47%未満の仕事は受けない。', bunshodo: '83.7%がMQ47%以上（斉藤除外後）。335件が20-46%帯に滞留。', action: 'MQ5%以下4件を即停止。20-46%帯335件は単価交渉。', gap: '中' as const },
  { principle: '「売らない経営」', miyakawa: '売り込みではなく顧客の困りごとを「聴く」。', bunshodo: 'トークスクリプト未整備。営業スタイルの転換が未着手。', action: '全営業にトークスクリプト配布。「最近どちらに発注？」を入口に。', gap: '大' as const },
  { principle: '前受金モデル', miyakawa: 'CF安定化のため入金サイクルを先行。', bunshodo: '前受金モデル未導入。買掛金130.6百万円が全額未払い。', action: '標準契約書に前受金条項を追加。新規案件から導入。', gap: '大' as const },
  { principle: '客数維持の仕組み', miyakawa: '増刷リマインド、定期接触、休眠客への架電。', bunshodo: '休眠20社全社未接触。増刷リマインド仕組みなし。', action: '今週中にTop3架電。Phase2でリマインドシステム構築。', gap: '大' as const },
  { principle: 'F（固定費）の可変化', miyakawa: '固定費をできるだけ変動費化。', bunshodo: '用紙月1,900万・外注月700万。目標設定済みだが実績ゼロ。', action: '用紙→1,700万、外注→500万/月に削減。', gap: '中' as const },
  { principle: '5事業クロスセル', miyakawa: '複数事業をクロスセルし1顧客あたりの売上を最大化。', bunshodo: 'クロスセルマトリクス未運用。営業ツール化されていない。', action: 'Phase1でマトリクス印刷配布。Top5顧客へ5事業提案。', gap: '大' as const },
  { principle: '一人50社覚える', miyakawa: '全営業が50社の顧客情報を共有。', bunshodo: '週次顧客共有MTG未開始。属人的な管理。', action: 'Phase2で週次MTG開始。10名×50社=500社の顧客網構築。', gap: '大' as const },
  { principle: '見積→受注の転換率', miyakawa: '転換率を計測しボトルネックを特定。', bunshodo: 'estimates 38,155件 vs orders 2,437件。追跡仕組みなし。', action: 'Phase2で計測構築。Phase3でボトルネック特定。', gap: '大' as const },
  { principle: '設計経営 G=Q×P×MQ率-F', miyakawa: '4変数を全て改善し利益を「設計」する。', bunshodo: 'Q:2,437 P:496千円 MQ率:32.8% F:推定180百万/年。', action: 'Q→2,800 P→600千円 MQ率→47%+ F→160百万。', gap: '中' as const },
];

const PRICE_REVISION_DRAFTS = [
  {
    customer: '中央経済社', item: '所得税取扱通達集（2026年）', rep: '山田', mqRate: -18.8,
    pq: 590340, vq: 701500,
    draft: `株式会社 中央経済社 御中\n\n平素より大変お世話になっております。文唱堂印刷の山田でございます。\n\n「所得税取扱通達集（2026年）」につきまして、ご相談がございます。\n昨今の原材料費の高騰により、現行のお見積り条件では製造原価が販売価格を上回る状況となっております。\n（変動費約70.2万円に対し、販売価格59.0万円 → 約11.2万円の逆ザヤ）\n\nつきましては、次回ご発注時より販売価格を75万円程度（約27%の改定）にお見直しいただけないかご相談させていただきたく存じます。\n代替案として、用紙の銘柄変更や製本仕様の見直しによるコスト削減もご提案可能です。\n\n貴社との長年のお取引を大切にしており、品質を維持しながら持続可能な条件を一緒に検討させていただければ幸いです。`,
  },
  {
    customer: '武蔵野', item: 'クリーン・リフレ物流発送費', rep: '稲垣', mqRate: -0.2,
    pq: 45000, vq: 45080,
    draft: `株式会社 武蔵野 御中\n\n平素よりお世話になっております。文唱堂印刷の稲垣でございます。\n\n「クリーン・リフレ物流発送費（加盟店様分）」の件でご相談がございます。\n現在の発送単価につきまして、運送費の上昇に伴い弊社の手数料がほぼゼロの状態となっております。\n\nつきましては、次回契約更新時に発送単価を15-20%程度お見直しいただけないかご相談させていただきたく存じます。\n発送品質・スケジュールはこれまで通り維持いたします。`,
  },
  {
    customer: '自由民主党本部', item: '参院選確認団体ポスター', rep: '布施', mqRate: 3.0,
    pq: 9576000, vq: 9292000,
    draft: `自由民主党本部 御中\n\n平素より格別のお引き立てを賜り、厚く御礼申し上げます。文唱堂印刷の布施でございます。\n\n先般の参院選確認団体ポスター（約1,915万円）を無事納品させていただきました。ありがとうございました。\n\n今後のお取引につきまして、率直にご相談させていただきたく存じます。\n用紙・インク価格の高騰、人件費の上昇により、現行の製造原価率が97%に達しており、品質維持が厳しい状況です。\n\n次回ご発注の際には、10-15%程度の価格改定をご検討いただけますと幸いです。\n仕様の最適化（用紙銘柄・印刷方式の見直し等）によるコスト削減のご提案も併せてさせていただきます。`,
  },
  {
    customer: 'お口の健康（保木担当）', item: 'バースデーDM・キャンペーンDM等8件', rep: '保木', mqRate: 12.5,
    pq: 0, vq: 0,
    draft: `お口の健康株式会社 御中\n\nいつもお世話になっております。文唱堂印刷の保木でございます。\n\nバースデーDM、キャンペーンDMなど毎月ご発注いただき誠にありがとうございます。\n\n定期的にご発注いただいている案件につきまして、包括的なお見積りの見直しをご提案させていただきたく存じます。\n現在、個別案件ごとの原価率が85-90%となっており、品質維持のための投資が難しい水準です。\n\n年間一括契約にしていただくことで、\n・弊社: 安定した利益確保（目標MQ率20%以上）\n・御社: 年間発注の手間削減＋ボリュームディスカウント\nという双方にメリットのある形をご提案できます。`,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  mq_improvement: { label: 'MQ改善', color: 'bg-red-100 text-red-700', icon: '📈' },
  customer_acquisition: { label: '顧客獲得', color: 'bg-blue-100 text-blue-700', icon: '👥' },
  cost_reduction: { label: 'コスト削減', color: 'bg-amber-100 text-amber-700', icon: '✂️' },
  system_building: { label: '仕組み構築', color: 'bg-purple-100 text-purple-700', icon: '🛠' },
  pipeline_management: { label: 'パイプライン', color: 'bg-green-100 text-green-700', icon: '🔄' },
  measurement: { label: '計測・検証', color: 'bg-slate-100 text-slate-700', icon: '📊' },
};

const SECTION_CONFIG: Record<string, { accent: string; bg: string; border: string; text: string; icon: string }> = {
  sales_mechanism: { accent: 'bg-blue-600', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', icon: '💪' },
  customer_measure: { accent: 'bg-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', icon: '👥' },
  cost_optimization: { accent: 'bg-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', icon: '✂️' },
  design_management: { accent: 'bg-purple-600', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', icon: '🏗️' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);

const formatMan = (yen: number) => `${(yen / 10000).toFixed(1)}万`;

// ═══════════════════════════════════════
// 共通UIコンポーネント
// ═══════════════════════════════════════

const PriorityBadge: React.FC<{ level: string }> = ({ level }) => {
  const cls: Record<string, string> = { S: 'bg-red-600 text-white', A: 'bg-orange-500 text-white', B: 'bg-yellow-400 text-gray-900', C: 'bg-blue-400 text-white' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls[level] || cls.C}`}>{level}</span>;
};

const GapBadge: React.FC<{ gap: '大' | '中' | '小' }> = ({ gap }) => {
  const cls: Record<string, string> = { '大': 'bg-red-100 text-red-700', '中': 'bg-yellow-100 text-yellow-700', '小': 'bg-green-100 text-green-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls[gap]}`}>Gap: {gap}</span>;
};

const StrategyCard: React.FC<{
  strategy: Strategy;
  config: { accent: string; bg: string; border: string; text: string; icon: string };
  onStatusChange: (id: string, status: string) => void;
}> = ({ strategy, config, onStatusChange }) => {
  const st = STATUS_LABELS[strategy.status] || STATUS_LABELS.not_started;
  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-4 ${config.border} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${config.accent} text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold`}>
              {strategy.sort_order}
            </span>
            <h4 className="font-bold text-slate-800">{strategy.title}</h4>
            {strategy.subtitle && <span className="text-xs text-slate-400">{strategy.subtitle}</span>}
          </div>
          {strategy.description && (
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">{strategy.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs">
            {strategy.target_metric && (
              <span className={`${config.bg} ${config.text} px-2 py-1 rounded-lg font-medium`}>
                目標: {strategy.target_metric} {strategy.target_value || ''}
              </span>
            )}
            {strategy.owner && (
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">担当: {strategy.owner}</span>
            )}
          </div>
        </div>
        <select
          value={strategy.status}
          onChange={e => onStatusChange(strategy.id, e.target.value)}
          className={`text-xs px-3 py-1.5 rounded-full font-semibold border-0 cursor-pointer ${st.color}`}
        >
          {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// メインコンポーネント
// ═══════════════════════════════════════

const TurnaroundPlanPage: React.FC = () => {
  const [kpis, setKpis] = React.useState<KpiTarget[]>([]);
  const [recoveryTargets, setRecoveryTargets] = React.useState<RecoveryTarget[]>([]);
  const [mqOrders, setMqOrders] = React.useState<MqOrder[]>([]);
  const [actionItems, setActionItems] = React.useState<ActionPlanItem[]>([]);
  const [strategies, setStrategies] = React.useState<Strategy[]>([]);
  const [benchmarks, setBenchmarks] = React.useState<Benchmark[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [editingKpi, setEditingKpi] = React.useState<string | null>(null);
  const [editingRecovery, setEditingRecovery] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const [kpiRes, recRes, actRes, stratRes, benchRes] = await Promise.all([
        supabase.from('turnaround_kpi_targets').select('*').order('target_month', { ascending: true }),
        supabase.from('customer_recovery_targets').select('*').order('priority', { ascending: true }),
        supabase.from('action_plan_items').select('*').order('phase', { ascending: true }).order('start_day', { ascending: true }),
        supabase.from('turnaround_strategies').select('*').order('section').order('sort_order', { ascending: true }),
        supabase.from('miyakawa_benchmarks').select('*').order('sort_order', { ascending: true }),
      ]);
      if (kpiRes.data) setKpis(kpiRes.data);
      if (recRes.data) setRecoveryTargets(recRes.data);
      if (actRes.data) setActionItems(actRes.data);
      if (stratRes.data) setStrategies(stratRes.data);
      if (benchRes.data) setBenchmarks(benchRes.data);

      const { data: rawMq } = await supabase
        .from('orders_v2')
        .select('order_code, customer_name, item_name, amount, estimate_pq, estimate_vq, estimate_mq, sales_rep')
        .not('sales_rep', 'like', '%斉藤%')
        .gt('estimate_pq', 0);

      if (rawMq) {
        const withRate = rawMq
          .map((o: any) => ({
            ...o,
            mq_rate: Number(((Number(o.estimate_mq) / Number(o.estimate_pq)) * 100).toFixed(1)),
          }))
          .filter((o: any) => o.mq_rate <= 20)
          .sort((a: any, b: any) => a.mq_rate - b.mq_rate);
        setMqOrders(withRate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  // ─── Supabase CRUD ───
  const updateStrategyStatus = async (id: string, status: string) => {
    const supabase = getSupabase();
    await supabase.from('turnaround_strategies').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateKpiStatus = async (id: string, status: string) => {
    const supabase = getSupabase();
    await supabase.from('turnaround_kpi_targets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setKpis(prev => prev.map(k => k.id === id ? { ...k, status } : k));
  };

  const updateKpiActual = async (id: string, actual_value: number) => {
    const supabase = getSupabase();
    await supabase.from('turnaround_kpi_targets').update({ actual_value, updated_at: new Date().toISOString() }).eq('id', id);
    setKpis(prev => prev.map(k => k.id === id ? { ...k, actual_value } : k));
    setEditingKpi(null);
  };

  const updateRecoveryStatus = async (id: string, contact_status: string) => {
    const supabase = getSupabase();
    const update: Record<string, any> = { contact_status, updated_at: new Date().toISOString() };
    if (contact_status === 'contacted' || contact_status === 'meeting_set') {
      update.contact_date = new Date().toISOString().split('T')[0];
    }
    await supabase.from('customer_recovery_targets').update(update).eq('id', id);
    setRecoveryTargets(prev => prev.map(r => r.id === id ? { ...r, ...update } : r));
  };

  const updateRecoveryNotes = async (id: string, field: 'loss_reason' | 'notes', value: string) => {
    const supabase = getSupabase();
    await supabase.from('customer_recovery_targets').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    setRecoveryTargets(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setEditingRecovery(null);
  };

  const updateActionStatus = async (id: string, status: string) => {
    const supabase = getSupabase();
    const update: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    await supabase.from('action_plan_items').update(update).eq('id', id);
    setActionItems(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
  };

  // ─── Computed ───
  const bySection = (sec: string) => strategies.filter(s => s.section === sec).sort((a, b) => a.sort_order - b.sort_order);
  const diseases = bySection('disease');
  const principles = bySection('miyakawa_principle');
  const salesMechanisms = bySection('sales_mechanism');
  const customerMeasures = bySection('customer_measure');
  const costOptimizations = bySection('cost_optimization');
  const designVars = bySection('design_management');

  const pillarGroups = React.useMemo(() => {
    const groups: Record<string, KpiTarget[]> = {};
    kpis.forEach(k => { if (!groups[k.pillar]) groups[k.pillar] = []; groups[k.pillar].push(k); });
    return groups;
  }, [kpis]);

  const totalRecoveryTarget = recoveryTargets.reduce((s, r) => s + r.previous_annual_revenue, 0);
  const totalRecovered = recoveryTargets.reduce((s, r) => s + r.recovered_revenue, 0);
  const contactedCount = recoveryTargets.filter(r => r.contact_status !== 'not_contacted').length;
  const recoveredCount = recoveryTargets.filter(r => r.contact_status === 'recovered').length;
  const achievedKpis = kpis.filter(k => k.status === 'achieved').length;

  const completedActions = actionItems.filter(a => a.status === 'completed').length;
  const inProgressActions = actionItems.filter(a => a.status === 'in_progress').length;
  const phase1Items = actionItems.filter(a => a.phase === 1);
  const phase2Items = actionItems.filter(a => a.phase === 2);
  const phase3Items = actionItems.filter(a => a.phase === 3);

  const mqUnder5 = mqOrders.filter(o => o.mq_rate <= 5);
  const mq5to10 = mqOrders.filter(o => o.mq_rate > 5 && o.mq_rate <= 10);
  const mq10to20 = mqOrders.filter(o => o.mq_rate > 10 && o.mq_rate <= 20);

  const allStrategies = [...salesMechanisms, ...customerMeasures, ...costOptimizations, ...designVars];
  const achievedStrategies = allStrategies.filter(s => s.status === 'achieved').length;
  const inProgressStrategies = allStrategies.filter(s => s.status === 'in_progress').length;

  const kpiRadarData = [
    { subject: '離脱顧客奪還', target: 100, actual: pillarGroups.pillar_1 ? Math.round((pillarGroups.pillar_1.filter(k => k.status === 'achieved').length / pillarGroups.pillar_1.length) * 100) : 0 },
    { subject: 'AI書類保管', target: 100, actual: pillarGroups.pillar_2 ? Math.round((pillarGroups.pillar_2.filter(k => k.status === 'achieved').length / pillarGroups.pillar_2.length) * 100) : 0 },
    { subject: '秋葉原Bスタジオ', target: 100, actual: pillarGroups.pillar_3 ? Math.round((pillarGroups.pillar_3.filter(k => k.status === 'achieved').length / pillarGroups.pillar_3.length) * 100) : 0 },
    { subject: '経費構造改革', target: 100, actual: pillarGroups.pillar_4 ? Math.round((pillarGroups.pillar_4.filter(k => k.status === 'achieved').length / pillarGroups.pillar_4.length) * 100) : 0 },
    { subject: '単価改善・新規', target: 100, actual: pillarGroups.pillar_5 ? Math.round((pillarGroups.pillar_5.filter(k => k.status === 'achieved').length / pillarGroups.pillar_5.length) * 100) : 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; accent?: string }[] = [
    { id: 'overview', label: '🔍 概要・現状認識', accent: 'slate' },
    { id: 'miyakawa', label: '📖 宮川3原則' },
    { id: 'sales', label: '💪 販売力5仕組み', accent: 'blue' },
    { id: 'customers', label: '👥 顧客7打ち手', accent: 'emerald' },
    { id: 'cost', label: '✂️ コスト最適化', accent: 'amber' },
    { id: 'actions', label: `✅ 90日計画(${completedActions}/${actionItems.length})`, accent: 'emerald' },
    { id: 'mq_list', label: '📋 MQ率一覧', accent: 'red' },
    { id: 'recovery', label: `📞 顧客奪還(${contactedCount}/${recoveryTargets.length})`, accent: 'orange' },
    { id: 'design', label: '🏗️ 設計経営', accent: 'purple' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ═══ Header ═══ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-mono text-amber-400 tracking-widest mb-1">TURNAROUND PLAN — DATA DRIVEN</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">文唱堂印刷 黒字転換プラン</h1>
            <p className="text-slate-400 mt-2 text-sm">宮川商店ベンチマークからの示唆を踏まえた「少数精鋭で勝つ仕組み」</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-slate-400">最終目標</p>
            <p className="text-lg font-bold text-emerald-400">営業利益率12%</p>
            <p className="text-xs text-slate-400">営業CF黒字化</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">赤字案件(MQ5%以下)</p>
            <p className="text-2xl font-bold text-red-400">{mqUnder5.length}<span className="text-sm">件</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">奪還対象</p>
            <p className="text-2xl font-bold text-amber-400">{recoveryTargets.length}社</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">戦略進捗</p>
            <p className="text-2xl font-bold text-emerald-400">{achievedStrategies}<span className="text-sm text-slate-400">/{allStrategies.length}</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">戦略進行中</p>
            <p className="text-2xl font-bold text-blue-400">{inProgressStrategies}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">タスク完了率</p>
            <p className="text-2xl font-bold">{actionItems.length > 0 ? Math.round(completedActions / actionItems.length * 100) : 0}<span className="text-sm">%</span></p>
          </div>
        </div>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 sticky top-0 z-10">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* Tab 1: 概要・現状認識 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 核心メッセージ */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-amber-900 mb-3">核心メッセージ</h2>
            <p className="text-base text-amber-800 leading-relaxed font-medium">
              「営業を増やして売上を上げる」のではない。<br />
              「眠っている顧客を起こし、5つの入口で待ち受け、来た案件の質を上げ、コストを下げる」。<br />
              <strong>これが、営業が少なくても黒字になる道。</strong>
            </p>
          </div>

          {/* 現状認識：なぜ赤字か */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">1. 現状認識：なぜ赤字か</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diseases.map(d => (
                <div key={d.id} className="border-2 border-red-200 rounded-xl p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">{d.sort_order}</span>
                    <h3 className="font-bold text-red-800">{d.title}</h3>
                  </div>
                  <p className="text-sm text-red-700 leading-relaxed">{d.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 結論 */}
          <div className="bg-slate-900 text-white rounded-2xl p-6">
            <p className="text-base leading-relaxed">
              <strong className="text-amber-400">結論：</strong>
              質の改善（MQ率UP・コスト削減）と量の確保（顧客数・受注数の底上げ）は<strong className="text-emerald-400">同時に</strong>やらなければ黒字にならない。どちらか片方では不十分。
            </p>
          </div>

          {/* データサマリー */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Supabaseリアルタイムデータサマリー</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                <p className="text-xs text-red-600 font-medium">MQ5%以下（即停止）</p>
                <p className="text-3xl font-bold text-red-700">{mqUnder5.length}<span className="text-sm">件</span></p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
                <p className="text-xs text-orange-600 font-medium">MQ5-10%（要交渉）</p>
                <p className="text-3xl font-bold text-orange-700">{mq5to10.length}<span className="text-sm">件</span></p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
                <p className="text-xs text-yellow-700 font-medium">MQ10-20%（検討）</p>
                <p className="text-3xl font-bold text-yellow-700">{mq10to20.length}<span className="text-sm">件</span></p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">休眠顧客</p>
                <p className="text-3xl font-bold text-blue-700">{recoveryTargets.length}<span className="text-sm">社</span></p>
                <p className="text-xs text-blue-500">{formatCurrency(totalRecoveryTarget)}/年</p>
              </div>
            </div>
          </div>

          {/* プラン全体構造 */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">プラン全体構造</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border-l-4 border-blue-500 bg-blue-50 rounded-r-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('sales')}>
                <h3 className="font-bold text-blue-800 mb-1">💪 販売力5仕組み</h3>
                <p className="text-xs text-blue-600">{salesMechanisms.filter(s => s.status === 'achieved').length}/{salesMechanisms.length} 達成</p>
              </div>
              <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('customers')}>
                <h3 className="font-bold text-emerald-800 mb-1">👥 顧客7打ち手</h3>
                <p className="text-xs text-emerald-600">{customerMeasures.filter(s => s.status === 'achieved').length}/{customerMeasures.length} 達成</p>
              </div>
              <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('cost')}>
                <h3 className="font-bold text-amber-800 mb-1">✂️ コスト最適化4施策</h3>
                <p className="text-xs text-amber-600">{costOptimizations.filter(s => s.status === 'achieved').length}/{costOptimizations.length} 達成</p>
              </div>
              <div className="border-l-4 border-purple-500 bg-purple-50 rounded-r-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('design')}>
                <h3 className="font-bold text-purple-800 mb-1">🏗️ 設計経営</h3>
                <p className="text-xs text-purple-600">G = Q × P × MQ率 - F</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 2: 宮川3原則 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'miyakawa' && (
        <div className="space-y-6">
          {/* 3原則 */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">2. 宮川商店から学ぶべき3つの原則</h2>
            <div className="space-y-4">
              {principles.map(p => (
                <StrategyCard key={p.id} strategy={p} config={SECTION_CONFIG.design_management} onStatusChange={updateStrategyStatus} />
              ))}
            </div>
          </div>

          {/* ベンチマーク数値 */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">7. 宮川商店の数字が示す「少数で勝てる」根拠</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-indigo-50">
                  <th className="p-3 border text-left w-1/4">宮川の指標</th>
                  <th className="p-3 border text-left w-1/3">数値</th>
                  <th className="p-3 border text-left">文唱堂への示唆</th>
                </tr></thead>
                <tbody>
                  {benchmarks.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 border font-bold text-indigo-800">{b.indicator}</td>
                      <td className="p-3 border text-slate-800 font-mono">{b.miyakawa_value}</td>
                      <td className="p-3 border text-slate-600">{b.bunshodo_implication}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gap対応表 */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">宮川原則 × 文唱堂の現状 ─ Gap分析</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-blue-50">
                  <th className="p-3 border text-left w-1/6">宮川原則</th>
                  <th className="p-3 border text-left w-1/4">宮川の答え</th>
                  <th className="p-3 border text-left w-1/4">文唱堂の現状</th>
                  <th className="p-3 border text-left w-1/4">次のアクション</th>
                  <th className="p-3 border text-center w-16">Gap</th>
                </tr></thead>
                <tbody>
                  {MIYAKAWA_TABLE.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 border font-bold text-blue-800">{row.principle}</td>
                      <td className="p-3 border text-slate-700">{row.miyakawa}</td>
                      <td className="p-3 border text-slate-700">{row.bunshodo}</td>
                      <td className="p-3 border text-blue-700 font-medium">{row.action}</td>
                      <td className="p-3 border text-center"><GapBadge gap={row.gap} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 text-sm">
              <span className="font-bold text-red-700">結論：</span>9原則のうち7原則でGap「大」。特に「売らない経営」「客数維持」「クロスセル」「見積転換率」の4原則は仕組み自体が存在しない。
            </div>
          </div>

          {/* KPIレーダー */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">5つの柱 KPI進捗レーダー（ライブ）</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={kpiRadarData}>
                <PolarGrid /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} />
                <Radar name="目標" dataKey="target" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Radar name="実績" dataKey="actual" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 3: 販売力5仕組み */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-blue-800 mb-1">3. 販売力強化：営業が少なくても勝てる5つの仕組み</h2>
            <p className="text-sm text-blue-600">
              {salesMechanisms.filter(s => s.status === 'achieved').length}/{salesMechanisms.length} 達成
              ・{salesMechanisms.filter(s => s.status === 'in_progress').length} 進行中
            </p>
            <div className="mt-3 w-full bg-blue-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: `${salesMechanisms.length > 0 ? (salesMechanisms.filter(s => s.status === 'achieved').length / salesMechanisms.length * 100) : 0}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {salesMechanisms.map(s => (
              <StrategyCard key={s.id} strategy={s} config={SECTION_CONFIG.sales_mechanism} onStatusChange={updateStrategyStatus} />
            ))}
          </div>

          {/* MQ判定テーブル */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">MQ率別 受注判定ルール</h3>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-slate-50">
                <th className="p-3 border text-left">判定</th>
                <th className="p-3 border text-left">条件</th>
                <th className="p-3 border text-left">アクション</th>
              </tr></thead>
              <tbody>
                <tr className="bg-emerald-50"><td className="p-3 border font-bold text-emerald-700">即受注</td><td className="p-3 border">MQ率47%以上</td><td className="p-3 border">最優先対応</td></tr>
                <tr className="bg-blue-50"><td className="p-3 border font-bold text-blue-700">条件付き</td><td className="p-3 border">MQ率20〜46%</td><td className="p-3 border">単価交渉or仕様変更で47%以上に引き上げ</td></tr>
                <tr className="bg-yellow-50"><td className="p-3 border font-bold text-yellow-700">検討</td><td className="p-3 border">MQ率10〜19%</td><td className="p-3 border">増刷見込み・クロスセル可能性があれば受注</td></tr>
                <tr className="bg-red-50"><td className="p-3 border font-bold text-red-700">停止</td><td className="p-3 border">MQ率5%以下</td><td className="p-3 border">丁重にお断り。営業工数を高MQ案件に振替</td></tr>
              </tbody>
            </table>
          </div>

          {/* クロスセルマトリクス */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">5事業クロスセルマトリクス</h3>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-blue-50">
                <th className="p-3 border text-left">入口事業</th>
                <th className="p-3 border text-left">クロスセル先</th>
                <th className="p-3 border text-left">提案トーク例</th>
              </tr></thead>
              <tbody>
                <tr><td className="p-3 border font-medium">印刷</td><td className="p-3 border">クリエイティブ</td><td className="p-3 border text-slate-600">「デザインも一貫でお任せいただけると、校正回数が半分になります」</td></tr>
                <tr className="bg-slate-50"><td className="p-3 border font-medium">印刷</td><td className="p-3 border">物流</td><td className="p-3 border text-slate-600">「発送まで一括でやれば、御社の手間がゼロになります」</td></tr>
                <tr><td className="p-3 border font-medium">クリエイティブ</td><td className="p-3 border">SR事業</td><td className="p-3 border text-slate-600">「学会誌の編集ノウハウで、サステナビリティレポートも作れます」</td></tr>
                <tr className="bg-slate-50"><td className="p-3 border font-medium">SR事業</td><td className="p-3 border">セミナールーム</td><td className="p-3 border text-slate-600">「レポート発表会の会場もご用意できます」</td></tr>
                <tr><td className="p-3 border font-medium">セミナールーム</td><td className="p-3 border">印刷</td><td className="p-3 border text-slate-600">「研修資料の印刷もセットでお得になります」</td></tr>
              </tbody>
            </table>
          </div>

          {/* クロスセル対象Top5 */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">クロスセル対象 高利益顧客Top5</h3>
            <div className="space-y-3">
              {CROSS_SELL_TARGETS.map((t, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PriorityBadge level="A" />
                      <span className="font-bold">{t.name}</span>
                      <span className="text-sm text-blue-700">{t.revenue}百万円</span>
                      <span className="text-sm text-green-700">MQ {t.mqRate}%</span>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">担当: {t.assignee}</span>
                  </div>
                  <div className="text-sm bg-blue-50 rounded p-2 border border-blue-100 italic">{t.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 4: 顧客7打ち手 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-emerald-800 mb-1">4. 顧客数・受注数の底上げ：量を確保する7つの打ち手</h2>
            <p className="text-sm text-emerald-600">
              {customerMeasures.filter(s => s.status === 'achieved').length}/{customerMeasures.length} 達成
              ・{customerMeasures.filter(s => s.status === 'in_progress').length} 進行中
            </p>
            <div className="mt-3 w-full bg-emerald-200 rounded-full h-3">
              <div className="bg-emerald-600 h-3 rounded-full transition-all" style={{ width: `${customerMeasures.length > 0 ? (customerMeasures.filter(s => s.status === 'achieved').length / customerMeasures.length * 100) : 0}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {customerMeasures.map(s => (
              <StrategyCard key={s.id} strategy={s} config={SECTION_CONFIG.customer_measure} onStatusChange={updateStrategyStatus} />
            ))}
          </div>

          {/* 5事業入口テーブル */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">5事業を「5つの入口」にする設計</h3>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-emerald-50">
                <th className="p-3 border text-left">事業</th>
                <th className="p-3 border text-left">入口としての再設計</th>
                <th className="p-3 border text-left">期待される新規顧客</th>
              </tr></thead>
              <tbody>
                <tr><td className="p-3 border font-medium">セミナールーム</td><td className="p-3 border">環境・CSR関連の無料セミナー開催</td><td className="p-3 border text-slate-600">CSR担当者 → SR事業の見込み客</td></tr>
                <tr className="bg-slate-50"><td className="p-3 border font-medium">SR事業</td><td className="p-3 border">「初回サステナビリティ診断 無料」を掲げる</td><td className="p-3 border text-slate-600">ESG対応に困っている中堅企業</td></tr>
                <tr><td className="p-3 border font-medium">クリエイティブ</td><td className="p-3 border">業界団体・学会向けの「編集相談会」</td><td className="p-3 border text-slate-600">会報・学会誌の制作を検討中の団体</td></tr>
                <tr className="bg-slate-50"><td className="p-3 border font-medium">物流</td><td className="p-3 border">「発送代行 お試しパック」（初回限定）</td><td className="p-3 border text-slate-600">印刷は自前だが発送が面倒な企業</td></tr>
                <tr><td className="p-3 border font-medium">印刷</td><td className="p-3 border">環境配慮印刷の「見える化」提案営業</td><td className="p-3 border text-slate-600">GP認定・大臣賞の訴求で差別化</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 5: コスト最適化 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'cost' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-amber-800 mb-1">5. コスト最適化：黒字になる仕組み</h2>
            <p className="text-sm text-amber-600">
              {costOptimizations.filter(s => s.status === 'achieved').length}/{costOptimizations.length} 達成
              ・{costOptimizations.filter(s => s.status === 'in_progress').length} 進行中
            </p>
            <div className="mt-3 w-full bg-amber-200 rounded-full h-3">
              <div className="bg-amber-600 h-3 rounded-full transition-all" style={{ width: `${costOptimizations.length > 0 ? (costOptimizations.filter(s => s.status === 'achieved').length / costOptimizations.length * 100) : 0}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {costOptimizations.map(s => (
              <StrategyCard key={s.id} strategy={s} config={SECTION_CONFIG.cost_optimization} onStatusChange={updateStrategyStatus} />
            ))}
          </div>

          {/* F層別管理テーブル */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">F（固定費）層別管理目標</h3>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-amber-50">
                <th className="p-3 border text-left">費目</th>
                <th className="p-3 border text-left">現状の問題</th>
                <th className="p-3 border text-left">打ち手</th>
                <th className="p-3 border text-left">目標</th>
              </tr></thead>
              <tbody>
                <tr><td className="p-3 border font-medium">人件費</td><td className="p-3 border">売上規模に対して過大</td><td className="p-3 border">多能工化（1人2〜3ポジション対応）</td><td className="p-3 border font-bold text-amber-700">人件費率 -3pt</td></tr>
                <tr className="bg-slate-50"><td className="p-3 border font-medium">メンテナンス費</td><td className="p-3 border">コントロール不足</td><td className="p-3 border">週次で実績管理、月≦50万を厳守</td><td className="p-3 border font-bold text-amber-700">年間600万以内</td></tr>
                <tr><td className="p-3 border font-medium">間接費</td><td className="p-3 border">5事業の管理コスト重複</td><td className="p-3 border">バックオフィス共通化・AI活用で事務工数削減</td><td className="p-3 border font-bold text-amber-700">間接費率 -2pt</td></tr>
                <tr className="bg-slate-50"><td className="p-3 border font-medium">採用費</td><td className="p-3 border">退職→補充の繰り返し</td><td className="p-3 border">PAが退職しない環境整備（宮川モデル）</td><td className="p-3 border font-bold text-amber-700">年間採用費50%削減</td></tr>
              </tbody>
            </table>
          </div>

          {/* 価格改定通知案 */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">赤字案件 価格改定通知案 ─ 顧客別ドラフト</h3>
            {PRICE_REVISION_DRAFTS.map((d, i) => (
              <div key={i} className="mb-6 border-2 border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-3 flex items-center justify-between">
                  <span className="font-bold text-red-800">
                    {i + 1}. {d.customer} ─ {d.item}（MQ率 {d.mqRate}%）
                  </span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">担当: {d.rep}</span>
                </div>
                <div className="p-4">
                  {d.pq > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div><span className="text-slate-500">PQ:</span> <span className="font-medium">{formatMan(d.pq)}</span></div>
                      <div><span className="text-slate-500">VQ:</span> <span className="font-medium">{formatMan(d.vq)}</span></div>
                      <div><span className="text-slate-500">MQ率:</span> <span className="font-medium text-red-600">{d.mqRate}%</span></div>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-4 border text-sm whitespace-pre-line text-slate-800 leading-relaxed">
                    {d.draft}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 6: 90日アクションプラン */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-emerald-800 mb-1">6. 90日アクションプラン</h2>
            <p className="text-sm text-emerald-600">3フェーズ {actionItems.length}タスク — 完了 {completedActions} / 進行中 {inProgressActions} / 未着手 {actionItems.length - completedActions - inProgressActions}</p>
            <div className="mt-3 w-full bg-emerald-200 rounded-full h-3">
              <div className="bg-emerald-600 h-3 rounded-full transition-all" style={{ width: `${actionItems.length > 0 ? (completedActions / actionItems.length * 100) : 0}%` }} />
            </div>
          </div>

          {[
            { phase: 1, items: phase1Items, label: 'Phase 1: 止血と可視化（Day 1〜30）', borderColor: 'border-red-300', bgColor: 'bg-red-50', textColor: 'text-red-800' },
            { phase: 2, items: phase2Items, label: 'Phase 2: 仕組みの構築（Day 31〜60）', borderColor: 'border-amber-300', bgColor: 'bg-amber-50', textColor: 'text-amber-800' },
            { phase: 3, items: phase3Items, label: 'Phase 3: 検証と調整（Day 61〜90）', borderColor: 'border-blue-300', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
          ].map(({ phase, items, label, borderColor, bgColor, textColor }) => (
            <div key={phase} className="bg-white rounded-2xl shadow-sm border p-5">
              <div className={`${bgColor} ${borderColor} border-2 rounded-xl p-3 mb-4`}>
                <h3 className={`font-bold ${textColor}`}>{label}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {items.filter(a => a.status === 'completed').length}/{items.length} 完了
                </p>
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const cat = CATEGORY_LABELS[item.category] || { label: item.category, color: 'bg-slate-100 text-slate-600', icon: '📋' };
                  const statusOpt = [
                    { value: 'not_started', label: '未着手', color: 'bg-slate-100 text-slate-600' },
                    { value: 'in_progress', label: '進行中', color: 'bg-blue-100 text-blue-700' },
                    { value: 'completed', label: '完了', color: 'bg-emerald-100 text-emerald-700' },
                  ];
                  const currentStatus = statusOpt.find(s => s.value === item.status) || statusOpt[0];
                  return (
                    <div key={item.id} className={`border rounded-lg p-4 transition-all ${item.status === 'completed' ? 'bg-emerald-50 border-emerald-200 opacity-75' : 'bg-white hover:shadow-md'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.icon} {cat.label}</span>
                            <span className="text-xs text-slate-400">Day {item.start_day}〜{item.end_day}</span>
                            {item.owner_name && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.owner_name}</span>}
                          </div>
                          <h4 className={`font-bold text-sm ${item.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.title}</h4>
                          {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                          {item.target_metric && (
                            <div className="mt-2 text-xs">
                              <span className="text-slate-500">目標: </span>
                              <span className="font-medium text-slate-700">{item.target_metric}</span>
                              {item.target_value != null && <span className="ml-1 text-blue-600">{item.target_value}{item.unit || ''}</span>}
                              {item.actual_value != null && item.actual_value > 0 && (
                                <span className="ml-2 text-emerald-600">→ 実績 {item.actual_value}{item.unit || ''}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <select
                          value={item.status}
                          onChange={e => updateActionStatus(item.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-semibold border-0 cursor-pointer ${currentStatus.color}`}
                        >
                          {statusOpt.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-sm text-slate-400 text-center py-4">このフェーズにはタスクがありません</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 7: MQ率一覧 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'mq_list' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              全案件 MQ率一覧（斉藤除外・Supabaseライブデータ・{mqOrders.length}件）
            </h2>

            <h3 className="font-bold text-red-700 mt-4 mb-3 flex items-center gap-2">
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs">停止</span>
              MQ率5%以下：{mqUnder5.length}件 ─ 即停止 or 価格改定必須
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mb-6">
                <thead><tr className="bg-red-50">
                  <th className="p-2 border text-left">注文#</th><th className="p-2 border text-left">顧客名</th><th className="p-2 border text-left">案件名</th>
                  <th className="p-2 border text-right">PQ(万)</th><th className="p-2 border text-right">VQ(万)</th><th className="p-2 border text-right">MQ(万)</th>
                  <th className="p-2 border text-right">MQ率</th><th className="p-2 border text-left">担当</th>
                </tr></thead>
                <tbody>
                  {mqUnder5.map((o, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                      <td className="p-2 border">{o.order_code}</td><td className="p-2 border font-medium">{o.customer_name}</td>
                      <td className="p-2 border">{o.item_name}</td>
                      <td className="p-2 border text-right">{formatMan(Number(o.estimate_pq))}</td>
                      <td className="p-2 border text-right">{formatMan(Number(o.estimate_vq))}</td>
                      <td className="p-2 border text-right text-red-600 font-bold">{formatMan(Number(o.estimate_mq))}</td>
                      <td className="p-2 border text-right text-red-600 font-bold">{o.mq_rate}%</td>
                      <td className="p-2 border">{o.sales_rep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-bold text-orange-700 mt-6 mb-3 flex items-center gap-2">
              <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs">注意</span>
              MQ率5-10%：{mq5to10.length}件
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mb-6">
                <thead><tr className="bg-orange-50">
                  <th className="p-2 border text-left">注文#</th><th className="p-2 border text-left">顧客名</th><th className="p-2 border text-left">案件名</th>
                  <th className="p-2 border text-right">PQ(万)</th><th className="p-2 border text-right">MQ率</th><th className="p-2 border text-left">担当</th>
                </tr></thead>
                <tbody>
                  {mq5to10.map((o, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                      <td className="p-2 border">{o.order_code}</td><td className="p-2 border font-medium">{o.customer_name}</td>
                      <td className="p-2 border">{o.item_name}</td>
                      <td className="p-2 border text-right">{formatMan(Number(o.estimate_pq))}</td>
                      <td className="p-2 border text-right text-orange-600 font-bold">{o.mq_rate}%</td>
                      <td className="p-2 border">{o.sales_rep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-bold text-yellow-700 mt-6 mb-3 flex items-center gap-2">
              <span className="bg-yellow-400 text-gray-900 px-2 py-0.5 rounded text-xs">検討</span>
              MQ率10-20%：{mq10to20.length}件
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-yellow-50">
                  <th className="p-2 border text-left">注文#</th><th className="p-2 border text-left">顧客名</th><th className="p-2 border text-left">案件名</th>
                  <th className="p-2 border text-right">PQ(万)</th><th className="p-2 border text-right">MQ率</th><th className="p-2 border text-left">担当</th>
                </tr></thead>
                <tbody>
                  {mq10to20.map((o, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
                      <td className="p-2 border">{o.order_code}</td><td className="p-2 border font-medium">{o.customer_name}</td>
                      <td className="p-2 border">{o.item_name}</td>
                      <td className="p-2 border text-right">{formatMan(Number(o.estimate_pq))}</td>
                      <td className="p-2 border text-right text-yellow-700 font-bold">{o.mq_rate}%</td>
                      <td className="p-2 border">{o.sales_rep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
              <span className="font-bold text-blue-700">ポイント：</span> MQ5%以下{mqUnder5.length}件は今週中に価格改定通知。5-10%の{mq5to10.length}件は来週中に交渉開始。10-20%の{mq10to20.length}件はPhase1-2で順次改善。
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="font-bold text-slate-800 mb-3">MQ率帯別 受注分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { band: '5%以下', orders: mqUnder5.length, color: '#dc2626' },
                { band: '5-10%', orders: mq5to10.length, color: '#f97316' },
                { band: '10-20%', orders: mq10to20.length, color: '#eab308' },
              ]} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: '件数', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" name="案件数">
                  {[{ color: '#dc2626' }, { color: '#f97316' }, { color: '#eab308' }].map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 8: 顧客奪還 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'recovery' && (
        <div className="space-y-6">
          {/* 連絡アクション */}
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-red-800 mb-1">顧客奪還 ─ 連絡アクション</h2>
            <p className="text-sm text-red-600">Supabaseデータに基づく優先度付き連絡先マトリクス。</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-xs text-slate-500">奪還対象</p>
              <p className="text-2xl font-bold text-slate-800">{recoveryTargets.length}社</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-xs text-slate-500">消失売上合計</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRecoveryTarget)}<span className="text-xs text-slate-400">/年</span></p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-xs text-slate-500">奪還済み</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRecovered)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <p className="text-xs text-slate-500">連絡進捗</p>
              <p className="text-2xl font-bold text-blue-600">{contactedCount}/{recoveryTargets.length}</p>
            </div>
          </div>

          {/* 連絡スクリプト付きリスト */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h3 className="text-lg font-bold text-orange-700 mb-3">休眠顧客への架電（{recoveryTargets.length}社）</h3>
            <div className="space-y-3">
              {recoveryTargets.map((r, i) => {
                const script = Object.entries(RECOVERY_SCRIPTS).find(([k]) => r.customer_name.includes(k))?.[1];
                const cs = CONTACT_STATUS_LABELS[r.contact_status] || CONTACT_STATUS_LABELS.not_contacted;
                return (
                  <div key={i} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PriorityBadge level={script?.priority || (r.priority <= 1 ? 'S' : r.priority <= 2 ? 'A' : 'B')} />
                        <span className="font-bold text-slate-800">{r.customer_name}</span>
                        <span className="text-sm text-blue-700 font-medium">{formatCurrency(r.previous_annual_revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={r.contact_status} onChange={e => updateRecoveryStatus(r.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-semibold border-0 ${cs.color}`}>
                          {Object.entries(CONTACT_STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                        </select>
                        {script && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">担当: {script.assignee}</span>}
                      </div>
                    </div>
                    {script && (
                      <>
                        <div className="text-sm mb-1"><span className="font-medium text-slate-700">方法: </span><span className="text-blue-600">{script.action}</span><span className="ml-2 text-slate-400">{script.timing}</span></div>
                        <div className="text-sm bg-blue-50 rounded p-2 border border-blue-100 italic text-slate-700">{script.message}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 奪還テーブル */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-3 font-semibold">優先度</th>
                  <th className="text-left p-3 font-semibold">顧客名</th>
                  <th className="text-right p-3 font-semibold">2024年売上</th>
                  <th className="text-center p-3 font-semibold">ステータス</th>
                  <th className="text-left p-3 font-semibold">離脱理由</th>
                  <th className="text-left p-3 font-semibold">メモ</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recoveryTargets.map(r => {
                    const cs = CONTACT_STATUS_LABELS[r.contact_status] || CONTACT_STATUS_LABELS.not_contacted;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            r.priority <= 1 ? 'bg-red-100 text-red-700' : r.priority <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>{r.priority}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{r.customer_name}</td>
                        <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(r.previous_annual_revenue)}</td>
                        <td className="p-3 text-center">
                          <select value={r.contact_status} onChange={e => updateRecoveryStatus(r.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full font-semibold border-0 ${cs.color}`}>
                            {Object.entries(CONTACT_STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                          </select>
                        </td>
                        <td className="p-3">
                          {editingRecovery === `${r.id}_reason` ? (
                            <form onSubmit={e => { e.preventDefault(); updateRecoveryNotes(r.id, 'loss_reason', new FormData(e.currentTarget).get('val') as string); }} className="flex gap-1">
                              <input name="val" defaultValue={r.loss_reason || ''} className="w-28 text-xs border rounded px-1 py-0.5" autoFocus />
                              <button type="submit" className="text-xs text-blue-600">✓</button>
                            </form>
                          ) : (
                            <button onClick={() => setEditingRecovery(`${r.id}_reason`)} className="text-xs text-slate-500 hover:text-slate-800">
                              {r.loss_reason || 'クリックで入力'}
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          {editingRecovery === `${r.id}_notes` ? (
                            <form onSubmit={e => { e.preventDefault(); updateRecoveryNotes(r.id, 'notes', new FormData(e.currentTarget).get('val') as string); }} className="flex gap-1">
                              <input name="val" defaultValue={r.notes || ''} className="w-28 text-xs border rounded px-1 py-0.5" autoFocus />
                              <button type="submit" className="text-xs text-blue-600">✓</button>
                            </form>
                          ) : (
                            <button onClick={() => setEditingRecovery(`${r.id}_notes`)} className="text-xs text-slate-500 hover:text-slate-800">
                              {r.notes || 'クリックで入力'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Tab 9: 設計経営 */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 'design' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-purple-800 mb-1">8. 文唱堂印刷版「設計経営」の完成形</h2>
            <p className="text-sm text-purple-600">設計経営 ＝ 「顧客数(Q) × 単価(P) × MQ率 - 固定費(F)」の四位一体</p>
          </div>

          {/* 数式ビジュアル */}
          <div className="bg-slate-900 text-white rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-400 mb-2">設計経営の公式</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-wide">
              <span className="text-emerald-400">G</span>
              <span className="text-slate-500 mx-2">=</span>
              <span className="text-blue-400">Q</span>
              <span className="text-slate-500 mx-1">×</span>
              <span className="text-amber-400">P</span>
              <span className="text-slate-500 mx-1">×</span>
              <span className="text-purple-400">MQ率</span>
              <span className="text-slate-500 mx-2">−</span>
              <span className="text-red-400">F</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 text-sm">
              <div><span className="text-emerald-400 font-bold">G</span><span className="text-slate-400"> = 利益</span></div>
              <div><span className="text-blue-400 font-bold">Q</span><span className="text-slate-400"> = 受注数</span></div>
              <div><span className="text-amber-400 font-bold">P</span><span className="text-slate-400"> = 単価</span></div>
              <div><span className="text-purple-400 font-bold">MQ率</span><span className="text-slate-400"> = 限界利益率</span></div>
              <div><span className="text-red-400 font-bold">F</span><span className="text-slate-400"> = 固定費</span></div>
            </div>
          </div>

          {/* 4変数カード */}
          <div className="space-y-4">
            {designVars.map(s => (
              <StrategyCard key={s.id} strategy={s} config={SECTION_CONFIG.design_management} onStatusChange={updateStrategyStatus} />
            ))}
          </div>

          {/* 現在値 → 目標値 */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">現在値 → 目標値</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Q（年間受注数）</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">2,437</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-bold text-blue-700">2,800</span>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs text-amber-600 font-medium mb-1">P（平均単価）</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">496千円</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-bold text-amber-700">600千円</span>
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <p className="text-xs text-purple-600 font-medium mb-1">MQ率</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">32.8%</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-bold text-purple-700">47%+</span>
                </div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">F（年間固定費）</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">180百万</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-lg font-bold text-red-700">160百万</span>
                </div>
              </div>
            </div>
          </div>

          {/* 最終目標 */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-3">最終目標</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/20 rounded-xl p-4">
                <p className="text-sm text-emerald-100">営業利益率</p>
                <p className="text-4xl font-bold">12%</p>
                <p className="text-xs text-emerald-200 mt-1">宮川赤坂店の営業利益率12%目標を全社に適用</p>
              </div>
              <div className="bg-white/20 rounded-xl p-4">
                <p className="text-sm text-emerald-100">営業キャッシュフロー</p>
                <p className="text-4xl font-bold">黒字化</p>
                <p className="text-xs text-emerald-200 mt-1">前受金・請求サイト短縮・在庫圧縮で実現</p>
              </div>
            </div>
          </div>

          {/* 核心メッセージ再掲 */}
          <div className="bg-slate-900 text-white rounded-2xl p-6">
            <p className="text-base leading-relaxed text-center">
              宮川商店は焼鳥屋として、文唱堂は印刷会社として、業種は違えど<br />
              <strong className="text-amber-400">「少数精鋭で承認欲求を満たし、高付加価値で利益を出す」</strong><br />
              という構造は完全に同じ。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnaroundPlanPage;
