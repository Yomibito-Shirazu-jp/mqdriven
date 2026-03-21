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

const JournalLedger: React.FC<JournalLedgerProps> = ({ onAddEntry: _onAddEntry, isAIOff: _isAIOff, currentUser: _currentUser }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  });

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
      <h2 className="text-xl font-semibold">仕訳帳</h2>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronLeft className="w-4 h-4" /></button>
          <div className="relative">
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40" />
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded hover:bg-slate-200 transition"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <span className="text-sm text-gray-500">参照専用（v_journal_book）</span>
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
            title="データ未集計"
            description="この期間に表示できる仕訳がありません"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {monthPicker}

      <div className="overflow-x-auto bg-white border-t border-gray-200 mt-4">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-white border-b border-gray-200 text-gray-600 font-semibold">
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
          <tbody className="bg-white">
            {sortedEntries.map((entry, index) => (
              <tr key={`${String(entry.date).split('T')[0]}_${entry.code}_${index}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-700 font-mono">
                  {String(entry.date).split('T')[0]}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {entry.code}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {entry.name}
                </td>
                <td className="px-6 py-4 text-right text-gray-700 font-mono">
                  {Number(entry.debit_amount) > 0 ? `¥${Number(entry.debit_amount).toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-gray-700 font-mono">
                  {Number(entry.credit_amount) > 0 ? `¥${Number(entry.credit_amount).toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-xs ${entry.status === 'posted' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {entry.status === 'posted' ? 'Standard' : 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-white border-t-2 border-gray-200 font-bold text-gray-800">
            <tr>
              <td className="px-6 py-4" colSpan={3}>合計</td>
              <td className="px-6 py-4 text-right">¥{totals.debit.toLocaleString()}</td>
              <td className="px-6 py-4 text-right">¥{totals.credit.toLocaleString()}</td>
              <td className="px-6 py-4 text-center">
                {totals.diff === 0
                  ? <span className="text-green-600 font-normal text-xs">貸借一致</span>
                  : <span className="text-red-600 font-normal text-xs">差額 ¥{Math.abs(totals.diff).toLocaleString()}</span>
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
