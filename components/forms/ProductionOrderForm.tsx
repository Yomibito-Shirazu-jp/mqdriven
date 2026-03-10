import React, { useState } from 'react';
import { ArrowLeft, Printer, Save, Plus, Trash2, ChevronRight } from 'lucide-react';

const ProductionOrderForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [formData, setFormData] = useState({
        job_no: 'M40291',
        title: 'オフィスステーションPro 在庫保管・発送費 (2026年 2月)',
        customer_name: '株式会社エフアンドエム',
        sales_rep: '橋本 昭市',
        order_date: '2026/02/05',
        delivery_date: '2026/02/12',
        quantity: '7',
        unit: '式',
        size: '特注',
        paper: '支給品',
        binding: 'バラ',
        specification: '物流倉庫からのピッキングおよび発送代行。'
    });

    const sections = [
        { name: '組版', color: 'bg-blue-600', items: ['データ確認', '面付け'] },
        { name: '刷版', color: 'bg-indigo-600', items: ['CTP出力'] },
        { name: '印刷', color: 'bg-emerald-600', items: ['オンデマンド印刷', '色確認'] },
        { name: '加工', color: 'bg-purple-600', items: ['断裁', '梱包'] },
        { name: '物流', color: 'bg-orange-600', items: ['在庫管理', '発送代行 (7件)'] }
    ];

    const labelClass = "bg-[#2c3e50] text-white px-3 py-2 text-xs font-bold w-32 flex items-center shrink-0";
    const inputClass = "flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none font-bold";

    return (
        <div className="bg-[#f4f7f6] min-h-screen pb-20">
            <header className="bg-[#2c3e50] text-white px-8 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full"><ArrowLeft/></button>
                    <div>
                        <h1 className="text-xl font-bold">製造指示書 <span className="text-blue-400 ml-2">Job No: {formData.job_no}</span></h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Production Instruction Sheet</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white text-slate-900 px-6 py-2 font-bold text-sm rounded flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4"/> 現場指示書発行</button>
                    <button className="bg-blue-600 text-white px-6 py-2 font-bold text-sm rounded shadow-lg">指示確定</button>
                </div>
            </header>

            <div className="max-w-[1200px] mx-auto p-8 space-y-6">
                {/* 基本情報 */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex rounded overflow-hidden"><label className={labelClass}>得意先</label><input className={inputClass} value={formData.customer_name}/></div>
                            <div className="flex rounded overflow-hidden"><label className={labelClass}>品名</label><input className={inputClass} value={formData.title}/></div>
                            <div className="flex rounded overflow-hidden"><label className={labelClass}>営業担当</label><input className={inputClass} value={formData.sales_rep}/></div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex rounded overflow-hidden"><label className={labelClass}>指示日</label><input type="text" className={inputClass} value={formData.order_date}/></div>
                            <div className="flex rounded overflow-hidden"><label className={labelClass}>納期</label><input type="text" className={inputClass} value={formData.delivery_date}/></div>
                            <div className="flex rounded overflow-hidden"><label className={labelClass}>数量</label><input className={inputClass} value={`${formData.quantity} ${formData.unit}`}/></div>
                        </div>
                    </div>
                </div>

                {/* 工程指示 */}
                <div className="grid grid-cols-1 gap-4">
                    <h3 className="font-black text-slate-800 border-l-4 border-slate-800 pl-3 flex items-center justify-between">
                        工程別詳細指示
                        <button className="text-xs text-blue-600 bg-white px-3 py-1 rounded border border-blue-200 hover:bg-blue-50">+ 工程を追加</button>
                    </h3>
                    <div className="grid grid-cols-5 gap-4">
                        {sections.map((s, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                <div className={`${s.color} text-white p-3 font-bold text-center text-sm`}>{s.name}</div>
                                <div className="p-4 flex-1 space-y-2">
                                    {s.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <ChevronRight className="w-3 h-3 text-slate-400"/>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                                <button className="p-2 text-[10px] font-bold text-slate-400 border-t hover:bg-slate-50 transition-colors uppercase">Edit Details</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 仕様・特記事項 */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <h4 className="font-bold text-sm text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">仕様・特記事項</h4>
                    <textarea 
                        className="w-full h-32 p-4 text-sm font-bold border border-slate-200 rounded focus:border-blue-500 outline-none bg-slate-50"
                        value={formData.specification}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductionOrderForm;
