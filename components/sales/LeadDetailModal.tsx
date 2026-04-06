import React, { useState, useEffect, useRef } from 'react';
import { Lead, LeadStatus, Toast, ConfirmationDialogProps, EmployeeUser, Estimate, EstimateStatus } from '../../types';
import { X, Pencil, Mail, CheckCircle, Lightbulb, Search, Loader, Send } from '../Icons';
import { generateLeadReplyEmail, extractPrintSpecKeywords, draftEstimateFromLeadWithHistory } from '../../services/geminiService';
import { sendEmail } from '../../services/emailService';
import { findSimilarEstimates } from '../../services/dataService';

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
    const [replySubject, setReplySubject] = useState('');
    const [replyBody, setReplyBody] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

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
    const [isAiEstimating, setIsAiEstimating] = useState(false);
    const [similarCount, setSimilarCount] = useState<number | null>(null);

    // AI自動見積生成（3段階: キーワード抽出 → DB検索 → AI見積生成）
    const handleAiAutoEstimate = async () => {
        if (!lead || isAIOff) return;
        setIsAiEstimating(true);
        setSimilarCount(null);
        try {
            // Step 1: AIが問い合わせ文から印刷仕様キーワードを抽出
            const inquiryText = `${lead.message || ''}\n${lead.inquiryType || ''}\n${lead.printTypes || ''}`;
            const specKeywords = await extractPrintSpecKeywords(inquiryText);

            // Step 2: キーワード＋顧客名で過去見積を検索
            const similar = await findSimilarEstimates(specKeywords, lead.company || undefined);
            setSimilarCount(similar.length);

            // Step 3: 過去データをコンテキストにAI見積を生成
            const aiResult = await draftEstimateFromLeadWithHistory(lead, similar);

            // フォームに反映
            const items = (aiResult.items || []) as Array<{ division?: string; content?: string; quantity?: number; unit?: string; unitPrice?: number; price?: number; cost?: number }>;
            if (aiResult.title) setEstTitle(aiResult.title);

            // 明細の合計金額を算出してフォームの単価・数量に設定
            const itemsTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
            if (itemsTotal > 0) {
                // 明細が複数ある → 合計を単価、数量1（見積フォームが単一行のため）
                setEstUnitPrice(itemsTotal);
                setEstCopies(1);
            } else if (items.length > 0) {
                // price が 0 でも quantity/unitPrice があるケース
                const first = items[0];
                setEstCopies(first.quantity || 1);
                setEstUnitPrice(first.unitPrice || 0);
            }

            // 明細を仕様テキストとして展開
            const specLines = items.map(item =>
                `【${item.division || 'その他'}】${item.content || ''}\n  ${item.quantity || 0}${item.unit || '式'} × ¥${(item.unitPrice || 0).toLocaleString()} = ¥${(item.price || 0).toLocaleString()}`
            );
            const specText = specLines.join('\n\n');
            const notesText = aiResult.notes ? `\n\n備考: ${aiResult.notes}` : '';
            const customerHint = similar.filter(e => e.match_type === 'customer').length;
            const specHint = similar.filter(e => e.match_type === 'spec').length;
            const refNote = `\n\n--- 参照実績 ---\n同一顧客: ${customerHint}件 / 仕様類似: ${specHint}件`;
            setEstSpec(specText + notesText + refNote);

            if (aiResult.deliveryDate) setEstDeliveryDate(aiResult.deliveryDate);

            addToast(`過去${similar.length}件の実績を参照（キーワード: ${specKeywords.slice(0, 4).join(', ')}）`, 'success');
        } catch (err: any) {
            console.error('AI自動見積エラー:', err);
            addToast(err?.message || 'AI見積の生成に失敗しました。', 'error');
        } finally {
            setIsAiEstimating(false);
        }
    };

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
            const departmentLine = currentUser?.department || '本社';
            const signature = [
                '---',
                '',
                '文唱堂印刷株式会社',
                departmentLine,
                currentUser?.name || '',
                '〒101-0025 東京都千代田区神田佐久間町3-37',
                'TEL：03-3851-0111　FAX：03-3861-1979',
                `Mail: ${currentUser?.email || ''}`,
                'Web: http://b-p.co.jp',
            ].join('\n');
            const bodyWithSignature = `${reply.body}\n\n${signature}`;
            setAiReply(bodyWithSignature);
            setReplySubject(reply.subject);
            setReplyBody(bodyWithSignature);
            addToast('AI返信を生成しました', 'success');
        } catch (error) {
            console.error('AI返信生成エラー:', error);
            addToast('AI返信の生成に失敗しました', 'error');
        } finally {
            setIsGeneratingReply(false);
        }
    };

    // メールを直接送信
    const handleSendEmail = async () => {
        if (!lead?.email || !replyBody.trim()) return;
        setIsSendingEmail(true);
        try {
            await sendEmail({
                to: [lead.email],
                subject: replySubject || 'お問い合わせありがとうございます',
                body: replyBody,
            });
            const timestamp = new Date().toLocaleString('ja-JP');
            const logMessage = `[${timestamp}] AI返信メールを送信しました。（${lead.email}宛）`;
            const updatedInfo = `${logMessage}\n${lead.infoSalesActivity || ''}`.trim();
            const statusTimestamp = new Date().toISOString();
            await onSave(lead.id, {
                infoSalesActivity: updatedInfo,
                status: LeadStatus.Contacted,
                updatedAt: statusTimestamp,
                statusUpdatedAt: statusTimestamp,
                assignedTo: currentUser?.name || null,
            });
            addToast(`${lead.email} にメールを送信しました。`, 'success');
        } catch (error: any) {
            console.error('メール送信エラー:', error);
            addToast(error?.message || 'メールの送信に失敗しました。', 'error');
        } finally {
            setIsSendingEmail(false);
        }
    };

    // Gmailで下書きを開く
    const handleOpenGmailDraft = () => {
        if (!lead?.email) return;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${lead.email}&su=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
        window.open(gmailUrl, '_blank');
        addToast('Gmailの下書きを開きました。', 'info');
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
                                    <div className="space-y-3">
                                        {isGeneratingReply ? (
                                            <div className="flex items-center gap-2 py-8 justify-center">
                                                <Loader className="w-5 h-5 animate-spin text-blue-500" />
                                                <span className="text-slate-500">AI返信を生成中...</span>
                                            </div>
                                        ) : !aiReply && isAIOff ? (
                                            <div className="text-center py-8 text-slate-500 italic">AI機能は現在無効です。</div>
                                        ) : !aiReply ? (
                                            <div className="text-center py-8">
                                                <button
                                                    onClick={handleGenerateAiReply}
                                                    className="flex items-center gap-2 mx-auto bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-lg hover:bg-blue-700"
                                                >
                                                    <Lightbulb className="w-4 h-4" />
                                                    AIで返信を生成
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">宛先</label>
                                                    <div className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300">
                                                        {lead.email || '（メールアドレスなし）'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">件名</label>
                                                    <input
                                                        type="text"
                                                        value={replySubject}
                                                        onChange={e => setReplySubject(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">本文</label>
                                                    <textarea
                                                        value={replyBody}
                                                        onChange={e => setReplyBody(e.target.value)}
                                                        rows={12}
                                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md font-mono leading-relaxed"
                                                    />
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={handleSendEmail}
                                                        disabled={isSendingEmail || !lead.email}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                                                    >
                                                        {isSendingEmail ? <><Loader className="w-4 h-4 animate-spin" />送信中...</> : <><Send className="w-4 h-4" />送信</>}
                                                    </button>
                                                    <button
                                                        onClick={handleOpenGmailDraft}
                                                        disabled={!lead.email}
                                                        className="flex items-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 transition"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        Gmailで開く
                                                    </button>
                                                    <button
                                                        onClick={handleGenerateAiReply}
                                                        disabled={isGeneratingReply}
                                                        className="flex items-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 transition"
                                                        title="AIで再生成"
                                                    >
                                                        {isGeneratingReply ? <Loader className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                                                        再生成
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeAiTab === 'proposal' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleAiAutoEstimate}
                                                disabled={isAiEstimating || isAIOff}
                                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 transition shadow-sm"
                                            >
                                                {isAiEstimating
                                                    ? <><Loader className="w-4 h-4 animate-spin" />過去データを参照中...</>
                                                    : <><Lightbulb className="w-4 h-4" />AI自動見積（過去実績参照）</>
                                                }
                                            </button>
                                        </div>
                                        {similarCount !== null && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
                                                過去 {similarCount} 件の類似実績を参照して生成しました
                                            </div>
                                        )}
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
