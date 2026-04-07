import * as React from 'react';
import { getSupabase } from '../services/supabaseClient';

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);

const TurnaroundPlanPage: React.FC = () => {
  const [kpis, setKpis] = React.useState<KpiTarget[]>([]);
  const [recoveryTargets, setRecoveryTargets] = React.useState<RecoveryTarget[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'kpi' | 'recovery' | 'report'>('overview');
  const [editingKpi, setEditingKpi] = React.useState<string | null>(null);
  const [editingRecovery, setEditingRecovery] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const [kpiRes, recRes] = await Promise.all([
        supabase.from('turnaround_kpi_targets').select('*').order('target_month', { ascending: true }),
        supabase.from('customer_recovery_targets').select('*').order('priority', { ascending: true }),
      ]);
      if (kpiRes.data) setKpis(kpiRes.data);
      if (recRes.data) setRecoveryTargets(recRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

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

  // Summary calculations
  const pillarGroups = React.useMemo(() => {
    const groups: Record<string, KpiTarget[]> = {};
    kpis.forEach(k => {
      if (!groups[k.pillar]) groups[k.pillar] = [];
      groups[k.pillar].push(k);
    });
    return groups;
  }, [kpis]);

  const totalRecoveryTarget = recoveryTargets.reduce((s, r) => s + r.previous_annual_revenue, 0);
  const totalRecovered = recoveryTargets.reduce((s, r) => s + r.recovered_revenue, 0);
  const contactedCount = recoveryTargets.filter(r => r.contact_status !== 'not_contacted').length;
  const recoveredCount = recoveryTargets.filter(r => r.contact_status === 'recovered').length;

  const achievedKpis = kpis.filter(k => k.status === 'achieved').length;
  const inProgressKpis = kpis.filter(k => k.status === 'in_progress').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-mono text-amber-400 tracking-widest mb-1">TURNAROUND PLAN</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">起死回生プラン</h1>
            <p className="text-slate-400 mt-2 text-sm">文唱堂印刷 第85期 経営改善計画</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-slate-400">損益分岐売上</p>
            <p className="text-xl font-bold text-amber-400">¥1.2億/月</p>
            <p className="text-xs text-slate-400 mt-2">改善目標</p>
            <p className="text-xl font-bold text-emerald-400">+¥3,200万/月</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">離脱顧客</p>
            <p className="text-2xl font-bold">{contactedCount}<span className="text-sm text-slate-400">/{recoveryTargets.length}連絡済</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">奪還成功</p>
            <p className="text-2xl font-bold text-emerald-400">{recoveredCount}社</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">KPI達成</p>
            <p className="text-2xl font-bold">{achievedKpis}<span className="text-sm text-slate-400">/{kpis.length}</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-300">進行中</p>
            <p className="text-2xl font-bold text-blue-400">{inProgressKpis}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([['overview', '概要'], ['kpi', 'KPI目標'], ['recovery', '顧客奪還'], ['report', '📊 社長報告書']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 現状認識 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">📉 現状認識</h2>
            <div className="prose prose-sm max-w-none text-slate-700 space-y-3">
              <p>売上は2年で半減しました。2023年の月平均<strong>¥1億6,054万</strong>に対し、2025年10-11月は<strong>¥7,868万</strong>（▲51%）。件数も単価も同時に落ちています。</p>
              <p>最大の原因は<strong>顧客離脱</strong>です。2024年の取引顧客83社のうち、2025年に残ったのは38社。<strong>63社が離脱</strong>し、新規獲得は18社にとどまりました。顧客の4分の3を失っています。</p>
              <p>一方、経費は高止まりしています。経費精算と稟議を合わせて月<strong>¥4,000〜5,000万</strong>が固定的に発生。用紙仕入（月約¥2,000万）と外注印刷（月約¥800万）が大きな比重を占めます。</p>
              <p>損益分岐は月商<strong>¥1億2,000万</strong>。現在は<strong>月¥3,500〜5,000万の売上不足</strong>で、月¥1,500〜2,000万の赤字が続いています。</p>
            </div>
          </div>

          {/* 5本柱 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">🔧 起死回生 5本柱</h2>
            <div className="space-y-3">
              {[
                { pillar: 'pillar_1', name: '離脱顧客の奪還', target: '月+¥750万', desc: '63社の離脱顧客（年間¥4,900万消失）にアプローチ。Top10に社長自ら電話し、離脱理由をヒアリング。再取引の特別価格を提示。' },
                { pillar: 'pillar_2', name: 'AI書類保管サービス', target: '月+¥700万', desc: '月額¥8,000のストック型収益。既存2,666社にDM発送（自社印刷でコスト¥0）。12ヶ月で300社獲得を目標。一度預けたら解約しにくいため離脱率10%以下。' },
                { pillar: 'pillar_3', name: '秋葉原Bスタジオ', target: '月+¥600万', desc: '4室×¥20,000/時。稼働率50%で月売上¥704万＋付帯売上¥150万。印刷＋配信＋会場のワンストップが他社にない強み。' },
                { pillar: 'pillar_4', name: '経費構造改革', target: '月+¥600万', desc: '用紙仕入先を共同紙販HDに集約し3%値下げ交渉（月¥300万削減）。外注印刷4社に相見積もりを実施し内製回帰（月¥300万削減）。' },
                { pillar: 'pillar_5', name: '単価改善・新規開拓', target: '月+¥550万', desc: '全見積もりの5%値上げ（原材料高騰を理由に）。低MQ案件を選別。リード49件の即時フォローと新規Web集客。' },
              ].map(item => {
                const conf = PILLAR_CONFIG[item.pillar];
                const kpiCount = pillarGroups[item.pillar]?.length || 0;
                const achieved = pillarGroups[item.pillar]?.filter(k => k.status === 'achieved').length || 0;
                return (
                  <div key={item.pillar} className={`border-l-4 ${conf.color} bg-slate-50 rounded-r-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-800">{conf.icon} {item.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">KPI: {achieved}/{kpiCount}</span>
                        <span className="text-sm font-bold text-emerald-600">{item.target}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">5本柱 合計改善効果</span>
                <span className="text-xl font-bold text-emerald-600">+¥3,200万/月</span>
              </div>
              <p className="text-sm text-emerald-700 mt-1">12ヶ月以内に損益分岐達成 → 黒字転換を目指す</p>
            </div>
          </div>

          {/* 今週やること */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">✅ 今週やるべきこと</h2>
            <div className="space-y-2">
              {[
                { action: '離脱Top10顧客に社長が電話', owner: '社長', impact: '年間¥4,900万の一部回復' },
                { action: '2026年1月の稟議¥2,366万の内訳確認', owner: '経理', impact: '異常支出の抑制' },
                { action: '共同紙販HDに価格交渉アポ', owner: '資材部', impact: '月¥300万削減' },
                { action: 'AI書類保管のDMを2,666社に発送準備', owner: '営業+印刷', impact: '3ヶ月で30社獲得' },
                { action: 'Bスタジオの集客強化策を営業会議で議論', owner: '営業部', impact: '稼働率30%→50%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="w-7 h-7 flex items-center justify-center bg-slate-800 text-white text-xs font-bold rounded-full flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.action}</p>
                    <p className="text-xs text-slate-500">{item.impact}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">{item.owner}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Tab */}
      {activeTab === 'kpi' && (
        <div className="space-y-4">
          {Object.entries(pillarGroups).map(([pillar, items]) => {
            const conf = PILLAR_CONFIG[pillar] || { icon: '📊', color: 'border-l-slate-500' };
            const pillarName = items[0]?.pillar_name || pillar;
            return (
              <div key={pillar} className={`bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 ${conf.color} overflow-hidden`}>
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">{conf.icon} {pillarName}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(kpi => {
                    const st = STATUS_LABELS[kpi.status] || STATUS_LABELS.not_started;
                    const progress = kpi.target_value > 0 ? Math.min(100, Math.round((kpi.actual_value / kpi.target_value) * 100)) : 0;
                    return (
                      <div key={kpi.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-800">{kpi.kpi_name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.color}`}>{st.label}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            目標月: {kpi.target_month.slice(0, 7)} | 担当: {kpi.owner} | 目標: {kpi.target_value.toLocaleString()} {kpi.unit}
                          </p>
                          {kpi.unit === '円' && (
                            <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingKpi === kpi.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                updateKpiActual(kpi.id, Number(fd.get('actual')));
                              }}
                              className="flex gap-1"
                            >
                              <input name="actual" type="number" defaultValue={kpi.actual_value} className="w-24 text-sm border rounded px-2 py-1" autoFocus />
                              <button type="submit" className="text-xs px-2 py-1 bg-blue-600 text-white rounded">保存</button>
                            </form>
                          ) : (
                            <button
                              onClick={() => setEditingKpi(kpi.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              実績: {kpi.actual_value.toLocaleString()} {kpi.unit}
                            </button>
                          )}
                          <select
                            value={kpi.status}
                            onChange={e => updateKpiStatus(kpi.id, e.target.value)}
                            className="text-xs border rounded px-1 py-1 bg-white"
                          >
                            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
                              <option key={v} value={v}>{label}</option>
                            ))}
                          </select>
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

      {/* Report Tab - Full HTML Report */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <iframe
            src="/turnaround-report.html"
            title="起死回生プラン 社長報告書"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {/* Recovery Tab */}
      {activeTab === 'recovery' && (
        <div className="space-y-4">
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs">
                    <th className="text-left p-3 font-semibold">優先度</th>
                    <th className="text-left p-3 font-semibold">顧客名</th>
                    <th className="text-right p-3 font-semibold">2024年売上</th>
                    <th className="text-center p-3 font-semibold">ステータス</th>
                    <th className="text-left p-3 font-semibold">離脱理由</th>
                    <th className="text-left p-3 font-semibold">メモ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recoveryTargets.map(r => {
                    const cs = CONTACT_STATUS_LABELS[r.contact_status] || CONTACT_STATUS_LABELS.not_contacted;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            r.priority <= 1 ? 'bg-red-100 text-red-700' :
                            r.priority <= 2 ? 'bg-amber-100 text-amber-700' :
                            r.priority <= 3 ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{r.priority}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{r.customer_name}</td>
                        <td className="p-3 text-right font-mono text-slate-700">{formatCurrency(r.previous_annual_revenue)}</td>
                        <td className="p-3 text-center">
                          <select
                            value={r.contact_status}
                            onChange={e => updateRecoveryStatus(r.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full font-semibold border-0 ${cs.color}`}
                          >
                            {Object.entries(CONTACT_STATUS_LABELS).map(([v, { label }]) => (
                              <option key={v} value={v}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          {editingRecovery === `${r.id}_reason` ? (
                            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateRecoveryNotes(r.id, 'loss_reason', fd.get('val') as string); }} className="flex gap-1">
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
                            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateRecoveryNotes(r.id, 'notes', fd.get('val') as string); }} className="flex gap-1">
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
    </div>
  );
};

export default TurnaroundPlanPage;
