import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Save,
    Send,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Copy,
    ArrowLeft,
    Clock,
    FileText,
    Calculator,
    CheckCircle,
    Sparkles,
    AlertTriangle,
    Upload,
} from '../Icons';
import { Customer, Estimate, Project, EstimateDetail, Toast } from '../../types';
import * as dataService from '../../services/dataService';
import EstimatePdfImportModal from '../EstimatePdfImportModal';
import { ExtractedEstimate } from '../../services/geminiService';

// ---------- Types ----------
interface ItemDetail {
    id: string;
    majorCategory: string;
    middleCategory: string;
    size: string;
    details: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxType: '課税' | '非課税';
    taxCategory: '外税' | '内税';
    taxRate: number;
    vq: number;
    mRate: number;
}

interface DetailedEstimateFormProps {
    estimateId?: string;
    initialData?: Partial<Estimate>;
    onBack: () => void;
    onSaveSuccess: () => void;
    addToast?: (message: string, type: Toast['type']) => void;
}

// ---------- Helpers ----------
const MAJOR_CATEGORIES = ['印刷', '製版', '用紙', '製本', '加工', '物流', 'デザイン', 'DTP', 'その他'];
const MIDDLE_CATEGORIES: Record<string, string[]> = {
    '印刷': ['本文', '表紙', 'カバー', '帯', 'チラシ'],
    '製版': ['CTP', 'フィルム', '刷版'],
    '用紙': ['本文用紙', '表紙用紙', '特殊紙'],
    '製本': ['無線綴じ', '中綴じ', 'ハードカバー'],
    '加工': ['PP加工', '箔押し', 'エンボス', 'UV'],
    '物流': ['発送', '保管', '梱包', '本文', '本文1'],
    'デザイン': ['表紙', '本文', 'DTP'],
    'DTP': ['組版', '校正', 'データ作成'],
    'その他': ['その他'],
};

const createEmptyItem = (): ItemDetail => ({
    id: Math.random().toString(36).substr(2, 9),
    majorCategory: '',
    middleCategory: '',
    size: '',
    details: '',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    taxType: '課税',
    taxCategory: '外税',
    taxRate: 10,
    vq: 0,
    mRate: 0,
});

const calcMRate = (amount: number, vq: number): number => {
    if (amount <= 0) return 0;
    const mq = amount - vq;
    return Math.round((mq / amount) * 1000) / 10; // 1 decimal
};

// ---------- Component ----------
const DetailedEstimateForm: React.FC<DetailedEstimateFormProps> = ({
    estimateId,
    initialData,
    onBack,
    onSaveSuccess,
    addToast,
}) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // PDF import
    const [showPdfImport, setShowPdfImport] = useState(false);

    // Basic info
    const [formData, setFormData] = useState({
        estimateCode: initialData?.pattern_no || '',
        title: initialData?.title || '',
        customerId: initialData?.project_id || '',
        customerName: initialData?.customerName || '',
        classification: '',
        deptCode: '',
        deptName: '',
        productClass: '2',
        productClassName: 'チラシ',
        patternName: 'パターン1',

        estimateDate: new Date().toISOString().split('T')[0],
        purchaseDate: '',
        orderDate: '',
        productionDate: '',
        billingDate: '',
        deliveryDate: initialData?.delivery_date || '',

        deliveryPlace: initialData?.delivery_place || '',
        transactionMethod: initialData?.transaction_method || '',
        expirationDate: initialData?.expiration_date || '',

        specification: initialData?.specification || initialData?.notes || '',

        pages: 0,
        size: '',
        binding: '未選択',
        copies: 0,

        notes: initialData?.notes || '',
        rounding: '四捨五入',
    });

    // Items
    const [items, setItems] = useState<ItemDetail[]>([
        {
            id: '1',
            majorCategory: '物流',
            middleCategory: '本文',
            size: '',
            details: '在庫保管料',
            quantity: 1,
            unitPrice: 10000,
            amount: 10000,
            taxType: '課税',
            taxCategory: '外税',
            taxRate: 10,
            vq: 0,
            mRate: 100,
        },
        {
            id: '2',
            majorCategory: '物流',
            middleCategory: '本文1',
            size: '',
            details: '神奈川県発送 100サイズ・80サイズ',
            quantity: 1,
            unitPrice: 1700,
            amount: 1700,
            taxType: '課税',
            taxCategory: '外税',
            taxRate: 10,
            vq: 1350,
            mRate: 20.6,
        },
    ]);

    // ---------- Calculations ----------
    const totals = useMemo(() => {
        const subtotal = items.reduce((s, i) => s + i.amount, 0);
        const tax = Math.floor(subtotal * 0.1);
        const total = subtotal + tax;
        const vq = items.reduce((s, i) => s + i.vq, 0);
        const mq = subtotal - vq;
        const mRate = subtotal > 0 ? (mq / subtotal) * 100 : 0;
        return { subtotal, tax, total, vq, mq, mRate };
    }, [items]);

    const unitPrice = useMemo(() => {
        if (formData.copies > 0 && totals.subtotal > 0) {
            return Math.round((totals.subtotal / formData.copies) * 100) / 100;
        }
        return 0;
    }, [totals.subtotal, formData.copies]);

    // ---------- Data loading ----------
    useEffect(() => {
        dataService.getCustomers().then(setCustomers).catch(console.error);
    }, []);

    // ---------- Field handlers ----------
    const updateField = useCallback((field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleUpdateItem = useCallback((id: string, updates: Partial<ItemDetail>) => {
        setItems(prev =>
            prev.map(item => {
                if (item.id !== id) return item;
                const updated = { ...item, ...updates };
                // Auto-calc amount
                if ('quantity' in updates || 'unitPrice' in updates) {
                    updated.amount = updated.quantity * updated.unitPrice;
                }
                // Auto-calc M率
                if ('quantity' in updates || 'unitPrice' in updates || 'vq' in updates) {
                    updated.mRate = calcMRate(updated.amount, updated.vq);
                }
                return updated;
            })
        );
    }, []);

    const handleAddItem = useCallback(() => {
        setItems(prev => [...prev, createEmptyItem()]);
    }, []);

    const handleDeleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const handleMoveItem = useCallback((id: string, direction: 'up' | 'down') => {
        setItems(prev => {
            const idx = prev.findIndex(i => i.id === id);
            if (idx < 0) return prev;
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= prev.length) return prev;
            const next = [...prev];
            [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
            return next;
        });
    }, []);

    const handleDuplicateItem = useCallback((id: string) => {
        setItems(prev => {
            const idx = prev.findIndex(i => i.id === id);
            if (idx < 0) return prev;
            const copy = { ...prev[idx], id: Math.random().toString(36).substr(2, 9) };
            const next = [...prev];
            next.splice(idx + 1, 0, copy);
            return next;
        });
    }, []);

    // ---------- Save ----------
    const handleSave = async (status: 'draft' | 'submitted' = 'draft') => {
        setIsSubmitting(true);
        setSaveMessage(null);
        try {
            const estimatePayload: Partial<Estimate> = {
                id: estimateId || undefined,
                title: formData.title || '無題の見積',
                delivery_date: formData.deliveryDate || null,
                pattern_no: formData.estimateCode || null,
                specification: formData.specification || null,
                delivery_place: formData.deliveryPlace || null,
                transaction_method: formData.transactionMethod || null,
                expiration_date: formData.expirationDate || null,
                notes: formData.notes || formData.specification || null,
                status: status as any,
                subtotal: totals.subtotal,
                total: totals.total,
                consumption: totals.tax,
                copies: String(formData.copies || 0),
                unit_price: String(unitPrice),
                tax_rate: '10',
                customerName: formData.customerName || '未設定',
                project_id: formData.customerId || null,
            };

            const detailsPayload: Partial<EstimateDetail>[] = items.map(item => ({
                itemName: item.details || `${item.majorCategory} ${item.middleCategory}`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.amount,
                variableCost: item.vq,
                note: [item.majorCategory, item.middleCategory, item.size].filter(Boolean).join(' | '),
            }));

            await dataService.saveDetailedEstimate(estimatePayload, detailsPayload);

            const msg = status === 'draft' ? '仮勘定として保存しました' : '承認依頼を送信しました';
            setSaveMessage(msg);
            addToast?.(msg, 'success');

            // Stay on form — don't navigate away for draft
            if (status === 'submitted') {
                setTimeout(() => onSaveSuccess(), 600);
            }
        } catch (error: any) {
            const errMsg = error?.message || '保存に失敗しました';
            setSaveMessage(errMsg);
            addToast?.(errMsg, 'error');
            console.error('Save failed', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ---------- PDF Import ----------
    const handlePdfImportApply = (extractedList: ExtractedEstimate[]) => {
        if (!extractedList.length) return;

        const first = extractedList[0];
        setFormData(prev => ({
            ...prev,
            title: first.title || prev.title,
            customerName: first.customerName || prev.customerName,
            specification: first.specification || prev.specification,
            copies: first.copies || prev.copies,
            deliveryPlace: first.deliveryPlace || prev.deliveryPlace,
            deliveryDate: first.deliveryDate || prev.deliveryDate,
            expirationDate: first.expirationDate || prev.expirationDate,
            transactionMethod: first.transactionMethod || prev.transactionMethod,
            notes: first.notes || prev.notes,
        }));

        const newItems: ItemDetail[] = extractedList.flatMap(d =>
            (d.items || []).map(it => ({
                id: Math.random().toString(36).substr(2, 9),
                majorCategory: 'その他',
                middleCategory: 'その他',
                size: '',
                details: it.description,
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 0,
                amount: it.amount || (it.quantity || 1) * (it.unitPrice || 0),
                taxType: '課税' as const,
                taxCategory: '外税' as const,
                taxRate: 10,
                vq: 0,
                mRate: calcMRate(it.amount || (it.quantity || 1) * (it.unitPrice || 0), 0),
            }))
        );

        if (newItems.length > 0) {
            setItems(prev => [...prev, ...newItems]);
        }

        addToast?.(`${extractedList.length}件のPDFから${newItems.length}件の明細をインポートしました。`, 'success');
    };

    // ---------- Styles ----------
    const labelClass = 'bg-blue-800 text-white px-3 py-2 text-xs font-bold w-32 flex items-center shrink-0 shadow-sm';
    const inputClass = 'flex-1 border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-800 focus:outline-none transition-all';

    const dateFields = [
        { label: '見積期日', key: 'estimateDate' },
        { label: '購買期日', key: 'purchaseDate' },
        { label: '受注期日', key: 'orderDate' },
        { label: '生産期日', key: 'productionDate' },
        { label: '請求期日', key: 'billingDate' },
        { label: '納品期日', key: 'deliveryDate' },
    ] as const;

    // ---------- Render ----------
    return (
        <div className="bg-slate-100 min-h-screen pb-20 selection:bg-blue-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            見積番号: <span className="text-blue-800">{formData.estimateCode || '新規'}</span>
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Detailed Estimate — 仮勘定 (Provisional)
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {saveMessage && (
                        <span className="text-sm font-bold text-emerald-600 animate-pulse">{saveMessage}</span>
                    )}
                    <button
                        onClick={() => setShowPdfImport(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded font-bold shadow-sm transition-all active:scale-95 text-sm flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        PDFインポート
                    </button>
                    <button
                        onClick={() => handleSave('draft')}
                        disabled={isSubmitting}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded font-bold shadow-sm transition-all active:scale-95 text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? '保存中...' : '仮保存'}
                    </button>
                    <button
                        onClick={() => handleSave('submitted')}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-sm transition-all active:scale-95 text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        承認依頼
                    </button>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto p-8 space-y-4">
                {/* ====== BASIC INFO ====== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {/* 品名 */}
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>品名</label>
                            <input
                                className={inputClass}
                                value={formData.title}
                                onChange={e => updateField('title', e.target.value)}
                                placeholder="オフィスステーションPro 在庫保管・発送費"
                            />
                        </div>
                        {/* お客様名 */}
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>お客様名</label>
                            <select
                                className={inputClass}
                                value={formData.customerId}
                                onChange={e => {
                                    const cust = customers.find(c => c.id === e.target.value);
                                    updateField('customerId', e.target.value);
                                    updateField('customerName', cust?.customer_name || cust?.customerName || '');
                                }}
                            >
                                <option value="">選択してください</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.customer_name || c.customerName}</option>
                                ))}
                            </select>
                        </div>
                        {/* 分類項目 */}
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>分類項目</label>
                            <select className={inputClass} value={formData.classification} onChange={e => updateField('classification', e.target.value)}>
                                <option value="">未選択</option>
                                <option value="print">印刷物</option>
                                <option value="logistics">物流</option>
                                <option value="design">デザイン</option>
                            </select>
                        </div>
                        {/* 部門 */}
                        <div className="flex gap-4">
                            <div className="flex-1 flex overflow-hidden rounded shadow-sm">
                                <label className={labelClass}>部門コード</label>
                                <input className={inputClass} value={formData.deptCode} onChange={e => updateField('deptCode', e.target.value)} />
                            </div>
                        </div>
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>部門表示名</label>
                            <input className={inputClass} value={formData.deptName} onChange={e => updateField('deptName', e.target.value)} />
                        </div>
                        {/* 商品分類 */}
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>商品分類</label>
                            <input className={inputClass} value={formData.productClass} onChange={e => updateField('productClass', e.target.value)} />
                        </div>
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>商品分類名</label>
                            <input className={inputClass} value={formData.productClassName} onChange={e => updateField('productClassName', e.target.value)} />
                        </div>
                    </div>

                    {/* ====== DATES ====== */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <button className="bg-blue-600 text-white px-3 py-1 text-sm font-bold flex items-center gap-2 rounded shadow-md">
                                {formData.patternName} <Plus className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {dateFields.map((d, i) => (
                                <div key={i} className="flex overflow-hidden rounded shadow-sm">
                                    <label className={labelClass}>{d.label}</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={(formData as any)[d.key] || ''}
                                        onChange={e => updateField(d.key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex overflow-hidden rounded shadow-sm">
                                <label className={labelClass}>納入場所</label>
                                <input className={inputClass} value={formData.deliveryPlace} onChange={e => updateField('deliveryPlace', e.target.value)} />
                            </div>
                            <div className="flex overflow-hidden rounded shadow-sm">
                                <label className={labelClass}>取引方法</label>
                                <input className={inputClass} value={formData.transactionMethod} onChange={e => updateField('transactionMethod', e.target.value)} />
                            </div>
                            <div className="flex overflow-hidden rounded shadow-sm">
                                <label className={labelClass}>有効期限</label>
                                <input type="date" className={inputClass} value={formData.expirationDate} onChange={e => updateField('expirationDate', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== SPECIFICATION ====== */}
                <div className="flex overflow-hidden rounded shadow-sm mt-4">
                    <label className={`${labelClass} h-auto items-start pt-3`}>仕様</label>
                    <textarea
                        className={`${inputClass} h-24`}
                        value={formData.specification}
                        onChange={e => updateField('specification', e.target.value)}
                        placeholder="仕様詳細を入力..."
                    />
                </div>

                {/* ====== METRICS ROW ====== */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>頁数</label>
                            <input type="number" className={inputClass} value={formData.pages || ''} onChange={e => updateField('pages', Number(e.target.value))} />
                        </div>
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>サイズ</label>
                            <input className={inputClass} value={formData.size} onChange={e => updateField('size', e.target.value)} placeholder="A4, B5..." />
                        </div>
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>綴じ</label>
                            <select className={inputClass} value={formData.binding} onChange={e => updateField('binding', e.target.value)}>
                                <option>未選択</option>
                                <option>中綴じ</option>
                                <option>無線綴じ</option>
                                <option>平綴じ</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>部数(部)</label>
                            <input type="number" className={inputClass} value={formData.copies || ''} onChange={e => updateField('copies', Number(e.target.value))} />
                        </div>
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>単価</label>
                            <input className={inputClass} value={unitPrice > 0 ? `¥${unitPrice.toLocaleString()}` : '—'} readOnly />
                        </div>
                        <div className="flex overflow-hidden rounded shadow-sm">
                            <label className={labelClass}>金額</label>
                            <input className={inputClass} value={`¥${totals.subtotal.toLocaleString()}`} readOnly />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-2">
                    <div className="flex overflow-hidden rounded shadow-sm w-[33%]">
                        <label className={`${labelClass} bg-blue-800 opacity-80`}>消費税込金額</label>
                        <input className={`${inputClass} font-bold text-right`} value={`¥${totals.total.toLocaleString()}`} readOnly />
                    </div>
                </div>

                {/* ====== ITEMS TABLE ====== */}
                <div className="bg-white rounded shadow-md overflow-hidden mt-8 border border-gray-200">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-blue-800 text-white">
                            <tr>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[100px]">大項目</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[100px]">中項目</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[60px]">サイズ</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[200px]">詳細</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[50px]">数量</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[80px]">単価</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[80px]">課税区分</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[80px]">税区分</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[60px]">消費税率</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[90px]">金額</th>
                                <th className="py-2 px-1 border-r border-blue-900 min-w-[80px]">VQ</th>
                                <th className="py-2 px-1 min-w-[70px]">M率</th>
                                <th className="w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    {/* 大項目 */}
                                    <td className="p-1">
                                        <select
                                            className="w-full border p-1 rounded text-xs"
                                            value={item.majorCategory}
                                            onChange={e => {
                                                handleUpdateItem(item.id, { majorCategory: e.target.value, middleCategory: '' });
                                            }}
                                        >
                                            <option value="">選択</option>
                                            {MAJOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    {/* 中項目 */}
                                    <td className="p-1">
                                        <select
                                            className="w-full border p-1 rounded text-xs"
                                            value={item.middleCategory}
                                            onChange={e => handleUpdateItem(item.id, { middleCategory: e.target.value })}
                                        >
                                            <option value="">選択</option>
                                            {(MIDDLE_CATEGORIES[item.majorCategory] || []).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    {/* サイズ */}
                                    <td className="p-1">
                                        <input
                                            className="w-full border p-1 rounded text-xs"
                                            value={item.size}
                                            onChange={e => handleUpdateItem(item.id, { size: e.target.value })}
                                        />
                                    </td>
                                    {/* 詳細 */}
                                    <td className="p-1 text-left">
                                        <input
                                            className="w-full border p-1 rounded text-xs"
                                            value={item.details}
                                            onChange={e => handleUpdateItem(item.id, { details: e.target.value })}
                                            placeholder="詳細を入力..."
                                        />
                                    </td>
                                    {/* 数量 */}
                                    <td className="p-1">
                                        <input
                                            type="number"
                                            className="w-full border p-1 rounded text-right text-xs"
                                            value={item.quantity}
                                            onChange={e => handleUpdateItem(item.id, { quantity: Number(e.target.value) || 0 })}
                                        />
                                    </td>
                                    {/* 単価 */}
                                    <td className="p-1">
                                        <input
                                            type="number"
                                            className="w-full border p-1 rounded text-right text-xs"
                                            value={item.unitPrice}
                                            onChange={e => handleUpdateItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                                        />
                                    </td>
                                    {/* 課税区分 */}
                                    <td className="p-1">
                                        <select
                                            className="w-full border p-1 rounded text-xs"
                                            value={item.taxType}
                                            onChange={e => handleUpdateItem(item.id, { taxType: e.target.value as any })}
                                        >
                                            <option>課税</option>
                                            <option>非課税</option>
                                        </select>
                                    </td>
                                    {/* 税区分 */}
                                    <td className="p-1">
                                        <select
                                            className="w-full border p-1 rounded text-xs"
                                            value={item.taxCategory}
                                            onChange={e => handleUpdateItem(item.id, { taxCategory: e.target.value as any })}
                                        >
                                            <option>外税</option>
                                            <option>内税</option>
                                        </select>
                                    </td>
                                    {/* 消費税率 */}
                                    <td className="p-1">
                                        <select
                                            className="w-full border p-1 rounded text-right text-xs"
                                            value={item.taxRate}
                                            onChange={e => handleUpdateItem(item.id, { taxRate: Number(e.target.value) })}
                                        >
                                            <option value={10}>10%</option>
                                            <option value={8}>8%</option>
                                            <option value={0}>0%</option>
                                        </select>
                                    </td>
                                    {/* 金額 */}
                                    <td className="p-1 font-bold text-right pr-2">¥{item.amount.toLocaleString()}</td>
                                    {/* VQ */}
                                    <td className="p-1">
                                        <input
                                            type="number"
                                            className="w-full border p-1 rounded text-right text-xs"
                                            value={item.vq}
                                            onChange={e => handleUpdateItem(item.id, { vq: Number(e.target.value) || 0 })}
                                        />
                                    </td>
                                    {/* M率 */}
                                    <td className={`p-1 font-bold text-xs ${item.mRate > 40 ? 'bg-emerald-100 text-emerald-800' : item.mRate > 15 ? 'bg-amber-50 text-amber-700' : 'bg-rose-100 text-rose-800'}`}>
                                        {item.mRate.toFixed(1)}%
                                    </td>
                                    {/* Actions */}
                                    <td className="p-1">
                                        <div className="flex gap-0.5 justify-center">
                                            <button
                                                className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                                onClick={() => handleMoveItem(item.id, 'up')}
                                                disabled={index === 0}
                                                title="上へ"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                            </button>
                                            <button
                                                className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                                                onClick={() => handleMoveItem(item.id, 'down')}
                                                disabled={index === items.length - 1}
                                                title="下へ"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                            <button
                                                className="p-1 bg-blue-100 rounded hover:bg-blue-200 text-blue-600"
                                                onClick={() => handleDuplicateItem(item.id)}
                                                title="複製"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                                className="p-1 bg-rose-500 text-white rounded hover:bg-rose-600"
                                                onClick={() => handleDeleteItem(item.id)}
                                                title="削除"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {/* Subtotal row */}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td colSpan={9} className="py-2 text-right pr-4">小計</td>
                                <td className="text-right pr-2 text-sm italic">¥{totals.subtotal.toLocaleString()}</td>
                                <td className="text-right pr-2 text-sm text-rose-600">¥{totals.vq.toLocaleString()}</td>
                                <td className={`text-sm font-bold ${totals.mRate > 40 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {totals.mRate.toFixed(1)}%
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="p-4 flex gap-4">
                        <button
                            className="bg-white border-2 border-dashed border-gray-300 text-gray-500 px-6 py-2 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-2 transition-all"
                            onClick={handleAddItem}
                        >
                            <Plus className="w-4 h-4" /> 明細行を追加
                        </button>
                    </div>
                </div>

                {/* ====== SUMMARY & CHART ====== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex border-b pb-1 font-bold text-gray-600 uppercase tracking-tighter text-[10px]">会計集計</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-gray-500">小計</span>
                                    <span className="text-xl font-bold font-mono">¥{totals.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-gray-500">消費税</span>
                                    <span className="text-xl font-bold font-mono">¥{totals.tax.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-end border-t-2 border-blue-800 pt-2">
                                    <span className="text-sm font-black text-blue-800">合計金額</span>
                                    <span className="text-3xl font-black font-mono text-blue-800">¥{totals.total.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex border-b pb-1 font-bold text-gray-600 uppercase tracking-tighter text-[10px]">利益管理 (MQ)</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-emerald-600">端数処理</span>
                                    <select className="text-xs border p-1 rounded" value={formData.rounding} onChange={e => updateField('rounding', e.target.value)}>
                                        <option>四捨五入</option>
                                        <option>切り捨て</option>
                                    </select>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-rose-500">VQ (変動費)</span>
                                    <span className="text-xl font-bold font-mono text-rose-600">¥{totals.vq.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-end border-t-2 border-emerald-500 pt-2">
                                    <span className="text-sm font-black text-emerald-600">MQ (粗利)</span>
                                    <span className="text-3xl font-black font-mono text-emerald-600">¥{totals.mq.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        {/* Provisional status badge */}
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">仮勘定ステータス</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    この見積はドラフト（仮勘定）として保存されます。仕訳レビュー・BS反映前に最終承認が必要です。
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="bg-blue-800 text-white px-4 py-1 text-xs font-bold inline-block mb-4 rounded-t">承認フロー</div>
                            <div className="bg-slate-50 border border-gray-200 p-4 rounded flex items-center gap-6">
                                <div className="text-sm font-bold text-gray-700 font-mono">橋本　昭市</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="bg-blue-800 text-white px-4 py-2 text-xs font-bold inline-block mb-4 rounded shadow-md w-24 text-center">VQグラフ</div>
                        <div className="flex-1 flex gap-2 h-full min-h-[300px] overflow-hidden rounded-xl border border-gray-200 shadow-inner p-6 bg-gray-50">
                            {/* PQ Block */}
                            <div className="flex-1 bg-yellow-400 flex flex-col items-center justify-center p-4 rounded-lg shadow-md transition-transform hover:scale-[1.02]">
                                <span className="text-3xl font-black text-gray-800">PQ</span>
                                <span className="text-4xl font-black font-mono text-gray-900 mt-2">{totals.total.toLocaleString()}</span>
                            </div>
                            <div className="w-[45%] flex flex-col gap-2">
                                {/* VQ Block */}
                                <div
                                    className="bg-red-300 flex items-center justify-center p-3 rounded-lg shadow-md"
                                    style={{ height: `${Math.max(20, Math.min(60, (totals.vq / (totals.total || 1)) * 100))}%` }}
                                >
                                    <div className="text-center">
                                        <div className="text-xl font-black text-white">VQ</div>
                                        <div className="text-2xl font-black font-mono text-white">{totals.vq.toLocaleString()}</div>
                                    </div>
                                </div>
                                {/* MQ Block */}
                                <div className="flex-1 bg-green-500 flex flex-col items-center justify-center p-3 rounded-lg shadow-md">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-white">MQ</div>
                                        <div className="text-4xl font-black font-mono text-white mt-1">{totals.mq.toLocaleString()}</div>
                                    </div>
                                    <div className="mt-4 bg-white/20 px-6 py-2 rounded-full backdrop-blur-sm">
                                        <span className="text-2xl font-black text-white">M率 {Math.round(totals.mRate)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Bottom save buttons */}
                        <div className="flex mt-6 gap-4">
                            <button
                                onClick={() => handleSave('draft')}
                                disabled={isSubmitting}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-black text-lg shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {isSubmitting ? '保存中...' : '仮保存（ドラフト）'}
                            </button>
                            <button
                                onClick={() => handleSave('submitted')}
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-lg shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send className="w-5 h-5" />
                                承認依頼
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <EstimatePdfImportModal
                isOpen={showPdfImport}
                onClose={() => setShowPdfImport(false)}
                onImport={handlePdfImportApply}
                addToast={addToast || (() => {})}
            />

            <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                    opacity: 0.5;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default DetailedEstimateForm;
