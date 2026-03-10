import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getJournalBookData } from '../../services/dataService';
import { Loader, BookOpen, Calendar, ChevronLeft, ChevronRight } from '../Icons';
import EmptyState from '../ui/EmptyState';
import SortableHeader from '../ui/SortableHeader';
import { EmployeeUser } from '../../types';

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
} | null;

interface JournalLedgerProps {
  onAddEntry: (entry: Omit<any, 'id' | 'date'>) => void;
  isAIOff: boolean;
  currentUser?: EmployeeUser | null;
}

const JournalLedger: React.FC<JournalLedgerProps> = ({ onAddEntry, isAIOff, currentUser }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'descending' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // 管理者権限チェック
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const shiftMonth = (delta: number) => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [year, month] = period.split('-').map(Number);
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0);
      const endDateStr = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;
      const data = await getJournalBookData({ startDate, endDate: endDateStr });
      // draft・posted 両方表示（postedのみだとデータが少なすぎる）
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch journal book data:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedEntries = useMemo(() => {
    let sortableItems = [...entries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [entries, sortConfig]);

  const totals = useMemo(() => {
    const debit = entries.reduce((sum: number, e: any) => sum + (e.debit_amount || 0), 0);
    const credit = entries.reduce((sum: number, e: any) => sum + (e.credit_amount || 0), 0);
    return { debit, credit, diff: debit - credit };
  }, [entries]);

  const handleEdit = (entry: any) => {
    // v_journal_book は集計VIEWのため直接編集不可
    // editingId を entry.code+date の複合キーで管理（参考表示のみ）
    if (!isAdmin) return;
    const key = `${String(entry.date).split('T')[0]}_${entry.code}`;
    setEditingId(key);
    setEditingEntry({ ...entry });
  };

  const handleSave = async () => {
    if (!isAdmin || !editingId) return;

    setIsSaving(true);
    try {
      // v_journal_book はVIEWのため直接更新不可。
      // 実際には accounting.journal_lines を更新する必要があるが、
      // VIEWにはjournal_line_id がないため現時点ではキャンセルとして処理
      setEditingId(null);
      setEditingEntry({});
    } catch (error) {
      console.error('Failed to update journal line:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingEntry({});
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setEditingEntry(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  const monthPicker = (
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">仕訳一覧（修正用）</h2>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="w-4 h-4" /></button>
          <div className="relative">
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40" />
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button onClick={() => shiftMonth(1)} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="text-sm text-gray-500">
          {isAdmin ? '管理者編集可能' : '参照専用'}
        </div>
      </div>
    </div>
  );

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        {monthPicker}
        <div className="text-center py-8">
          <EmptyState
            icon={BookOpen}
            title="データなし"
            description="この期間の確定済み仕訳はありません"
          />
        </div>
      </div>
    );
  }

  const inputClass = "w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="space-y-4">
      {monthPicker}
      {/* Mobile Card View */}
      <div className="lg:hidden">
        <div className="space-y-3">
          {sortedEntries.map((entry, index) => (
            <div key={entry.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Card Header - Date */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">📅</div>
                  <div>
                    <p className="text-xs text-gray-500">取引日</p>
                    <p className="font-semibold text-sm">{String(entry.date).split('T')[0]}</p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-4">
                {/* Account Information */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">📋</div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">科目</p>
                      <p className="font-medium text-sm">{entry.code} - {entry.name}</p>
                    </div>
                  </div>
                </div>

                {/* Amounts - Side by Side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium mb-1">借方</p>
                    <p className="font-bold text-red-700">
                      {entry.debit_amount > 0 ? `¥${entry.debit_amount.toLocaleString()}` : '-'}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium mb-1">貸方</p>
                    <p className="font-bold text-blue-700">
                      {entry.credit_amount > 0 ? `¥${entry.credit_amount.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>

                {/* Category */}
                {entry.category && (
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">🏷️</div>
                    <div>
                      <p className="text-xs text-gray-500">勘定区分</p>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {entry.category}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <SortableHeader
                label="日付"
                sortKey="date"
                sortConfig={sortConfig}
                requestSort={(key) => setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending' })}
              />
              <SortableHeader
                label="科目コード"
                sortKey="code"
                sortConfig={sortConfig}
                requestSort={(key) => setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending' })}
              />
              <SortableHeader
                label="科目名"
                sortKey="name"
                sortConfig={sortConfig}
                requestSort={(key) => setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending' })}
              />
              <SortableHeader
                label="借方"
                sortKey="debit_amount"
                sortConfig={sortConfig}
                requestSort={(key) => setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending' })}
              />
              <SortableHeader
                label="貸方"
                sortKey="credit_amount"
                sortConfig={sortConfig}
                requestSort={(key) => setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending' })}
              />
              <SortableHeader
                label="ステータス"
                sortKey="status"
                sortConfig={sortConfig}
                requestSort={(key) => setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending' })}
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEntries.map((entry, index) => (
              <tr key={`${String(entry.date).split('T')[0]}_${entry.code}_${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {String(entry.date).split('T')[0]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  {Number(entry.debit_amount) > 0 ? `¥${Number(entry.debit_amount).toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                  {Number(entry.credit_amount) > 0 ? `¥${Number(entry.credit_amount).toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {entry.status === 'posted' ? '確定' : '下書'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-sm">
            <tr>
              <td className="px-6 py-3" colSpan={3}>合計</td>
              <td className="px-6 py-3 text-right">¥{totals.debit.toLocaleString()}</td>
              <td className="px-6 py-3 text-right">¥{totals.credit.toLocaleString()}</td>
              <td className="px-6 py-3 text-center">
                {totals.diff === 0
                  ? <span className="text-green-600 text-xs">貸借一致</span>
                  : <span className="text-red-600 text-xs">差額 ¥{Math.abs(totals.diff).toLocaleString()}</span>
                }
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default JournalLedger;
