

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { extractInvoiceDetails } from '../services/geminiService';
import { getInboxItems, addInboxItem, updateInboxItem, deleteInboxItem, uploadFile } from '../services/dataService';
import { googleDriveService, GoogleDriveFile } from '../services/googleDriveService';
import { InboxItem, InvoiceData, InvoiceLineItem, InboxItemStatus, Toast, ConfirmationDialogProps } from '../types';
import { Upload, Loader, X, CheckCircle, Save, Trash2, AlertTriangle, RefreshCw } from './Icons';

interface InvoiceOCRProps {
    onSaveExpenses: (data: InvoiceData) => void;
    addToast: (message: string, type: Toast['type']) => void;
    requestConfirmation: (dialog: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => void;
    isAIOff: boolean;
}

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("ファイル読み取りに失敗しました。"));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const StatusBadge: React.FC<{ status: InboxItemStatus }> = ({ status }) => {
    const statusMap: Record<InboxItemStatus, { text: string; className: string }> = {
        [InboxItemStatus.Processing]: { text: '処理中', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
        [InboxItemStatus.PendingReview]: { text: '要確認', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
        [InboxItemStatus.Approved]: { text: '承認済', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        [InboxItemStatus.Error]: { text: 'エラー', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };
    const { text, className } = statusMap[status];
    return <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${className}`}>{text}</span>;
};

const guessDriveMimeType = (fileName: string, fallback = 'application/pdf'): string => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return fallback;
};

const InboxItemCard: React.FC<{
    item: InboxItem;
    onUpdate: (id: string, data: Partial<InboxItem>) => Promise<void>;
    onDelete: (item: InboxItem) => Promise<void>;
    onApprove: (item: InboxItem) => Promise<void>;
    requestConfirmation: (dialog: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => void;
}> = ({ item, onUpdate, onDelete, onApprove, requestConfirmation }) => {
    const [localData, setLocalData] = useState<InvoiceData | null>(item.extractedData);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    useEffect(() => {
        setLocalData(item.extractedData);
    }, [item.extractedData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!localData) return;
        const { name, value, type } = e.target;
        const target = e.target as HTMLInputElement;
        setLocalData({
            ...localData,
            [name]: type === 'checkbox' ? target.checked : (name === 'totalAmount' ? parseFloat(value) || 0 : value)
        });
    };

    const handleSave = async () => {
        if (!localData) return;
        setIsSaving(true);
        await onUpdate(item.id, { extractedData: localData });
        setIsSaving(false);
    };

    const handleDelete = async () => {
        requestConfirmation({
            title: 'ファイルを削除',
            message: `本当に「${item.fileName}」を削除しますか？この操作は元に戻せません。`,
            onConfirm: async () => {
                setIsDeleting(true);
                await onDelete(item);
            }
        });
    };

    const handleApprove = async () => {
        if (!localData) return;
        setIsApproving(true);
        const itemToApprove: InboxItem = {
            ...item,
            extractedData: localData,
        };
        await onApprove(itemToApprove);
        setIsApproving(false);
    };

    const ro = item.status === 'approved';
    const inputClass = "w-full text-sm bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500";


    return (
        <div className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border ${item.status === 'approved' ? 'border-green-300 dark:border-green-700' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="w-full h-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                        {item.mimeType === 'application/pdf' ? (
                            <iframe src={item.fileUrl} className="w-full h-96" title={item.fileName}></iframe>
                        ) : (
                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                <img src={item.fileUrl} alt={item.fileName} className="w-full h-auto object-contain" />
                            </a>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 truncate" title={item.fileName}>{item.fileName}</p>
                </div>
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <StatusBadge status={item.status} />
                        <div className="flex items-center gap-2">
                            {item.status === 'pending_review' && (
                                <button onClick={handleSave} disabled={isSaving} className="p-2 text-slate-500 hover:text-blue-600 disabled:opacity-50" aria-label="保存">
                                    {isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                </button>
                            )}
                            <button onClick={handleDelete} disabled={isDeleting} className="p-2 text-slate-500 hover:text-red-600 disabled:opacity-50" aria-label="削除">
                                {isDeleting ? <Loader className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    {item.status === 'processing' && <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-lg"><Loader className="w-8 h-8 animate-spin text-blue-500" /><p className="mt-2 text-slate-500">AIが解析中...</p></div>}
                    {item.status === 'error' && <div className="flex-1 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/30 rounded-lg p-4"><AlertTriangle className="w-8 h-8 text-red-500" /><p className="mt-2 text-red-700 dark:text-red-300 font-semibold">解析エラー</p><p className="text-sm text-red-600 dark:text-red-400 mt-1 text-center">{item.errorMessage}</p></div>}
                    {localData && (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {/* 書類種別 + 登録番号 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">書類種別</label>
                                    <input name="documentType" type="text" value={localData.documentType || ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">登録番号</label>
                                    <input name="registrationNumber" type="text" value={localData.registrationNumber || ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                            </div>
                            {/* 請求元 */}
                            <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-2">
                                <legend className="text-xs font-bold text-slate-500 px-1">請求元</legend>
                                <input name="vendorName" type="text" value={localData.vendorName || ''} onChange={handleChange} placeholder="企業名" className={inputClass} readOnly={ro} />
                                <div className="grid grid-cols-3 gap-2">
                                    <input name="vendorPostalCode" type="text" value={localData.vendorPostalCode || ''} onChange={handleChange} placeholder="〒" className={inputClass} readOnly={ro} />
                                    <input name="vendorAddress" type="text" value={localData.vendorAddress || ''} onChange={handleChange} placeholder="住所" className={`${inputClass} col-span-2`} readOnly={ro} />
                                </div>
                                <input name="vendorContact" type="text" value={localData.vendorContact || ''} onChange={handleChange} placeholder="TEL/FAX" className={inputClass} readOnly={ro} />
                            </fieldset>
                            {/* 請求先 */}
                            <fieldset className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-2">
                                <legend className="text-xs font-bold text-slate-500 px-1">請求先</legend>
                                <input name="recipientName" type="text" value={localData.recipientName || ''} onChange={handleChange} placeholder="宛先名" className={inputClass} readOnly={ro} />
                                <div className="grid grid-cols-3 gap-2">
                                    <input name="recipientPostalCode" type="text" value={localData.recipientPostalCode || ''} onChange={handleChange} placeholder="〒" className={inputClass} readOnly={ro} />
                                    <input name="recipientAddress" type="text" value={localData.recipientAddress || ''} onChange={handleChange} placeholder="住所" className={`${inputClass} col-span-2`} readOnly={ro} />
                                </div>
                            </fieldset>
                            {/* 日付 */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">発行日</label>
                                    <input name="invoiceDate" type="date" value={localData.invoiceDate || ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">締日</label>
                                    <input name="closingDate" type="date" value={localData.closingDate || ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">支払期限</label>
                                    <input name="dueDate" type="date" value={localData.dueDate || ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                            </div>
                            {/* 金額 */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">税抜金額</label>
                                    <input name="subtotalAmount" type="number" value={localData.subtotalAmount ?? ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">消費税</label>
                                    <input name="taxAmount" type="number" value={localData.taxAmount ?? ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">税込合計</label>
                                    <input name="totalAmount" type="number" value={localData.totalAmount ?? ''} onChange={handleChange} className={`${inputClass} font-bold`} readOnly={ro} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">源泉徴収税</label>
                                    <input name="withholdingTax" type="number" value={localData.withholdingTax ?? ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">値引/相殺</label>
                                    <input name="discountOffset" type="number" value={localData.discountOffset ?? ''} onChange={handleChange} className={inputClass} readOnly={ro} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">差引請求額</label>
                                    <input name="netAmount" type="number" value={localData.netAmount ?? ''} onChange={handleChange} className={`${inputClass} font-bold text-blue-700`} readOnly={ro} />
                                </div>
                            </div>
                            {/* 税込/税抜 + 勘定科目 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" name="taxInclusive" checked={localData.taxInclusive || false} onChange={handleChange} className="sr-only peer" disabled={ro} />
                                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        <span className="ms-2 text-xs font-medium text-gray-900 dark:text-gray-300">{localData.taxInclusive ? '内税' : '外税'}</span>
                                    </label>
                                    <span className={`px-2 py-0.5 rounded text-xs ${localData.costType === 'V' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {localData.costType === 'V' ? '変動費' : '固定費'}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">勘定科目</label>
                                    <input name="account" type="text" value={localData.account || ''} onChange={handleChange} placeholder="勘定科目" className={inputClass} readOnly={ro} />
                                </div>
                            </div>
                            {/* 内容 */}
                            <div>
                                <label className="text-xs font-medium text-slate-500">内容</label>
                                <textarea name="description" value={localData.description || ''} onChange={handleChange} rows={2} className={inputClass} readOnly={ro} />
                            </div>
                            {/* 振込先 */}
                            <div>
                                <label className="text-xs font-medium text-slate-500">振込先</label>
                                <input name="bankAccountRaw" type="text" value={localData.bankAccountRaw || ''} onChange={handleChange} placeholder="銀行名 支店名 口座番号" className={inputClass} readOnly={ro} />
                            </div>
                            {/* 明細行 (読み取り専用表示) */}
                            {localData.lineItems && localData.lineItems.length > 0 && (
                                <details className="border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <summary className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer hover:bg-slate-50">明細 ({localData.lineItems.length}件)</summary>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                                                <th className="px-2 py-1 text-left">品名</th>
                                                <th className="px-2 py-1 text-right">数量</th>
                                                <th className="px-2 py-1 text-right">単価</th>
                                                <th className="px-2 py-1 text-right">金額</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {localData.lineItems.map((li: InvoiceLineItem, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="px-2 py-1">{li.description}</td>
                                                        <td className="px-2 py-1 text-right">{li.quantity}{li.unit ? ` ${li.unit}` : ''}</td>
                                                        <td className="px-2 py-1 text-right">{li.unitPrice?.toLocaleString()}</td>
                                                        <td className="px-2 py-1 text-right font-medium">{li.amountExclTax?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            )}
                            {/* 備考 */}
                            <div>
                                <label className="text-xs font-medium text-slate-500">備考</label>
                                <textarea name="notes" value={localData.notes || ''} onChange={handleChange} rows={1} className={inputClass} readOnly={ro} />
                            </div>
                        </div>
                    )}
                    {item.status === 'pending_review' && (
                        <div className="mt-auto pt-4 flex gap-3">
                            <button onClick={handleApprove} disabled={isApproving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-blue-500/20 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed">
                                {isApproving ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                確定して仕訳に送る
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/** CSVテキストをInvoiceData[]にパースする */
const parseInvoiceCsv = (csvText: string): InvoiceData[] => {
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    // ヘッダー行をパース（BOM除去）
    const header = lines[0].replace(/^\uFEFF/, '');
    const cols = header.split(',');
    const ci = (name: string) => cols.indexOf(name);

    const parseNum = (v: string | undefined): number => {
        if (!v) return 0;
        return Number(v.replace(/[",円\s]/g, '')) || 0;
    };

    const parseDate = (v: string | undefined): string => {
        if (!v) return '';
        // YYYY/MM/DD → YYYY-MM-DD
        return v.replace(/\//g, '-').trim();
    };

    const results: InvoiceData[] = [];
    for (let i = 1; i < lines.length; i++) {
        // CSV行を分割（カンマ区切りだがダブルクォート内のカンマは無視）
        const row: string[] = [];
        let cur = '';
        let inQuote = false;
        for (const ch of lines[i]) {
            if (ch === '"') { inQuote = !inQuote; continue; }
            if (ch === ',' && !inQuote) { row.push(cur.trim()); cur = ''; continue; }
            cur += ch;
        }
        row.push(cur.trim());

        const get = (name: string): string => {
            const idx = ci(name);
            return idx >= 0 && idx < row.length ? row[idx] : '';
        };

        // 明細行を組み立て
        const lineItems: InvoiceLineItem[] = [];
        for (let n = 1; n <= 10; n++) {
            const desc = get(`明細${n}品名`);
            if (!desc) continue;
            lineItems.push({
                description: desc,
                quantity: parseNum(get(`明細${n}数量`)) || undefined,
                unitPrice: parseNum(get(`明細${n}単価`)) || undefined,
                amountExclTax: parseNum(get(`明細${n}金額`)) || undefined,
            });
        }

        const inv: InvoiceData = {
            imageNo: get('画像No'),
            documentType: get('書類種別') || '請求書',
            invoiceDate: parseDate(get('発行日')),
            closingDate: parseDate(get('締日')),
            dueDate: parseDate(get('支払期限')),
            vendorName: get('請求元名称'),
            registrationNumber: get('請求元登録番号'),
            vendorPostalCode: get('請求元郵便番号'),
            vendorAddress: get('請求元住所'),
            vendorContact: get('請求元連絡先'),
            recipientName: get('請求先名称'),
            recipientPostalCode: get('請求先郵便番号'),
            recipientAddress: get('請求先住所'),
            recipientContact: get('請求先連絡先'),
            subtotalAmount: parseNum(get('税抜金額')),
            taxAmount: parseNum(get('消費税額')),
            totalAmount: parseNum(get('税込合計')),
            withholdingTax: parseNum(get('源泉徴収税')),
            discountOffset: parseNum(get('値引き・繰越相殺')),
            netAmount: parseNum(get('差引請求額')),
            bankAccountRaw: get('振込先'),
            notes: get('備考'),
            lineItems,
            taxInclusive: true,
            costType: 'V',
            account: '',
            description: lineItems.length > 0 ? lineItems[0].description || '' : '',
        };
        // 差引請求額がなければ税込合計をセット
        if (!inv.netAmount) inv.netAmount = inv.totalAmount;
        results.push(inv);
    }
    return results;
};

const InvoiceOCR: React.FC<InvoiceOCRProps> = ({ onSaveExpenses, addToast, requestConfirmation, isAIOff }) => {
    const [items, setItems] = useState<InboxItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [showDriveModal, setShowDriveModal] = useState(false);
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
    const [selectedDriveFiles, setSelectedDriveFiles] = useState<string[]>([]);
    const [driveError, setDriveError] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [isDriveImporting, setIsDriveImporting] = useState(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const loadItems = useCallback(async () => {
        try {
            if (mounted.current) setIsLoading(true);
            const data = await getInboxItems();
            if (mounted.current) setItems(data);
        } catch (err: any) {
            if (mounted.current) setError(err.message || 'データの読み込みに失敗しました。');
        } finally {
            if (mounted.current) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    // Added a separate function to handle file processing (upload, OCR, add to inbox)
    const processFile = async (file: File) => {
        let tempItem: Omit<InboxItem, 'id' | 'createdAt' | 'fileUrl'> = {
            fileName: file.name,
            filePath: '',
            mimeType: file.type,
            status: InboxItemStatus.Processing,
            extractedData: null,
            errorMessage: null,
        };

        const tempId = `temp_${Date.now()}`;
        if (mounted.current) {
            setItems(prev => [{ ...tempItem, id: tempId, createdAt: new Date().toISOString(), fileUrl: URL.createObjectURL(file) }, ...prev]);
        }

        try {
            const { path } = await uploadFile(file, 'inbox');
            tempItem.filePath = path;

            const base64String = await readFileAsBase64(file);
            const data = await extractInvoiceDetails(base64String, file.type);

            if (mounted.current) {
                tempItem.extractedData = data;
                tempItem.status = InboxItemStatus.PendingReview;
            }

        } catch (err: any) {
            if (mounted.current) {
                tempItem.status = InboxItemStatus.Error;
                tempItem.errorMessage = err.message || '不明なエラーが発生しました。';
            }
        } finally {
            if (mounted.current) {
                setItems(prev => prev.filter(i => i.id !== tempId)); // Remove temp item
            }
            if (tempItem.filePath) {
                await addInboxItem(tempItem); // Add final item if path exists
            }
        }
    };

    const handleDriveModalOpen = async () => {
        if (isAIOff) {
            addToast('AI機能を有効化するとGoogle Driveからのインポートが利用できます。', 'info');
            return;
        }
        setShowDriveModal(true);
        setDriveError('');
        setIsDriveLoading(true);
        try {
            const { files } = await googleDriveService.searchExpenseFiles();
            setDriveFiles(files || []);
            setSelectedDriveFiles([]);
        } catch (err) {
            console.error('Failed to load Google Drive files', err);
            setDriveError('Google Driveからファイル一覧を取得できませんでした。');
        } finally {
            setIsDriveLoading(false);
        }
    };

    const closeDriveModal = () => {
        setShowDriveModal(false);
        setDriveError('');
        setSelectedDriveFiles([]);
    };

    const toggleDriveFileSelection = (fileId: string) => {
        setSelectedDriveFiles(prev =>
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const importDriveFiles = async () => {
        if (selectedDriveFiles.length === 0) {
            setDriveError('インポートするファイルを選択してください。');
            return;
        }

        setIsDriveImporting(true);
        try {
            for (const fileId of selectedDriveFiles) {
                const fileMeta = driveFiles.find(file => file.id === fileId);
                const { data, fileName } = await googleDriveService.downloadFile(fileId);
                const mimeType = fileMeta?.mimeType || guessDriveMimeType(fileName);
                const file = new File([data], fileName, { type: mimeType });
                await processFile(file);
            }
            addToast(`${selectedDriveFiles.length}件のファイルをGoogle Driveから読み込みました。`, 'success');
            closeDriveModal();
        } catch (err: any) {
            console.error('Google Drive import failed', err);
            const message = err instanceof Error ? err.message : 'Google Driveファイルのインポートに失敗しました。';
            setDriveError(message);
            addToast('Google Driveからのインポートに失敗しました。', 'error');
        } finally {
            setIsDriveImporting(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isAIOff) {
            addToast('AI機能は現在無効です。ファイルからの読み取りはできません。', 'error');
            return;
        }

        setIsUploading(true);
        setError('');
        try {
            // Call the existing processFile function that handles upload and OCR for inbox items
            await processFile(file);
        } catch (err: any) {
            if (mounted.current) {
                setError(err.message || 'ファイル処理中にエラーが発生しました。');
            }
        } finally {
            if (mounted.current) {
                setIsUploading(false); // Reset uploading status
            }
            e.target.value = ''; // Clear file input
        }
    };

    const handleUpdateItem = async (id: string, data: Partial<InboxItem>) => {
        try {
            const updatedItem = await updateInboxItem(id, data);
            if (mounted.current) {
                setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
                addToast('更新しました。', 'success');
            }
        } catch (err: any) {
            if (mounted.current) addToast(`更新に失敗しました: ${err.message}`, 'error');
        }
    };

    const handleDeleteItem = async (itemToDelete: InboxItem) => {
        try {
            await deleteInboxItem(itemToDelete);
            if (mounted.current) {
                setItems(prev => prev.filter(item => item.id !== itemToDelete.id));
                addToast('削除しました。', 'success');
            }
        } catch (err: any) {
            if (mounted.current) addToast(`削除に失敗しました: ${err.message}`, 'error');
        }
    };

    const handleApproveItem = async (itemToApprove: InboxItem) => {
        if (!itemToApprove.extractedData) return;
        try {
            onSaveExpenses(itemToApprove.extractedData);
            await handleUpdateItem(itemToApprove.id, { status: InboxItemStatus.Approved });
            if (mounted.current) {
                setItems(prev => prev.filter(item => item.id !== itemToApprove.id));
            }
        } catch (err: any) {
            if (mounted.current) addToast(`承認処理に失敗しました: ${err.message}`, 'error');
        }
    };


    return (
        <>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="file-upload" className={`relative inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md hover:bg-blue-700 transition-colors ${isUploading || isAIOff ? 'bg-slate-400 cursor-not-allowed' : ''}`}>
                            <Upload className="w-5 h-5" />
                            <span>請求書・領収書を追加</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp, application/pdf" multiple disabled={isUploading || isAIOff} />
                        </label>
                        {isAIOff && <p className="text-sm text-red-500 dark:text-red-400 ml-4">AI機能無効のため、OCR機能は利用できません。</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer">
                            CSV一括インポート
                            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                e.target.value = '';
                                try {
                                    const text = await file.text();
                                    const invoices = parseInvoiceCsv(text);
                                    if (invoices.length === 0) {
                                        addToast('CSVに有効なデータが見つかりませんでした。', 'error');
                                        return;
                                    }
                                    // CSVデータをInboxItemとして追加
                                    for (const inv of invoices) {
                                        const tempItem: Omit<InboxItem, 'id' | 'createdAt' | 'fileUrl'> = {
                                            fileName: `CSV-${inv.imageNo || inv.vendorName || 'unknown'}.csv`,
                                            filePath: '',
                                            mimeType: 'text/csv',
                                            status: InboxItemStatus.PendingReview,
                                            extractedData: inv,
                                            errorMessage: null,
                                        };
                                        await addInboxItem(tempItem);
                                    }
                                    await loadItems();
                                    addToast(`${invoices.length}件の請求書をCSVからインポートしました。`, 'success');
                                } catch (err: any) {
                                    addToast(`CSVインポートに失敗: ${err.message}`, 'error');
                                }
                            }} />
                        </label>
                        <button
                            type="button"
                            onClick={handleDriveModalOpen}
                            disabled={isDriveLoading || isDriveImporting || isAIOff}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${isDriveLoading || isDriveImporting || isAIOff ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                            Google Driveから追加
                        </button>
                        {(isDriveLoading || isDriveImporting) && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {isDriveImporting ? 'ファイルを取り込んでいます…' : 'ファイル一覧を読み込み中…'}
                            </span>
                        )}
                    </div>
                    {driveError && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{driveError}</p>
                    )}
                    {isUploading && !isAIOff && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">アップロードと解析を実行中です...</p>}
                </div>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-lg text-red-700 dark:text-red-300">
                        <strong>エラー:</strong> {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-10">
                        <Loader className="w-8 h-8 mx-auto animate-spin text-blue-500" />
                        <p className="mt-2 text-slate-500 dark:text-slate-400">受信トレイを読み込んでいます...</p>
                    </div>
                ) : (
                    items.length > 0 ? (
                        <div className="space-y-6">
                            {items.some(i => i.status === InboxItemStatus.PendingReview) && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={async () => {
                                            const toProcess = items.filter(i => i.status === InboxItemStatus.PendingReview);
                                            if (toProcess.length === 0) return;
                                            
                                            requestConfirmation({
                                                title: '一括確定',
                                                message: `表示されている${toProcess.length}件の請求書をすべて確定して仕訳に送りますか？`,
                                                onConfirm: async () => {
                                                    for (const item of toProcess) {
                                                        await handleApproveItem(item);
                                                    }
                                                    addToast('すべての請求書を確定しました。', 'success');
                                                }
                                            });
                                        }}
                                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        <span>すべての確認済みを確定 (一括処理)</span>
                                    </button>
                                </div>
                            )}
                            {items.map(item => (
                                <InboxItemCard key={item.id} item={item} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onApprove={handleApproveItem} requestConfirmation={requestConfirmation} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">仕入計上する請求書はありません</p>
                            <p className="mt-1 text-slate-500 dark:text-slate-400">請求書や領収書をアップロードして仕入計上を開始します。</p>
                        </div>
                    )
                )}
            </div>
            {showDriveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                    <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Google Driveから読み込む</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">選択したファイルを請求書OCRに連携します。</p>
                            </div>
                            <button onClick={closeDriveModal} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto px-6 py-4 space-y-2">
                            {isDriveLoading && (
                                <p className="text-sm text-slate-500">Google Driveファイルを読み込み中です...</p>
                            )}
                            {!isDriveLoading && driveFiles.length === 0 && (
                                <p className="text-sm text-slate-500">対象ファイルが見つかりませんでした。</p>
                            )}
                            {driveFiles.map(file => (
                                <label
                                    key={file.id}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400"
                                >
                                    <div className="flex-grow text-sm text-slate-800 dark:text-slate-100">
                                        <p className="font-semibold truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(file.createdTime).toLocaleString()}</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedDriveFiles.includes(file.id)}
                                        onChange={() => toggleDriveFileSelection(file.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </label>
                            ))}
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
                            <button
                                onClick={closeDriveModal}
                                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-600 hover:border-slate-400"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={importDriveFiles}
                                disabled={isDriveImporting || selectedDriveFiles.length === 0}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg text-white ${isDriveImporting || selectedDriveFiles.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isDriveImporting ? '取り込み中…' : `選択した${selectedDriveFiles.length}件を取り込む`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InvoiceOCR;
