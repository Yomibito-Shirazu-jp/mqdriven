import React, { useState, useEffect, useRef } from 'react';
import { Lead, LeadStatus, Toast, ConfirmationDialogProps, EmployeeUser, Estimate, EstimateStatus } from '../../types';
import { X, Pencil, Mail, CheckCircle, Lightbulb, Search, Loader } from '../Icons';
import { generateLeadReplyEmail } from '../../services/geminiService';

interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSave: (leadId: string, updatedData: Partial<Lead>) => Promise<void>;
    onDelete: (leadId: string) => Promise<void>;
    onAddEstimate?: (estimateData: Partial<Estimate>) => Promise<void>;
    onEstimateCreated?: () => void;
    onShowAiEstimate?: (lead: Lead) => void;
    initialAiTab?: "email" | "investigation" | "proposal";
    addToast: (message: string, type: Toast['type']) => void;
    requestConfirmation: (dialog: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => void;
    currentUser: EmployeeUser | null;
    onGenerateReply: (lead: Lead) => void;
    isAIOff: boolean;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    isOpen,
    onClose,
    lead,
    onSave,
    onDelete,
    onAddEstimate,
    onEstimateCreated,
    addToast,
    requestConfirmation,
    currentUser,
    onGenerateReply,
    isAIOff
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeAiTab, setActiveAiTab] = useState<'email' | 'proposal' | 'investigation'>('email');
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [aiReply, setAiReply] = useState<string | null>(null);

    // 見積フォーム state
    const [estTitle, setEstTitle] = useState('');
    const [estCustomer, setEstCustomer] = useState('');
    const [estCopies, setEstCopies] = useState(1);
    const [estUnitPrice, setEstUnitPrice] = useState(0);
    const [estTaxRate, setEstTaxRate] = useState(10);
    const [estSpec, setEstSpec] = useState('');
    const [estDeliveryDate, setEstDeliveryDate] = useState('');
    const [estExpirationDate, setEstExpirationDate] = useState('');
    const [isCreatingEstimate, setIsCreatingEstimate] = useState(false);

    // リードが変わったら見積フォームを初期化
    useEffect(() => {
        if (!lead) return;
        const budgetNum = Number(String(lead.budget || '').replace(/[^0-9.-]/g, ''));
        setEstTitle(lead.inquiryType || lead.message?.split('\n')[0]?.slice(0, 50) || '見積');
        setEstCustomer(lead.company || '');
        setEstCopies(1);
        setEstUnitPrice(Number.isFinite(budgetNum) && budgetNum > 0 ? budgetNum : 0);
        setEstTaxRate(10);
        setEstSpec(lead.aiDraftProposal || lead.message || '');
        setEstDeliveryDate('');
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);
        setEstExpirationDate(exp.toISOString().split('T')[0]);
    }, [lead]);

    const estSubtotal = estCopies * estUnitPrice;
    const estTax = Math.floor(estSubtotal * (estTaxRate / 100));
    const estTotal = estSubtotal + estTax;

    const handleCreateEstimate = async () => {
        if (!lead || !onAddEstimate) return;
        setIsCreatingEstimate(true);
        try {
            const estimate: Partial<Estimate> = {
                customerName: estCustomer,
                title: estTitle,
                copies: estCopies,
                unitPrice: estUnitPrice,
                taxRate: estTaxRate,
                subtotal: estSubtotal,
                taxAmount: estTax,
                total: estTotal,
                notes: estSpec,
                deliveryDate: estDeliveryDate || undefined,
                expirationDate: estExpirationDate || undefined,
                status: EstimateStatus.Draft,
                userId: currentUser?.id,
            };
            await onAddEstimate(estimate);
            await onSave(lead.id, { estimateSentAt: new Date().toISOString(), estimateSentBy: currentUser?.name || null });
            onEstimateCreated?.();
            addToast('見積を作成しました。見積一覧に反映されます。', 'success');
        } catch (err: any) {
            console.error('見積作成エラー:', err);
            addToast(err?.message || '見積の作成に失敗しました。', 'error');
        } finally {
            setIsCreatingEstimate(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // AI返信を生成する関数
    const handleGenerateAiReply = async () => {
        if (!lead || isAIOff) return;

        setIsGeneratingReply(true);
        setAiReply(null);

        try {
            const reply = await generateLeadReplyEmail(lead, currentUser?.name || '石嶋洋平');
            setAiReply(reply.body);
            addToast('AI返信を生成しました', 'success');
        } catch (error) {
            console.error('AI返信生成エラー:', error);
            addToast('AI返信の生成に失敗しました', 'error');
        } finally {
            setIsGeneratingReply(false);
        }
    };

    // リードが変更されたらAI返信を生成
    useEffect(() => {
        if (lead && activeAiTab === 'email' && !aiReply && !isAIOff) {
            handleGenerateAiReply();
        }
    }, [lead, activeAiTab]);

    if (!isOpen || !lead) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
                    {/* Header with Actions */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">リード詳細</h2>
                            {/* Status Badges */}
                            <div className="flex gap-2">
                                {lead.status === LeadStatus.Untouched && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">新規</span>
                                )}
                                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">企業調査完了</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Action Buttons */}
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200"
                            >
                                <Pencil className="w-4 h-4" />編集
                            </button>
                            {lead.email && (
                                <button
                                    type="button"
                                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200"
                                >
                                    <Mail className="w-4 h-4" />メール確認
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 font-semibold py-2 px-3 rounded-lg hover:bg-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content - Two Column Layout */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Column - Customer Content */}
                        <div className="w-1/2 p-6 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">顧客からの内容</h3>

                            {/* Company Information */}
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                                <div className="font-bold text-slate-900 dark:text-white mb-2">{lead.company}</div>
                                <div className="text-slate-700 dark:text-slate-300 mb-1">{lead.name}</div>
                                <div className="text-slate-600 dark:text-slate-400 text-sm">
                                    {lead.email} / {lead.phone}
                                </div>
                            </div>

                            {/* Inquiry Content */}
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">お問い合わせ内容</h4>
                                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                    {lead.message}
                                </div>
                            </div>

                            {/* Activity History */}
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">活動履歴</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-slate-500" />
                                        <span className="text-slate-700 dark:text-slate-300">メール受信</span>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            {lead.createdAt ? new Date(lead.createdAt).toLocaleString('ja-JP', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }).replace(/\//g, '/') : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Search className="w-4 h-4 text-slate-500" />
                                        <span className="text-slate-700 dark:text-slate-300">企業調査完了</span>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            {new Date().toLocaleString('ja-JP', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }).replace(/\//g, '/')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - AI Proposal Check */}
                        <div className="w-1/2 p-6 overflow-y-auto">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">AI提案をチェック</h3>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                                <button
                                    onClick={() => setActiveAiTab('email')}
                                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeAiTab === 'email'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    返信案
                                </button>
                                <button
                                    onClick={() => setActiveAiTab('proposal')}
                                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeAiTab === 'proposal'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    見積もり案
                                </button>
                                <button
                                    onClick={() => setActiveAiTab('investigation')}
                                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeAiTab === 'investigation'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    提案
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                                {activeAiTab === 'email' && (
                                    <div>
                                        <div className="mb-4">
                                            <div className="font-semibold text-slate-900 dark:text-white mb-2">
                                                {lead.company} {lead.name}様
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                                {isGeneratingReply ? (
                                                    <div className="flex items-center gap-2 py-4">
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                        <span>AI返信を生成中...</span>
                                                    </div>
                                                ) : aiReply ? (
                                                    aiReply
                                                ) : isAIOff ? (
                                                    <div className="text-slate-500 italic">
                                                        AI機能は現在無効です。
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-500 italic">
                                                        返信を生成できませんでした。
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleGenerateAiReply}
                                                disabled={isGeneratingReply || isAIOff}
                                                className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                {isGeneratingReply ? '生成中...' : 'この内容を確認'}
                                            </button>
                                            <button className="flex items-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                                                次へ進む
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeAiTab === 'proposal' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">件名</label>
                                            <input type="text" value={estTitle} onChange={e => setEstTitle(e.target.value)}
                                                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">顧客名</label>
                                            <input type="text" value={estCustomer} onChange={e => setEstCustomer(e.target.value)}
                                                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">数量</label>
                                                <input type="number" value={estCopies} onChange={e => setEstCopies(Number(e.target.value) || 0)} min={0}
                                                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-right" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">単価</label>
                                                <input type="number" value={estUnitPrice} onChange={e => setEstUnitPrice(Number(e.target.value) || 0)} min={0}
                                                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-right" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">税率 (%)</label>
                                                <input type="number" value={estTaxRate} onChange={e => setEstTaxRate(Number(e.target.value) || 0)} min={0} max={100}
                                                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-right" />
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-600 p-3 text-sm space-y-1">
                                            <div className="flex justify-between"><span className="text-slate-500">小計</span><span className="font-mono">¥{estSubtotal.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-500">消費税</span><span className="font-mono">¥{estTax.toLocaleString()}</span></div>
                                            <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-600 pt-1 mt-1">
                                                <span>合計</span><span className="font-mono text-blue-600 dark:text-blue-400">¥{estTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">仕様 / 備考</label>
                                            <textarea value={estSpec} onChange={e => setEstSpec(e.target.value)} rows={3}
                                                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">納期</label>
                                                <input type="date" value={estDeliveryDate} onChange={e => setEstDeliveryDate(e.target.value)}
                                                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">有効期限</label>
                                                <input type="date" value={estExpirationDate} onChange={e => setEstExpirationDate(e.target.value)}
                                                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCreateEstimate}
                                            disabled={isCreatingEstimate || !estTitle.trim() || !onAddEstimate}
                                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                                        >
                                            {isCreatingEstimate ? <><Loader className="w-4 h-4 animate-spin" />作成中...</> : <><Lightbulb className="w-4 h-4" />見積を作成</>}
                                        </button>
                                    </div>
                                )}

                                {activeAiTab === 'investigation' && (
                                    <div className="text-center py-8">
                                        <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                        <p className="text-slate-500 dark:text-slate-400">企業調査の準備中...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LeadDetailModal;
