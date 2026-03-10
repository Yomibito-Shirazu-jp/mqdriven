import React, { useState } from 'react';
import { ArrowLeft, Printer, Download, Mail, MoreHorizontal, FileText } from 'lucide-react';

const DeliverySlipForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [formData, setFormData] = useState({
        slip_no: 'D92104',
        delivery_date: '2026/02/12',
        customer_name: '株式会社エフアンドエム',
        customer_address: '大阪府吹田市江坂町1-23-38 F&Mビル',
        project_name: 'オフィスステーションPro 在庫保管・発送費 (2026年 2月)',
        
        subtotal: 14460,
        tax: 1446,
        total: 15906,
        
        notes: 'いつも大変お世話になっております。本件納品申し上げます。'
    });

    const items = [
        { id: '1', name: '在庫保管料', qty: 1, unit: '式', price: 10000, amount: 10000 },
        { id: '2', name: '神奈川県発送 100サイズ・80サイズ', qty: 1, unit: '式', price: 1700, amount: 1700 },
        { id: '3', name: 'ピッキング手数料', qty: 7, unit: '回', price: 400, amount: 2760 }
    ];

    return (
        <div className="bg-[#f0f2f5] min-h-screen pb-20 font-sans">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft/></button>
                    <h1 className="text-xl font-black text-slate-800">納品伝票 <span className="text-blue-600 ml-2">No: {formData.slip_no}</span></h1>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border text-slate-700 px-4 py-2 font-bold text-sm rounded shadow-sm hover:bg-gray-50 flex items-center gap-2"><Download className="w-4 h-4"/> PDF</button>
                    <button className="bg-blue-600 text-white px-6 py-2 font-bold text-sm rounded shadow-lg hover:bg-blue-700 flex items-center gap-2"><Printer className="w-4 h-4"/> 納品書発行</button>
                </div>
            </header>

            <div className="max-w-[1000px] mx-auto my-10 bg-white shadow-2xl rounded-sm p-16 border border-gray-200 min-h-[1200px] flex flex-col relative overflow-hidden">
                {/* 装飾 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 z-0"></div>

                <div className="flex justify-between items-start mb-20 z-10">
                    <div className="space-y-6">
                        <h2 className="text-5xl font-black tracking-tighter text-slate-900 border-b-8 border-slate-900 pb-4 inline-block">納品書</h2>
                        <div className="space-y-1">
                            <p className="text-2xl font-bold border-b-2 border-slate-400 pb-2 mb-4 w-[400px]">{formData.customer_name} 御中</p>
                            <p className="text-xs text-slate-500 font-bold leading-relaxed">{formData.customer_address}</p>
                        </div>
                    </div>
                    <div className="text-right space-y-4">
                        <div className="text-xs font-bold text-slate-400 space-y-1">
                            <p>納品日： {formData.delivery_date}</p>
                            <p>伝票番号： {formData.slip_no}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-black text-slate-900">文唱堂印刷株式会社</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Logistics Center</p>
                        </div>
                    </div>
                </div>

                <div className="mb-12 bg-slate-900 text-white p-8 rounded flex justify-between items-center shadow-xl">
                    <span className="text-sm font-bold opacity-70 tracking-widest uppercase">御請求合計金額（税込）</span>
                    <p className="text-5xl font-black font-mono">¥{formData.total.toLocaleString()} <span className="text-xl font-normal opacity-50 ml-2">-</span></p>
                </div>

                <div className="flex-1">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-900 text-[11px] font-black uppercase tracking-widest text-slate-600">
                                <th className="py-4 px-4 text-left">品名・内容</th>
                                <th className="py-4 px-4 text-center w-24">数量</th>
                                <th className="py-4 px-4 text-center w-16">単位</th>
                                <th className="py-4 px-4 text-right w-32">単価</th>
                                <th className="py-4 px-4 text-right w-40">金額</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 italic">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-6 px-4 font-bold text-slate-800">{item.name}</td>
                                    <td className="py-6 px-4 text-center font-mono font-bold">{item.qty}</td>
                                    <td className="py-6 px-4 text-center font-bold text-slate-500">{item.unit}</td>
                                    <td className="py-6 px-4 text-right font-mono font-bold text-slate-600">¥{item.price.toLocaleString()}</td>
                                    <td className="py-6 px-4 text-right font-mono font-bold text-slate-900">¥{item.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-auto pt-10 border-t-2 border-slate-100">
                    <div className="flex justify-end mb-10">
                        <div className="w-[300px] space-y-3 font-bold">
                            <div className="flex justify-between text-slate-500 border-b border-slate-50 pb-1"><span>小計</span><span>¥{formData.subtotal.toLocaleString()}</span></div>
                            <div className="flex justify-between text-slate-500 border-b border-slate-50 pb-1"><span>消費税(10%)</span><span>¥{formData.tax.toLocaleString()}</span></div>
                            <div className="flex justify-between text-2xl text-slate-900 pt-2 border-t-2 border-slate-900"><span>合計</span><span>¥{formData.total.toLocaleString()}</span></div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded border border-slate-100 text-xs font-bold text-slate-500 leading-relaxed shadow-inner">
                        <FileText className="w-4 h-4 mb-2 text-slate-400"/>
                        {formData.notes}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliverySlipForm;
