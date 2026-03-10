import React, { useState } from 'react';
import { FixedCost, PaymentRecipient } from '../../types';
import { X } from '../Icons';

interface FixedCostModalProps {
  item: FixedCost | null;
  paymentRecipients: PaymentRecipient[];
  onClose: () => void;
  onSave: (item: Partial<FixedCost>) => Promise<void>;
}

const FixedCostModal: React.FC<FixedCostModalProps> = ({ item, paymentRecipients, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<FixedCost>>(item || {
    category: '地代家賃',
    description: '',
    monthly_amount: 0,
    recipient_id: '',
    start_date: '',
    end_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">{item ? '固定費設定を編集' : '新規固定費を登録'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition"><X className="w-5 h-5 text-slate-500"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">カテゴリ (F)</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition font-bold text-sm"
              >
                <option value="地代家賃">地代家賃</option>
                <option value="リース料">リース料</option>
                <option value="光熱費">光熱費</option>
                <option value="通信費">通信費</option>
                <option value="給与手当">給与手当</option>
                <option value="福利厚生費">福利厚生費</option>
                <option value="その他固定費">その他固定費</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">月額金額 (¥)</label>
              <input 
                type="number" 
                value={formData.monthly_amount} 
                onChange={e => setFormData({ ...formData, monthly_amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition font-mono font-bold"
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">内容・摘要</label>
            <input 
              type="text" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition text-sm font-bold"
              placeholder="例: 本社オフィス家賃"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">支払先 (Master連携)</label>
            <select 
              value={formData.recipient_id || ''} 
              onChange={e => setFormData({ ...formData, recipient_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition text-sm font-bold"
            >
              <option value="">未設定 (摘要のみで計上)</option>
              {paymentRecipients.map(r => (
                <option key={r.id} value={r.id}>{r.name || '名称未設定'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">適用開始</label>
               <input 
                 type="date" 
                 value={formData.start_date || ''} 
                 onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition text-xs font-mono"
               />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">適用終了 (任意)</label>
               <input 
                 type="date" 
                 value={formData.end_date || ''} 
                 onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition text-xs font-mono"
               />
             </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="flex-2 bg-indigo-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
              {isSubmitting ? '保存中...' : (item ? '更新する' : '登録する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FixedCostModal;
