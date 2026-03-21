import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { getTaxSummaryData } from '../../services/dataService';
import { copyTsvToClipboard } from '../../utils/exportToSpreadsheet';

type TaxRow = {
  tax_rate: number;
  taxable_sales: number;
  output_tax: number;
  taxable_purchases: number;
  input_tax: number;
};

const TaxSummaryPage: React.FC = () => {
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [copied, setCopied] = useState(false);

  const shiftMonth = (delta: number) => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setPeriod(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [year, month] = period.split('-').map(Number);
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endOfMonth = new Date(year, month, 0);
      const endDate = `${endOfMonth.getFullYear()}-${(endOfMonth.getMonth() + 1).toString().padStart(2, '0')}-${endOfMonth.getDate().toString().padStart(2, '0')}`;

      const viewData = await getTaxSummaryData({ startDate, endDate });
      const result: TaxRow[] = (viewData || []).map((r: any) => ({
        tax_rate: Number(r.tax_rate) || 0,
        taxable_sales: Number(r.taxable_sales) || 0,
        output_tax: Number(r.output_tax) || 0,
        taxable_purchases: Number(r.taxable_purchases) || 0,
        input_tax: Number(r.input_tax) || 0,
      }));

      setRows(result);
    } catch (err) {
      setError('消費税集計データの読み込みに失敗しました。');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      taxable_sales: acc.taxable_sales + r.taxable_sales,
      output_tax: acc.output_tax + r.output_tax,
      taxable_purchases: acc.taxable_purchases + r.taxable_purchases,
      input_tax: acc.input_tax + r.input_tax,
    }),
    { taxable_sales: 0, output_tax: 0, taxable_purchases: 0, input_tax: 0 },
  ), [rows]);

  const netTax = totals.output_tax - totals.input_tax;
  const fmt = (v: number) => `¥${v.toLocaleString()}`;
  const [y, m] = period.split('-').map(Number);

  const handleCopyTsv = async () => {
    const headers = ['税率', '課税売上高', '仮受消費税', '課税仕入高', '仮払消費税', '差引納付税額'];
    const dataRows = rows.map(r => [
      `${r.tax_rate}%`, r.taxable_sales, r.output_tax, r.taxable_purchases, r.input_tax,
      r.output_tax - r.input_tax,
    ]);
    dataRows.push(['合計', totals.taxable_sales, totals.output_tax, totals.taxable_purchases, totals.input_tax, netTax]);
    const ok = await copyTsvToClipboard(headers, dataRows);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">消費税集計</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTsv}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'コピー済' : 'スプレッドシート用コピー'}
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded hover:bg-slate-200 transition text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40" />
              <button onClick={() => shiftMonth(1)} className="p-1.5 rounded hover:bg-slate-200 transition text-slate-500"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">{y}年{m}月1日 〜 {y}年{m}月{new Date(y, m, 0).getDate()}日</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 border-b border-slate-200 divide-x divide-slate-200">
        <div className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">仮受消費税</p>
          <p className="font-mono font-medium text-slate-700">{fmt(totals.output_tax)}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">仮払消費税</p>
          <p className="font-mono font-medium text-red-600">{fmt(totals.input_tax)}</p>
        </div>
        <div className={`p-3 text-center ${netTax >= 0 ? 'bg-amber-50/50' : 'bg-green-50/50'}`}>
          <p className="text-[10px] uppercase tracking-wide font-bold" style={{ color: netTax >= 0 ? '#d97706' : '#059669' }}>
            {netTax >= 0 ? '納付税額' : '還付税額'}
          </p>
          <p className={`font-mono font-bold ${netTax >= 0 ? 'text-amber-700' : 'text-green-700'}`}>{fmt(Math.abs(netTax))}</p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">データ未集計（この期間の v_tax_summary に行がありません）</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 w-20">税率</th>
                <th className="px-4 py-3 border-b border-slate-200 text-right">課税売上高</th>
                <th className="px-4 py-3 border-b border-slate-200 text-right">仮受消費税</th>
                <th className="px-4 py-3 border-b border-slate-200 text-right">課税仕入高</th>
                <th className="px-4 py-3 border-b border-slate-200 text-right">仮払消費税</th>
                <th className="px-4 py-3 border-b border-slate-200 text-right">差引納付税額</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {rows.map((row, i) => {
                const net = row.output_tax - row.input_tax;
                return (
                  <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-4 py-2.5 font-bold text-indigo-600">{row.tax_rate}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(row.taxable_sales)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(row.output_tax)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(row.taxable_purchases)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(row.input_tax)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${net >= 0 ? 'text-amber-700' : 'text-green-700'}`}>
                      {fmt(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-sm border-t-2 border-slate-300">
              <tr>
                <td className="px-4 py-3">合計</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(totals.taxable_sales)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(totals.output_tax)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(totals.taxable_purchases)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(totals.input_tax)}</td>
                <td className={`px-4 py-3 text-right font-mono ${netTax >= 0 ? 'text-amber-700' : 'text-green-700'}`}>
                  {fmt(netTax)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default TaxSummaryPage;
