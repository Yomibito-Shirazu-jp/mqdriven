import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Calendar, ChevronDown, Loader, FileText, CheckCircle, AlertTriangle, TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Users, Briefcase, Plus, Pencil } from 'lucide-react';
import { Estimate, User } from '../../types';
import * as dataService from '../../services/dataService';
import { calculateEstimateMQ } from '../../utils/mqProfitCalculation';

interface StrategicMQReviewPageProps {
  currentUser?: User | null;
  notify?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigate?: (page: string) => void;
}

const StrategicMQReviewPage: React.FC<StrategicMQReviewPageProps> = ({ currentUser, notify, onNavigate }) => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  const PAGE_SIZE = 100;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { rows } = await dataService.getEstimatesPage(1, PAGE_SIZE);
      setEstimates(rows);
      setFilteredEstimates(rows);
    } catch (err: any) {
      setError('データの読み込みに失敗しました。');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filters
  useEffect(() => {
    let filtered = estimates;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(est =>
        (est.pattern_name || '').toLowerCase().includes(term) ||
        (est.customer_name || est.customerName || '').toLowerCase().includes(term) ||
        (est.specification || '').toLowerCase().includes(term)
      );
    }

    if (customerFilter !== 'all') {
      filtered = filtered.filter(est => (est.customer_name || est.customerName) === customerFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(est => est.status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter(est => {
        const date = est.create_date || est.created_at;
        if (!date) return false;
        return new Date(date) >= new Date(dateFrom);
      });
    }

    if (dateTo) {
      filtered = filtered.filter(est => {
        const date = est.create_date || est.created_at;
        if (!date) return false;
        return new Date(date) <= new Date(dateTo + 'T23:59:59');
      });
    }

    setFilteredEstimates(filtered);
  }, [estimates, searchTerm, customerFilter, statusFilter, dateFrom, dateTo]);

  const customerOptions = useMemo(() => {
    const names = new Set<string>();
    estimates.forEach(est => {
      const name = est.customer_name || est.customerName;
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [estimates]);

  const totals = useMemo(() => {
    return filteredEstimates.reduce((acc, est) => {
      const mq = calculateEstimateMQ(est);
      if (mq) {
        acc.pq += mq.salesAmount;
        acc.vq += mq.variableCost;
        acc.mq += mq.marginalProfit;
      }
      return acc;
    }, { pq: 0, vq: 0, mq: 0 });
  }, [filteredEstimates]);

  const avgMRate = totals.pq > 0 ? (totals.mq / totals.pq) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ja-JP');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              案件別MQレビュー (Strategic Review)
            </h1>
            <p className="text-slate-500 text-sm mt-1">過去の見積データに基づいた収益性分析とMQマネジメント</p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={() => onNavigate?.('detailed_estimate')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新規詳細見積
            </button>
             <button 
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Loader className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </button>
          </div>
        </div>

        {/* STRAC Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total PQ (売上合計)</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(totals.pq)}</div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              対象 {filteredEstimates.length} 件
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                <PieChart className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total VQ (変動費合計)</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(totals.vq)}</div>
            <div className="mt-2 text-[11px] text-slate-400">
              構成比: {(totals.pq > 0 ? (totals.vq / totals.pq) * 100 : 0).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total MQ (限界利益合計)</span>
            </div>
            <div className="text-xl font-bold text-emerald-700">{formatCurrency(totals.mq)}</div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <ArrowUpRight className="w-3 h-3" />
              利益率: {avgMRate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-indigo-600 p-4 rounded-xl shadow-md text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                 <PieChart className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">平均M率 (目標: 30%+)</span>
            </div>
            <div className="text-3xl font-black">{avgMRate.toFixed(1)}%</div>
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${avgMRate >= 30 ? 'bg-emerald-400' : 'bg-orange-400'}`} 
                style={{ width: `${Math.min(100, avgMRate * 2)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="案件名、顧客名、仕様で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
          >
            <option value="all">すべての顧客</option>
            {customerOptions.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-600 focus:ring-0"
            />
            <span className="text-slate-300">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-600 focus:ring-0"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            setSearchTerm('');
            setCustomerFilter('all');
            setStatusFilter('all');
            setDateFrom('');
            setDateTo('');
          }}
          className="text-sm text-slate-400 hover:text-indigo-600 font-medium"
        >
          リセット
        </button>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Loader className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
            <p className="text-lg font-medium">データを読み込み中...</p>
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <Briefcase className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-semibold">案件が見つかりませんでした</p>
            <p className="text-sm mt-2">条件を変えて検索してみてください</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">案件名 / 仕様</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">顧客名</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">PQ (売上)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">VQ (変動費)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">MQ (利益)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">M率</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">作成日</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEstimates.map((est) => {
                  const mq = calculateEstimateMQ(est);
                  if (!mq) return null;
                  
                  const isHighProfit = mq.profitRate >= 0.3;
                  const isLowProfit = mq.profitRate < 0.15;

                  return (
                    <tr key={est.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {est.pattern_name || est.projectName || '名称なし'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">
                          {est.specification || '詳細仕様なし'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-slate-600 flex items-center gap-2">
                          <Users className="w-3 h-3 opacity-40" />
                          {est.customer_name || est.customerName || '未設定'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm text-slate-700">
                        {formatCurrency(mq.salesAmount)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono text-sm text-slate-400">
                        {formatCurrency(mq.variableCost)}
                      </td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-sm text-slate-900">
                        {formatCurrency(mq.marginalProfit)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isHighProfit ? 'bg-emerald-100 text-emerald-700' : 
                            isLowProfit ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(mq.profitRate * 100).toFixed(1)}%
                          </span>
                          <div className="w-12 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${isHighProfit ? 'bg-emerald-500' : isLowProfit ? 'bg-red-500' : 'bg-slate-400'}`}
                              style={{ width: `${Math.min(100, mq.profitRate * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs text-slate-400 font-medium">
                          {formatDate(est.create_date || est.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center text-slate-400">
                        <button 
                          onClick={() => onNavigate?.('detailed_estimate')}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-slate-200 px-8 py-3 flex justify-between items-center text-[11px] text-slate-400 font-medium">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" /> 高収益 (30%+)
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-400" /> 標準
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> 低収益 (&lt;15%)
          </div>
        </div>
        <div>
          Showing {filteredEstimates.length} results • STRAC Management System v2.0
        </div>
      </div>
    </div>
  );
};

export default StrategicMQReviewPage;
