import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGeneralLedgerAccountsInPeriod, getGeneralLedgerLinesForAccount } from '../../services/dataService';

const formatCurrency = (val: number | null | undefined) => {
  if (val === null || val === undefined || val === 0) return '';
  return val.toLocaleString();
};

const GeneralLedger: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  });

  const shiftMonth = (delta: number) => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const monthBounds = useCallback(() => {
    const [year, month] = period.split('-').map(Number);
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endDateStr = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;
    return { startDate, endDateStr };
  }, [period]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { startDate, endDateStr } = monthBounds();
      const accs = await getGeneralLedgerAccountsInPeriod(startDate, endDateStr);
      setAccounts(accs);
      const validCode = accs.some((a) => a.code === selectedCode) ? selectedCode : (accs[0]?.code ?? '');
      if (validCode !== selectedCode) setSelectedCode(validCode);
      if (!validCode) {
        setLedgerData([]);
        return;
      }
      const data = await getGeneralLedgerLinesForAccount(validCode, startDate, endDateStr);
      const acc = accs.find((a) => a.code === validCode);
      const normalSide = acc?.normal_balance_side || (data?.[0] as any)?.normal_balance_side || 'debit';
      const isDebitNormal = normalSide === 'debit';

      let balance = 0;
      const rows = (data || []).map((row: any, i: number) => {
        const debit = Number(row.debit) || 0;
        const credit = Number(row.credit) || 0;
        balance += isDebitNormal ? (debit - credit) : (credit - debit);
        const partnerHint = row.partner_account_name
          ? `相手: ${row.partner_account_name}${row.partner_account_code ? ` (${row.partner_account_code})` : ''}`
          : '';
        const description = [row.description, partnerHint].filter(Boolean).join(' — ');
        return {
          id: row.id || i,
          date: String(row.date).split('T')[0],
          status: row.status,
          description,
          debit: debit || null,
          credit: credit || null,
          type: debit > 0 ? '借' : '貸',
          balance,
        };
      });
      setLedgerData(rows);
    } catch (err) {
      console.error('GeneralLedger load error:', err);
      setError('元帳データの読み込みに失敗しました。');
      setLedgerData([]);
    } finally {
      setIsLoading(false);
    }
  }, [monthBounds, selectedCode]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = ledgerData.reduce((acc, entry) => {
    acc.debit += entry.debit ?? 0;
    acc.credit += entry.credit ?? 0;
    return acc;
  }, { debit: 0, credit: 0 });

  const currentBalance = ledgerData.length > 0 ? (ledgerData[ledgerData.length - 1]?.balance ?? 0) : 0;
  const selectedAccount = accounts.find(a => a.code === selectedCode);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              総勘定元帳
            </h2>
            <div className="relative group">
              <select
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm min-w-[280px]"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
              >
                {accounts.length === 0 ? (
                  <option value="">（この期間に仕訳なし）</option>
                ) : (
                  accounts.map(item => (
                    <option key={item.id} value={item.code}>
                      {item.code} : {item.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {selectedAccount?.account_type && (
              <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                selectedAccount.account_type === 'asset' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                selectedAccount.account_type === 'liability' ? 'bg-red-50 text-red-700 border-red-200' :
                selectedAccount.account_type === 'equity' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                selectedAccount.account_type === 'revenue' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-orange-50 text-orange-700 border-orange-200'
              }`}>
                {selectedAccount.account_type === 'asset' ? '資産' :
                 selectedAccount.account_type === 'liability' ? '負債' :
                 selectedAccount.account_type === 'equity' ? '純資産' :
                 selectedAccount.account_type === 'revenue' ? '収益' : '費用'}
                ({selectedAccount.normal_balance_side === 'debit' ? '借方増' : '貸方増'})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded hover:bg-slate-200 transition text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 w-36"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded hover:bg-slate-200 transition text-slate-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">参照専用（v_general_ledger）</p>
      </div>

      <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 divide-x divide-slate-200">
        <div className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">前月繰越</p>
          <p className="font-mono font-medium text-slate-700">-</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">借方合計</p>
          <p className="font-mono font-medium text-slate-700">{formatCurrency(totals.debit)}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">貸方合計</p>
          <p className="font-mono font-medium text-slate-700">{formatCurrency(totals.credit)}</p>
        </div>
        <div className="p-3 text-center bg-primary-50/50">
          <p className="text-[10px] text-primary-700 uppercase tracking-wide font-bold">期中残高</p>
          <p className="font-mono font-bold text-primary-800">{formatCurrency(currentBalance)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-white mt-4 border-t border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-red-500">{error}</div>
        ) : ledgerData.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-gray-400 text-sm">この期間の取引データはありません</div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white border-b-2 border-slate-100 text-slate-500 text-xs tracking-wider">
              <tr>
                <th className="px-5 py-4 font-semibold">日付</th>
                <th className="px-5 py-4 font-semibold">摘要</th>
                <th className="px-5 py-4 font-semibold text-center">状態</th>
                <th className="px-5 py-4 font-semibold text-right">借方金額</th>
                <th className="px-5 py-4 font-semibold text-right">貸方金額</th>
                <th className="px-5 py-4 font-semibold text-center">借/貸</th>
                <th className="px-5 py-4 font-semibold text-right">残高</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {ledgerData.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-slate-700">{row.date}</td>
                  <td className="px-5 py-4 text-slate-700 truncate max-w-[250px]" title={row.description}>{row.description}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${row.status === 'posted' ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
                      {row.status === 'posted' ? 'Standard' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(row.debit)}</td>
                  <td className="px-5 py-4 text-right text-slate-700">{formatCurrency(row.credit)}</td>
                  <td className="px-5 py-4 text-center text-slate-700">{row.type}</td>
                  <td className="px-5 py-4 text-right text-slate-800 font-bold">{formatCurrency(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GeneralLedger;
