import React, { useState, useMemo } from 'react';
import { Save, FileText, ArrowLeft, Trash2, Plus, ChevronUp } from 'lucide-react';

// 画像2枚目（受注入力）に準拠
const OrderForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [formData, setFormData] = useState({
        order_no: '38760',
        project_name: 'オフィスステーションPro 在庫保管・発送費 (2026年 2月)',
        customer_name: '株式会社エフアンドエム',
        classification: '未選択',
        dept_code: '',
        dept_name: '',
        product_class: '2チラシ',
        pattern_name: 'パターン1',
        
        // 期日
        estimate_date: '',
        purchase_date: '',
        order_date: '2026/02/05',
        production_date: '',
        billing_date: '',
        delivery_date: '2026/02/05',
        
        delivery_place: '',
        transaction_method: '振込',
        
        specification: 'パンフレット、セミナー用備品の保管\n発送7件',
        
        // メトリクス
        pages: 0,
        size: '特寸',
        copies: 7,
        unit_price: 2065.71,
        amount: 14460,
        tax_amount: 1446,
        total_amount: 15906,
        
        vq: 1350,
        mq: 13110,
        m_rate: 90.7
    });

    const [items, setItems] = useState([
        { id: '1', major: '物流', middle: '本文', details: '在庫保管料', qty: 1, price: 10000, amount: 10000, vq: 0, m_rate: 100 },
        { id: '2', major: '物流', middle: '本文1', details: '神奈川県発送 100サイズ・80サイズ', qty: 1, price: 1700, amount: 1700, vq: 1350, m_rate: 20.6 }
    ]);

    const labelClass = "bg-[#d35400] text-white px-3 py-2 text-xs font-bold w-32 flex items-center shrink-0";
    const inputClass = "flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-[#d35400] outline-none";

    return (
        <div className="bg-[#fdf2e9] min-h-screen pb-10">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                    <h1 className="text-xl font-bold text-gray-900">
                        受注入力 <span className="text-[#d35400] ml-2">No: {formData.order_no}</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-gray-300 px-4 py-2 font-bold text-sm rounded shadow-sm">印刷</button>
                    <button className="bg-[#d35400] text-white px-6 py-2 font-bold text-sm rounded shadow-sm">受注確定</button>
                </div>
            </header>

            <div className="max-w-[1200px] mx-auto p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex rounded overflow-hidden shadow-sm">
                            <label className={labelClass}>品名</label>
                            <input className={inputClass} value={formData.project_name} />
                        </div>
                        <div className="flex rounded overflow-hidden shadow-sm">
                            <label className={labelClass}>客様名</label>
                            <input className={inputClass} value={formData.customer_name} />
                        </div>
                        <div className="flex rounded overflow-hidden shadow-sm">
                            <label className={labelClass}>商品分類</label>
                            <input className={inputClass} value={formData.product_class} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex rounded overflow-hidden shadow-sm col-span-2">
                            <label className={labelClass}>受注日</label>
                            <input type="text" className={inputClass} value={formData.order_date} />
                        </div>
                        <div className="flex rounded overflow-hidden shadow-sm col-span-2">
                            <label className={labelClass}>納品日</label>
                            <input type="text" className={inputClass} value={formData.delivery_date} />
                        </div>
                    </div>
                </div>

                <div className="flex rounded overflow-hidden shadow-sm">
                    <label className={`${labelClass} h-20 items-start pt-2`}>仕様</label>
                    <textarea className={`${inputClass} h-20`} value={formData.specification} />
                </div>

                <div className="bg-white rounded shadow-sm overflow-hidden mt-6">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-[#e67e22] text-white">
                            <tr>
                                <th className="py-2 px-1 border-r">大項目</th>
                                <th className="py-2 px-1 border-r">中項目</th>
                                <th className="py-2 px-1 border-r">詳細</th>
                                <th className="py-2 px-1 border-r w-16">数量</th>
                                <th className="py-2 px-1 border-r w-24">単価</th>
                                <th className="py-2 px-1 border-r w-24">金額</th>
                                <th className="py-2 px-1 w-16">M率</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-1">{item.major}</td>
                                    <td className="p-1">{item.middle}</td>
                                    <td className="p-1 text-left px-2">{item.details}</td>
                                    <td className="p-1">{item.qty}</td>
                                    <td className="p-1 text-right pr-2">¥{item.price.toLocaleString()}</td>
                                    <td className="p-1 text-right font-bold pr-2">¥{item.amount.toLocaleString()}</td>
                                    <td className="p-1 font-bold bg-orange-50 text-orange-800">{item.m_rate}%</td>
                                    <td className="p-1"><button className="text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-10 mt-6">
                    <div className="bg-white p-6 rounded shadow-sm border-t-4 border-[#d35400]">
                         <h4 className="font-bold text-sm mb-4">合計集計</h4>
                         <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span>小計</span><span className="font-mono">¥{formData.amount.toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span>消費税</span><span className="font-mono">¥{formData.tax_amount.toLocaleString()}</span></div>
                            <div className="flex justify-between text-xl font-bold border-t pt-2 text-[#d35400]"><span>合計</span><span className="font-mono">¥{formData.total_amount.toLocaleString()}</span></div>
                         </div>
                    </div>
                    <div className="bg-white p-6 rounded shadow-sm border-t-4 border-green-600">
                         <h4 className="font-bold text-sm mb-4">利益管理 (MQ)</h4>
                         <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span>VQ (変動費)</span><span className="font-mono text-red-600">¥{formData.vq.toLocaleString()}</span></div>
                            <div className="flex justify-between text-xl font-bold border-t pt-2 text-green-600"><span>MQ (利益)</span><span className="font-mono">¥{formData.mq.toLocaleString()}</span></div>
                            <div className="text-right text-xs font-bold text-green-700 mt-2">粗利率: {formData.m_rate}%</div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderForm;
