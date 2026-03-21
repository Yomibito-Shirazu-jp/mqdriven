import React, { useMemo, useState } from 'react';
import { Page } from '../types';
import { FileText, Plus, Search } from './Icons';

interface FormsHubProps {
  onNavigate: (page: Page) => void;
}

const FormsHub: React.FC<FormsHubProps> = ({ onNavigate }) => {
  const forms = useMemo(() => ([
    { id: 'exp', code: 'EXP', name: '経費申請', description: '経費精算の申請を行います。' },
    { id: 'trp', code: 'TRP', name: '交通費申請', description: '交通費の申請を行います。' },
    { id: 'lev', code: 'LEV', name: '休暇申請', description: '休暇の申請を行います。' },
    { id: 'apl', code: 'APL', name: '稟議申請', description: '稟議・承認申請を行います。' },
    { id: 'dly', code: 'DLY', name: '日報申請', description: '日報を提出します。' },
  ]), []);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredForms = forms.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPageRoute = (code: string): Page => {
    switch (code.toUpperCase()) {
      case 'EXP': return 'approval_form_expense';
      case 'TRP': return 'approval_form_transport';
      case 'LEV': return 'approval_form_leave';
      case 'APL': return 'approval_form_approval';
      case 'DLY': return 'approval_form_daily';
      default: return 'approval_list';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            申請・報告フォーム一覧
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            各種手続きや定期報告はこちらから開始してください。
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="フォームを検索..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredForms.map((form: { id: string; code: string; name: string; description?: string }) => (
          <div 
            key={form.id}
            onClick={() => onNavigate(getPageRoute(form.code))}
            className="group relative bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-24 h-24 rotate-12" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {form.code}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">
                {form.name}
              </h3>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 flex-grow">
                {form.description || '概要説明はありません。'}
              </p>

              <div className="mt-6 flex items-center text-blue-600 dark:text-blue-400 text-sm font-semibold opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                <span>フォームを開く</span>
                <Plus className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredForms.length === 0 && (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">該当するフォームが見つかりませんでした。</p>
        </div>
      )}
    </div>
  );
};

export default FormsHub;
