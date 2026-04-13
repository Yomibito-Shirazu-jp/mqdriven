import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader, X, CheckCircle, AlertTriangle } from './Icons';
import { extractBusinessCardDetails } from '../services/geminiService';
import { Toast, Lead, LeadStatus } from '../types';

const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
            else reject(new Error('ファイル読み取りに失敗しました。'));
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });

export type ExtractedLead = {
    company: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    title: string;
    address: string;
};

type PdfImportItem = {
    id: string;
    fileName: string;
    status: 'processing' | 'done' | 'error';
    data: ExtractedLead | null;
    errorMessage: string | null;
};

export interface LeadPdfImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (leads: ExtractedLead[]) => void;
    addToast: (message: string, type: Toast['type']) => void;
}

const LeadPdfImportModal: React.FC<LeadPdfImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    addToast,
}) => {
    const [items, setItems] = useState<PdfImportItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const processFile = async (file: File) => {
        const tempId = `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setItems(prev => [...prev, {
            id: tempId,
            fileName: file.name,
            status: 'processing',
            data: null,
            errorMessage: null,
        }]);
        try {
            const base64 = await readFileAsBase64(file);
            const card = await extractBusinessCardDetails(base64, file.type);
            const data: ExtractedLead = {
                company: card.companyName || '',
                name: card.personName || '',
                email: card.email || '',
                phone: card.phoneNumber || card.mobileNumber || '',
                department: card.department || '',
                title: card.title || '',
                address: card.address || '',
            };
            setItems(prev => prev.map(i =>
                i.id === tempId ? { ...i, status: 'done' as const, data } : i
            ));
        } catch (err: any) {
            setItems(prev => prev.map(i =>
                i.id === tempId
                    ? { ...i, status: 'error' as const, errorMessage: err.message || '解析に失敗しました。' }
                    : i
            ));
        }
    };

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setIsUploading(true);
        try {
            await Promise.all(files.map(f => processFile(f)));
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const doneItems = items.filter(i => i.status === 'done' && i.data);

    const handleImport = () => {
        if (!doneItems.length) return;
        onImport(doneItems.map(i => i.data!));
        setItems([]);
        onClose();
    };

    const handleClose = () => {
        setItems([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">PDFからリードインポート</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">名刺・問合せPDFを1つまたは複数アップロードできます</p>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <label className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-md cursor-pointer transition-colors ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                        <Upload className="w-5 h-5" />
                        <span>PDFファイルを選択</span>
                        <input
                            type="file"
                            className="sr-only"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            multiple
                            onChange={handleFiles}
                            disabled={isUploading}
                        />
                    </label>

                    {items.length === 0 && (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
                            <p className="text-base">名刺や問合せ書類のPDFをアップロードすると</p>
                            <p className="text-base">AIがリード情報を自動で読み取ります</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {items.map(item => (
                            <div
                                key={item.id}
                                className={`border rounded-xl p-4 transition-colors ${
                                    item.status === 'error'
                                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                                        : item.status === 'done'
                                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/30'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {item.status === 'processing' && <Loader className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" />}
                                        {item.status === 'done' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                        {item.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.fileName}</span>
                                        {item.status === 'processing' && <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">AIが解析中...</span>}
                                    </div>
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-slate-400 hover:text-red-500 rounded flex-shrink-0">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {item.status === 'error' && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{item.errorMessage}</p>
                                )}

                                {item.status === 'done' && item.data && (
                                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">会社名</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.data.company || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">担当者名</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.data.name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">メール</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.data.email || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">電話</p>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.data.phone || '—'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {doneItems.length > 0 ? `${doneItems.length}件 読み取り完了` : ''}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            キャンセル
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!doneItems.length}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {doneItems.length > 0 ? `${doneItems.length}件をインポート` : 'インポート'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadPdfImportModal;
