import React from 'react';
import { 
  Calculator, 
  ShoppingCart, 
  Settings, 
  Truck, 
  ArrowRight,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Page } from '../types';

interface BusinessFormsHubProps {
  onNavigate: (page: Page) => void;
}

const BusinessFormsHub: React.FC<BusinessFormsHubProps> = ({ onNavigate }) => {
  const forms = [
    {
      id: 'detailed_estimate',
      title: '1. 見積作成',
      description: 'MQ分析に基づく戦略的見積もり。利益率・成約予測を自動算出。',
      icon: <Calculator className="w-8 h-8 text-blue-600" />,
      tag: '見積',
      color: 'border-blue-200 hover:border-blue-600',
      status: '作成中: 3件'
    },
    {
      id: 'business_order',
      title: '2. 受注入力',
      description: '見積データからワンクリックで受注確定。基幹DBと完全同期。',
      icon: <ShoppingCart className="w-8 h-8 text-orange-600" />,
      tag: '受注',
      color: 'border-orange-200 hover:border-orange-600',
      status: '未処理: 5件'
    },
    {
      id: 'business_production',
      title: '3. 製造指示',
      description: '工程別の詳細指示、原価管理、スケジュール管理。',
      icon: <Settings className="w-8 h-8 text-slate-600" />,
      tag: '製造',
      color: 'border-slate-200 hover:border-slate-800',
      status: '進行中: 12件'
    },
    {
      id: 'business_delivery',
      title: '4. 納品入力',
      description: '納品書・受領書の発行。配送ステータスの管理。',
      icon: <Truck className="w-8 h-8 text-emerald-600" />,
      tag: '納品',
      color: 'border-emerald-200 hover:border-emerald-600',
      status: '本日納品: 2件'
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">業務プロセス管理</h2>
          <p className="text-slate-500 font-bold mt-2">見積から納品まで、基幹DBと同期した一元管理ターミナル</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 基幹DB 正常稼働中
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {forms.map((form) => (
          <button
            key={form.id}
            onClick={() => onNavigate(form.id as Page)}
            className={`bg-white p-8 rounded-2xl border-2 ${form.color} text-left transition-all hover:shadow-2xl group relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              {form.icon}
            </div>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl inline-block group-hover:bg-white group-hover:shadow-md transition-all">
              {form.icon}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{form.title}</h3>
            <p className="text-sm text-slate-500 font-bold leading-relaxed mb-6">
              {form.description}
            </p>
            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{form.status}</span>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
             <div className="relative z-10 flex gap-10 items-start">
                <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
                    <FileCheck className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-4">
                    <h4 className="text-xl font-black">承認待ちの重要案件</h4>
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/10 flex justify-between items-center hover:bg-white/15 transition-all cursor-pointer">
                                <div>
                                    <p className="text-sm font-bold">オフィスステーションPro 在庫保管・発送費</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">申請日: 2026/03/04 | 申請者: 橋本 昭市</p>
                                </div>
                                <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded text-[10px] font-black border border-amber-500/30">承認待ち</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        </div>

        <div className="bg-white rounded-3xl p-10 border-2 border-slate-100 shadow-xl">
            <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                最近の変更履歴
            </h4>
            <div className="space-y-6">
                {[
                    { text: '見積 D10293 を承認しました', time: '10分前', color: 'bg-emerald-500' },
                    { text: '作業指示 M40291 を発行しました', time: '1時間前', color: 'bg-blue-500' },
                    { text: '受注 OR38760 が確定しました', time: '2時間前', color: 'bg-orange-500' }
                ].map((log, i) => (
                    <div key={i} className="flex gap-4 items-start">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${log.color} shadow-sm`}></div>
                        <div>
                            <p className="text-sm font-bold text-slate-700">{log.text}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">{log.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessFormsHub;
