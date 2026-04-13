import * as React from 'react';
import { getSupabase } from '../services/supabaseClient';

/* ─── Interfaces ─── */
interface Strategy {
  id: string;
  section: string;
  sort_order: number;
  title: string;
  subtitle: string;
  description: string;
  target_metric: string | null;
  target_value: string | null;
  actual_value: string | null;
  status: string;
  owner: string | null;
  due_date: string | null;
  notes: string | null;
}

interface Benchmark {
  id: string;
  indicator: string;
  miyakawa_value: string;
  bunshodo_implication: string;
  sort_order: number;
}

interface KpiTarget {
  id: string;
  pillar: string;
  pillar_name: string;
  kpi_name: string;
  target_month: string;
  target_value: number;
  actual_value: number;
  unit: string;
  status: string;
  owner: string;
  notes: string | null;
}

interface RecoveryTarget {
  id: string;
  customer_name: string;
  previous_annual_revenue: number;
  contact_status: string;
  contact_date: string | null;
  contact_by: string | null;
  loss_reason: string | null;
  recovery_plan: string | null;
  recovered_revenue: number;
  priority: number;
  notes: string | null;
}

interface ActionItem {
  id: string;
  phase: number;
  phase_label: string;
  title: string;
  description: string | null;
  category: string;
  start_day: number;
  end_day: number;
  due_date: string | null;
  owner_name: string | null;
  target_metric: string | null;
  target_value: string | null;
  status: string;
}

interface MqOrder {
  order_id: string;
  project_name: string;
  sales_amount: number;
  variable_cost_amount: number;
  mq_amount: number;
  mq_rate: number;
}

/* ─── Constants ─── */
type TabKey = 'overview' | 'disease' | 'miyakawa' | 'sales' | 'customers' | 'cost' | 'actions' | 'benchmarks' | 'design';

const TAB_CONFIG: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: '全体像', icon: '🏠' },
  { key: 'disease', label: '3病巣', icon: '🔍' },
  { key: 'miyakawa', label: '宮川3原則', icon: '📐' },
  { key: 'sales', label: '販売力5仕組み', icon: '⚡' },
  { key: 'customers', label: '顧客7打ち手', icon: '🎯' },
  { key: 'cost', label: 'コスト最適化', icon: '✂️' },
  { key: 'actions', label: '90日計画', icon: '📅' },
  { key: 'benchmarks', label: '宮川BM', icon: '📊' },
  { key: 'design', label: '設計経営', icon: '🧮' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: '未着手', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
  achieved: { label: '達成', color: 'bg-emerald-100 text-emerald-700' },
  behind: { label: '遅延', color: 'bg-red-100 text-red-700' },
  completed: { label: '完了', color: 'bg-emerald-100 text-emerald-700' },
};

const CONTACT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_contacted: { label: '未連絡', color: 'bg-slate-100 text-slate-600' },
  contacted: { label: '連絡済', color: 'bg-blue-100 text-blue-700' },
  meeting_set: { label: '面談設定', color: 'bg-indigo-100 text-indigo-700' },
  proposal_sent: { label: '提案中', color: 'bg-amber-100 text-amber-700' },
  recovered: { label: '奪還成功', color: 'bg-emerald-100 text-emerald-700' },
  declined: { label: '辞退', color: 'bg-red-100 text-red-700' },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  mq_improvement: { label: 'MQ改善', color: 'bg-rose-100 text-rose-700' },
  customer_acquisition: { label: '顧客獲得', color: 'bg-blue-100 text-blue-700' },
  cost_reduction: { label: 'コスト削減', color: 'bg-amber-100 text-amber-700' },
  system_building: { label: '仕組み構築', color: 'bg-purple-100 text-purple-700' },
  pipeline_management: { label: '案件管理', color: 'bg-emerald-100 text-emerald-700' },
  measurement: { label: '計測・検証', color: 'bg-indigo-100 text-indigo-700' },
};

const SECTION_ICONS: Record<string, string> = {
  disease: '🔍',
  miyakawa_principle: '📐',
  sales_mechanism: '⚡',
  customer_measure: '🎯',
  cost_optimization: '✂️',
  design_management: '🧮',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);

/* ─── Strategy Card Component ─── */
const StrategyCard: React.FC<{
  strategy: Strategy;
  onStatusChange: (id: string, status: string) => void;
}> = ({ strategy, onStatusChange }) => {
  const st = STATUS_LABELS[strategy.status] || STATUS_LABELS.not_started;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{strategy.subtitle}</span>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{strategy.title}</h4>
        </div>
        <select
          value={strategy.status}
          onChange={e => onStatusChange(strategy.id, e.target.value)}
          className={`text-[10px] px-2 py-1 rounded-full font-semibold border-0 cursor-pointer ${st.color}`}
        >
          {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed mb-3">{strategy.description}</p>
      {strategy.target_metric && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400">目標指標:</span>
          <span className="text-xs font-semibold text-blue-700">{strategy.target_metric}</span>
          {strategy.target_value && (
            <>
              <span className="text-[10px] text-slate-400">→</span>
              <span className="text-xs font-bold text-emerald-700">{strategy.target_value}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Section Header Component ─── */
const SectionHeader: React.FC<{ icon: string; title: string; subtitle: string; count?: number }> = ({ icon, title, subtitle, count }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-2xl">{icon}</span>
    <div>
      <h2 className="text-lg font-bold text-slate-800">{title}{count !== undefined && <span className="text-slate-400 text-sm ml-2">({count})</span>}</h2>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  </div>
);

/* ─── Main Component ─── */
const TurnaroundPlanPage: React.FC = () => {
  const [strategies, setStrategies] = React.useState<Strategy[]>([]);
  const [benchmarks, setBenchmarks] = React.useState<Benchmark[]>([]);
  const [kpis, setKpis] = React.useState<KpiTarget[]>([]);
  const [recoveryTargets, setRecoveryTargets] = React.useState<RecoveryTarget[]>([]);
  const [actionItems, setActionItems] = React.useState<ActionItem[]>([]);
  const [mqOrders, setMqOrders] = React.useState<MqOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabKey>('overview');
  const [editingRecovery, setEditingRecovery] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const [stratRes, bmRes, kpiRes, recRes, actRes, mqRes] = await Promise.all([
        supabase.from('turnaround_strategies').select('*').order('section').order('sort_order'),
        supabase.from('miyakawa_benchmarks').select('*').order('sort_order'),
        supabase.from('turnaround_kpi_targets').select('*').order('target_month', { ascending: true }),
        supabase.from('customer_recovery_targets').select('*').order('priority', { ascending: true }),
        supabase.from('action_plan_items').select('*').order('phase').order('start_day'),
        supabase.from('orders_list_view').select('order_id,project_name,sales_amount,variable_cost_amount,mq_amount,mq_rate').order('mq_rate', { ascending: true }).limit(50),
      ]);
      if (stratRes.data) setStrategies(stratRes.data);
      if (bmRes.data) setBenchmarks(bmRes.data);
      if (kpiRes.data) setKpis(kpiRes.data);
      if (recRes.data) setRecoveryTargets(recRes.data);
      if (actRes.data) setActionItems(actRes.data);
      if (mqRes.data) setMqOrders(mqRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  /* ─── Derived data ─── */
  const strategyBySection = React.useMemo(() => {
    const map: Record<string, Strategy[]> = {};
    strategies.forEach(s => {
      if (!map[s.section]) map[s.section] = [];
      map[s.section].push(s);
    });
    return map;
  }, [strategies]);

  const diseases = strategyBySection['disease'] || [];
  const miyakawaPrinciples = strategyBySection['miyakawa_principle'] || [];
  const salesMechanisms = strategyBySection['sales_mechanism'] || [];
  const customerMeasures = strategyBySection['customer_measure'] || [];
  const costOptimizations = strategyBySection['cost_optimization'] || [];
  const designManagement = strategyBySection['design_management'] || [];

  const totalRecoveryTarget = recoveryTargets.reduce((s, r) => s + r.previous_annual_revenue, 0);
  const totalRecovered = recoveryTargets.reduce((s, r) => s + r.recovered_revenue, 0);
  const contactedCount = recoveryTargets.filter(r => r.contact_status !== 'not_contacted').length;
  const recoveredCount = recoveryTargets.filter(r => r.contact_status === 'recovered').length;

  const actionsByPhase = React.useMemo(() => {
    const map: Record<number, ActionItem[]> = {};
    actionItems.forEach(a => {
      if (!map[a.phase]) map[a.phase] = [];
      map[a.phase].push(a);
    });
    return map;
  }, [actionItems]);

  const completedStrategies = strategies.filter(s => s.status === 'achieved' || s.status === 'completed').length;
  const inProgressStrategies = strategies.filter(s => s.status === 'in_progress').length;
  const completedActions = actionItems.filter(a => a.status === 'completed' || a.status === 'achieved').length;

  /* ─── Handlers ─── */
  const updateStrategyStatus = async (id: string, status: string) => {
    const supabase = getSupabase();
    await supabase.from('turnaround_strategies').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setStrategies(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateActionStatus = async (id: string, status: string) => {
    const supabase = getSupabase();
    const update: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    await supabase.from('action_plan_items').update(update).eq('id', id);
    setActionItems(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-mono text-amber-400 tracking-widest mb-1">TURNAROUND PLAN</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">文唱堂印刷 黒字転換プラン</h1>
            <p className="text-slate-400 mt-2 text-sm">第85期 経営改善計画 — データドリブン経営ダッシュボード</p>
          </div>
          <div className="text-right space-y-1 hidden sm:block">
            <p className="text-[10px] text-slate-500">損益分岐売上 = 固定費 ÷ MQ率</p>
            <p className="text-xs text-slate-400">損益分岐売上</p>
            <p className="text-xl font-bold text-amber-400">¥1.2億/月</p>
            <p className="text-[10px] text-slate-500 mt-1">月商がこの金額を超えれば黒字</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400">戦略施策の総数</p>
            <p className="text-xs text-slate-300">全セクションの施策合計</p>
            <p className="text-2xl font-bold">{strategies.length}<span className="text-sm text-slate-400">件</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400">達成済み施策</p>
            <p className="text-xs text-slate-300">ステータスが「達成」の数</p>
            <p className="text-2xl font-bold text-emerald-400">{completedStrategies}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400">進行中施策</p>
            <p className="text-xs text-slate-300">現在取り組み中</p>
            <p className="text-2xl font-bold text-blue-400">{inProgressStrategies}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400">90日アクション</p>
            <p className="text-xs text-slate-300">完了数 / 全体</p>
            <p className="text-2xl font-bold">{completedActions}<span className="text-sm text-slate-400">/{actionItems.length}</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-[10px] text-slate-400">顧客奪還</p>
            <p className="text-xs text-slate-300">奪還成功数 / 対象数</p>
            <p className="text-2xl font-bold text-amber-400">{recoveredCount}<span className="text-sm text-slate-400">/{recoveryTargets.length}社</span></p>
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TAB_CONFIG.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB 1: 全体像 (Overview) ═══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Glossary */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
            <h3 className="text-sm font-bold text-indigo-800 mb-2">用語解説（このダッシュボードで使う主要指標）</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-indigo-700">
              <div><strong>PQ</strong> = 売上高（Price × Quantity）</div>
              <div><strong>VQ</strong> = 変動費合計（Variable cost × Quantity）</div>
              <div><strong>MQ</strong> = 限界利益（PQ − VQ）。売上から変動費を引いた利益</div>
              <div><strong>MQ率</strong> = MQ ÷ PQ × 100。売上に占める限界利益の割合</div>
              <div><strong>F</strong> = 固定費（人件費・賃料・設備費など売上に関係なく発生する費用）</div>
              <div><strong>G</strong> = 経常利益（MQ − F）。最終的に会社に残る利益</div>
            </div>
          </div>

          {/* Core Message */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
            <h3 className="text-sm font-bold text-amber-900 mb-2">核心メッセージ</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              「売上を上げて黒字にする」のではなく、<strong>「利益の出る仕事だけを選び、損益分岐点を下げて黒字にする」</strong>。
              宮川商店の実証データが示すとおり、MQ率47%以上の仕事を選べば、売上が半分でも利益は出る。
              文唱堂の武器は「5事業」と「千代田区の信用」。これを活かし、<strong>90日で止血 → 180日で仕組み化 → 365日で黒字転換</strong>を達成する。
            </p>
          </div>

          {/* 9 Section Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { tab: 'disease' as TabKey, icon: '🔍', title: '現状認識（3病巣）', items: diseases, desc: 'PQ問題・F問題・Q問題の3つの構造的病巣' },
              { tab: 'miyakawa' as TabKey, icon: '📐', title: '宮川3原則', items: miyakawaPrinciples, desc: 'やらない勇気・承認欲求・全員で覚える' },
              { tab: 'sales' as TabKey, icon: '⚡', title: '販売力5仕組み', items: salesMechanisms, desc: 'MQ分析・増刷設計・クロスセル・AI経営・紹介' },
              { tab: 'customers' as TabKey, icon: '🎯', title: '顧客7打ち手', items: customerMeasures, desc: '休眠掘起し・即レス・5入口・地域連携・Web・団体・感動' },
              { tab: 'cost' as TabKey, icon: '✂️', title: 'コスト最適化4施策', items: costOptimizations, desc: 'F層別・V管理・BEP引下げ・CF改善' },
              { tab: 'actions' as TabKey, icon: '📅', title: '90日アクションプラン', items: [], desc: `Phase1-3の${actionItems.length}アクション` },
              { tab: 'benchmarks' as TabKey, icon: '📊', title: '宮川ベンチマーク', items: [], desc: `${benchmarks.length}指標の実証データ` },
              { tab: 'design' as TabKey, icon: '🧮', title: '設計経営', items: designManagement, desc: 'G = Q × P × MQ率 − F の4変数を設計' },
            ].map(({ tab, icon, title, items, desc }) => {
              const total = tab === 'actions' ? actionItems.length : tab === 'benchmarks' ? benchmarks.length : items.length;
              const done = tab === 'actions'
                ? actionItems.filter(a => a.status === 'completed' || a.status === 'achieved').length
                : items.filter(i => i.status === 'achieved' || i.status === 'completed').length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:shadow-md transition-shadow hover:border-blue-300"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">{desc}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{done}/{total}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 設計経営 Formula */}
          <div className="bg-slate-900 rounded-xl p-5 text-white">
            <h3 className="text-sm font-bold text-amber-400 mb-3">設計経営の公式</h3>
            <div className="text-center py-4">
              <p className="text-2xl font-mono font-bold">G = Q × P × MQ率 − F</p>
              <p className="text-xs text-slate-400 mt-2">利益(G) = 受注数(Q) × 単価(P) × 限界利益率(MQ率) − 固定費(F)</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-400">Q（年間受注数）</p>
                <p className="text-[10px] text-slate-500">全案件の受注件数</p>
                <p className="text-lg font-bold">2,437件</p>
                <p className="text-[10px] text-emerald-400">→ 2,800件目標</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-400">P（平均単価）</p>
                <p className="text-[10px] text-slate-500">1案件あたりの平均売上</p>
                <p className="text-lg font-bold">¥496千</p>
                <p className="text-[10px] text-emerald-400">→ ¥600千目標</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-400">MQ率</p>
                <p className="text-[10px] text-slate-500">売上から変動費を引いた利益の割合</p>
                <p className="text-lg font-bold">32.8%</p>
                <p className="text-[10px] text-emerald-400">→ 47%+目標</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-400">F（年間固定費）</p>
                <p className="text-[10px] text-slate-500">人件費・賃料・設備費等の合計</p>
                <p className="text-lg font-bold">¥180百万</p>
                <p className="text-[10px] text-emerald-400">→ ¥160百万目標</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: 3病巣 (Disease) ═══════════════ */}
      {activeTab === 'disease' && (
        <div className="space-y-4">
          <SectionHeader icon="🔍" title="現状認識（3つの病巣）" subtitle="文唱堂の構造的な3つの問題点。ここを直さない限り一時的な売上増は意味がない" count={diseases.length} />
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-4">
            <p className="text-xs text-red-800">
              <strong>なぜ「病巣」と呼ぶか：</strong>
              これらは一時的な不調ではなく構造的な問題。売上を上げても、この3つが放置されていれば再び赤字に戻る。
              PQ（売上力）×F（コスト体質）×Q（顧客基盤）の三位一体で改善する必要がある。
            </p>
          </div>
          {diseases.map(s => (
            <StrategyCard key={s.id} strategy={s} onStatusChange={updateStrategyStatus} />
          ))}
        </div>
      )}

      {/* ═══════════════ TAB 3: 宮川3原則 ═══════════════ */}
      {activeTab === 'miyakawa' && (
        <div className="space-y-4">
          <SectionHeader icon="📐" title="宮川3原則" subtitle="宮川商店の実証済み経営メソッドを文唱堂に適用する3つの柱" count={miyakawaPrinciples.length} />
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4">
            <p className="text-xs text-blue-800">
              <strong>宮川商店とは：</strong>
              焼肉チェーン4店舗（赤坂・四ツ谷・豊洲・大手町）を展開。AI×データドリブン経営で
              赤坂店リピート率+8pt、四ツ谷店客単価7,400→8,300円、豊洲店売上前年比116%を実現。
              この手法を印刷業に転用する。
            </p>
          </div>
          {miyakawaPrinciples.map(s => (
            <StrategyCard key={s.id} strategy={s} onStatusChange={updateStrategyStatus} />
          ))}
        </div>
      )}

      {/* ═══════════════ TAB 4: 販売力5仕組み ═══════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <SectionHeader icon="⚡" title="販売力5仕組み" subtitle="「頑張る営業」ではなく「仕組みで売れる」体制を構築する5つの施策" count={salesMechanisms.length} />
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 mb-4">
            <p className="text-xs text-purple-800">
              <strong>ポイント：</strong>
              営業人数が限られる文唱堂では「仕組み」で売上を作る。MQ分析で利益の出る案件だけを選び、
              増刷で営業コストを抑え、5事業クロスセルで単価を上げ、AIで戦略を立て、紹介で新規を取る。
            </p>
          </div>
          {salesMechanisms.map(s => (
            <StrategyCard key={s.id} strategy={s} onStatusChange={updateStrategyStatus} />
          ))}
          {/* MQ Rate Distribution */}
          {mqOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">MQ率分布（低MQ率案件 Top50）</h3>
              <p className="text-[10px] text-slate-500 mb-3">MQ率 = (売上 − 変動費) ÷ 売上 × 100。47%以上が即受注ライン</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {mqOrders.map((o, i) => {
                  const rate = o.mq_rate ?? 0;
                  const color = rate <= 5 ? 'bg-red-500' : rate <= 10 ? 'bg-orange-500' : rate <= 20 ? 'bg-amber-500' : rate <= 46 ? 'bg-blue-500' : 'bg-emerald-500';
                  const label = rate <= 5 ? '停止' : rate <= 10 ? '交渉' : rate <= 20 ? '改善' : rate <= 46 ? '条件付' : '即受注';
                  return (
                    <div key={o.order_id || i} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate text-slate-600">{o.project_name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 relative">
                        <div className={`${color} h-3 rounded-full`} style={{ width: `${Math.min(100, Math.max(2, rate * 2))}%` }} />
                      </div>
                      <span className="w-12 text-right font-mono font-bold">{rate.toFixed(1)}%</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${color} text-white`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 5: 顧客7打ち手 ═══════════════ */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <SectionHeader icon="🎯" title="顧客7打ち手" subtitle="顧客基盤を再構築するための7つの具体的アクション" count={customerMeasures.length} />
          {customerMeasures.map(s => (
            <StrategyCard key={s.id} strategy={s} onStatusChange={updateStrategyStatus} />
          ))}

          {/* Recovery Targets Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-1">離脱顧客 奪還リスト</h3>
            <p className="text-[10px] text-slate-500 mb-3">過去の取引額が大きい順に並んだ離脱顧客。ステータスを変更して進捗管理</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">奪還対象 = 過去取引があり現在離脱中の顧客数</p>
                <p className="text-xl font-bold text-slate-800">{recoveryTargets.length}社</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">消失売上 = 離脱顧客の過去年間取引額合計</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalRecoveryTarget)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">奪還済み = 再取引が確定した売上額</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalRecovered)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">連絡進捗 = 何社にアプローチしたか</p>
                <p className="text-xl font-bold text-blue-600">{contactedCount}/{recoveryTargets.length}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs">
                    <th className="text-left p-2 font-semibold">優先</th>
                    <th className="text-left p-2 font-semibold">顧客名</th>
                    <th className="text-right p-2 font-semibold">過去売上</th>
                    <th className="text-center p-2 font-semibold">ステータス</th>
                    <th className="text-left p-2 font-semibold">離脱理由</th>
                    <th className="text-left p-2 font-semibold">メモ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recoveryTargets.map(r => {
                    const cs = CONTACT_STATUS_LABELS[r.contact_status] || CONTACT_STATUS_LABELS.not_contacted;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            r.priority <= 1 ? 'bg-red-100 text-red-700' : r.priority <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>{r.priority}</span>
                        </td>
                        <td className="p-2 font-semibold text-slate-800 text-xs">{r.customer_name}</td>
                        <td className="p-2 text-right font-mono text-slate-700 text-xs">{formatCurrency(r.previous_annual_revenue)}</td>
                        <td className="p-2 text-center">
                          <select
                            value={r.contact_status}
                            onChange={e => updateRecoveryStatus(r.id, e.target.value)}
                            className={`text-[10px] px-2 py-1 rounded-full font-semibold border-0 ${cs.color}`}
                          >
                            {Object.entries(CONTACT_STATUS_LABELS).map(([v, { label }]) => (
                              <option key={v} value={v}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          {editingRecovery === `${r.id}_reason` ? (
                            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateRecoveryNotes(r.id, 'loss_reason', fd.get('val') as string); }} className="flex gap-1">
                              <input name="val" defaultValue={r.loss_reason || ''} className="w-28 text-xs border rounded px-1 py-0.5" autoFocus />
                              <button type="submit" className="text-xs text-blue-600">✓</button>
                            </form>
                          ) : (
                            <button onClick={() => setEditingRecovery(`${r.id}_reason`)} className="text-[10px] text-slate-500 hover:text-slate-800">
                              {r.loss_reason || 'クリックで入力'}
                            </button>
                          )}
                        </td>
                        <td className="p-2">
                          {editingRecovery === `${r.id}_notes` ? (
                            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateRecoveryNotes(r.id, 'notes', fd.get('val') as string); }} className="flex gap-1">
                              <input name="val" defaultValue={r.notes || ''} className="w-28 text-xs border rounded px-1 py-0.5" autoFocus />
                              <button type="submit" className="text-xs text-blue-600">✓</button>
                            </form>
                          ) : (
                            <button onClick={() => setEditingRecovery(`${r.id}_notes`)} className="text-[10px] text-slate-500 hover:text-slate-800">
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

      {/* ═══════════════ TAB 6: コスト最適化4施策 ═══════════════ */}
      {activeTab === 'cost' && (
        <div className="space-y-4">
          <SectionHeader icon="✂️" title="コスト最適化4施策" subtitle="F（固定費）とV（変動費）を構造的に削減し損益分岐点を引き下げる" count={costOptimizations.length} />
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
            <p className="text-xs text-amber-800">
              <strong>考え方：</strong>
              「売上を上げて黒字」ではなく「損益分岐点を下げて黒字」。固定費5%削減で損益分岐点売上が約7-8%下がる。
              同時にMQ率改善で同じ売上でも利益が残る構造に変える。
            </p>
          </div>
          {costOptimizations.map(s => (
            <StrategyCard key={s.id} strategy={s} onStatusChange={updateStrategyStatus} />
          ))}
        </div>
      )}

      {/* ═══════════════ TAB 7: 90日アクションプラン ═══════════════ */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          <SectionHeader icon="📅" title="90日アクションプラン" subtitle="3フェーズ×具体的タスク。チェックを付けて進捗管理" count={actionItems.length} />
          {[1, 2, 3].map(phase => {
            const items = actionsByPhase[phase] || [];
            if (items.length === 0) return null;
            const phaseLabel = items[0]?.phase_label || `Phase ${phase}`;
            const phaseColors = phase === 1 ? 'border-red-400 bg-red-50' : phase === 2 ? 'border-blue-400 bg-blue-50' : 'border-emerald-400 bg-emerald-50';
            const phaseDays = phase === 1 ? '1-30日目' : phase === 2 ? '31-60日目' : '61-90日目';
            const completedInPhase = items.filter(i => i.status === 'completed' || i.status === 'achieved').length;
            return (
              <div key={phase} className={`rounded-xl border-l-4 ${phaseColors} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{phaseLabel}</h3>
                    <p className="text-[10px] text-slate-500">{phaseDays} — {items.length}アクション</p>
                  </div>
                  <span className="text-xs font-bold text-slate-600">{completedInPhase}/{items.length} 完了</span>
                </div>
                <div className="space-y-2">
                  {items.map(item => {
                    const cat = CATEGORY_LABELS[item.category] || { label: item.category, color: 'bg-slate-100 text-slate-600' };
                    const st = STATUS_LABELS[item.status] || STATUS_LABELS.not_started;
                    return (
                      <div key={item.id} className="bg-white rounded-lg p-3 flex items-center gap-3 border border-slate-100">
                        <select
                          value={item.status}
                          onChange={e => updateActionStatus(item.id, e.target.value)}
                          className={`text-[10px] px-2 py-1 rounded-full font-semibold border-0 cursor-pointer flex-shrink-0 ${st.color}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
                            <option key={v} value={v}>{label}</option>
                          ))}
                        </select>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
                            <span className="text-[10px] text-slate-400">Day {item.start_day}-{item.end_day}</span>
                            {item.owner_name && <span className="text-[10px] text-slate-500">担当: {item.owner_name}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════ TAB 8: 宮川ベンチマーク ═══════════════ */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-4">
          <SectionHeader icon="📊" title="宮川ベンチマーク" subtitle="宮川商店4店舗の実績データ。「印刷業には当てはまらない」は通用しない — 数値が証明している" count={benchmarks.length} />
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-4">
            <p className="text-xs text-emerald-800">
              <strong>読み方：</strong>
              左列が宮川商店の実績指標、右列が文唱堂への適用時の意味。
              飲食業の数値をそのまま適用するのではなく、背後にある「原則」を印刷業に翻訳する。
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-3 font-semibold w-8">#</th>
                  <th className="text-left p-3 font-semibold">指標</th>
                  <th className="text-left p-3 font-semibold">宮川商店の実績値</th>
                  <th className="text-left p-3 font-semibold">文唱堂への示唆</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {benchmarks.map((bm, i) => (
                  <tr key={bm.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-xs text-slate-400">{i + 1}</td>
                    <td className="p-3 text-xs font-semibold text-slate-800">{bm.indicator}</td>
                    <td className="p-3 text-xs text-blue-700 font-mono">{bm.miyakawa_value}</td>
                    <td className="p-3 text-xs text-slate-600">{bm.bunshodo_implication}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 9: 設計経営 ═══════════════ */}
      {activeTab === 'design' && (
        <div className="space-y-4">
          <SectionHeader icon="🧮" title="設計経営" subtitle="G(利益) = Q(受注数) × P(単価) × MQ率 − F(固定費)。4つの変数を意図的に設計して利益を作る" count={designManagement.length} />

          {/* Formula Highlight */}
          <div className="bg-slate-900 rounded-xl p-5 text-white text-center">
            <p className="text-2xl font-mono font-bold mb-2">G = Q × P × MQ率 − F</p>
            <p className="text-xs text-slate-400">この4変数のどれを動かせば利益が最大化するかを「設計」する</p>
            <div className="grid grid-cols-4 gap-3 mt-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500">Q = 受注数</p>
                <p className="text-[10px] text-slate-400">何件の仕事を取るか</p>
                <p className="text-lg font-bold text-blue-400">2,437→2,800</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">P = 平均単価</p>
                <p className="text-[10px] text-slate-400">1件あたりいくらか</p>
                <p className="text-lg font-bold text-emerald-400">¥496K→¥600K</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">MQ率 = 限界利益率</p>
                <p className="text-[10px] text-slate-400">売上の何%が利益か</p>
                <p className="text-lg font-bold text-amber-400">32.8%→47%+</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">F = 固定費</p>
                <p className="text-[10px] text-slate-400">毎月必ず出る費用</p>
                <p className="text-lg font-bold text-red-400">¥180M→¥160M</p>
              </div>
            </div>
          </div>

          {/* Design Management Strategies */}
          {designManagement.map(s => (
            <StrategyCard key={s.id} strategy={s} onStatusChange={updateStrategyStatus} />
          ))}

          {/* Core Message Repeat */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
            <h3 className="text-sm font-bold text-amber-900 mb-2">核心メッセージ（再掲）</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              「売上を上げて黒字にする」のではなく、<strong>「利益の出る仕事だけを選び、損益分岐点を下げて黒字にする」</strong>。
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-white/60 rounded-lg p-2">
                <p className="text-[10px] text-amber-700 font-bold">90日で止血</p>
                <p className="text-[10px] text-amber-600">赤字案件を停止し、出血を止める</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2">
                <p className="text-[10px] text-amber-700 font-bold">180日で仕組み化</p>
                <p className="text-[10px] text-amber-600">クロスセル・増刷・AI経営を定着</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2">
                <p className="text-[10px] text-amber-700 font-bold">365日で黒字転換</p>
                <p className="text-[10px] text-amber-600">損益分岐点を超え、安定黒字へ</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnaroundPlanPage;
