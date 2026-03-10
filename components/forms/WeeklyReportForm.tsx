import React, { useState, useEffect } from 'react';
import { submitApplication } from '../../services/dataService';
import ApprovalRouteSelector from './ApprovalRouteSelector';
import { Loader, Save, Sparkles } from '../Icons';
import { User, Toast, ApplicationWithDetails } from '../../types';
import { useSubmitWithConfirmation } from '../../hooks/useSubmitWithConfirmation';

interface WeeklyReportFormProps {
    onSuccess: () => void;
    applicationCodeId: string;
    currentUser: User | null;
    addToast: (message: string, type: Toast['type']) => void;
    isAIOff: boolean;
    isLoading: boolean;
    error: string;
    resumedApplication?: ApplicationWithDetails | null;
}

const WeeklyReportForm: React.FC<WeeklyReportFormProps> = ({
    onSuccess,
    applicationCodeId,
    currentUser,
    addToast,
    isAIOff,
    isLoading,
    error: formLoadError,
    resumedApplication
}) => {
    const [formData, setFormData] = useState({
        weekStart: new Date().toISOString().split('T')[0],
        weekEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        summary: '',
        achievements: '',
        issues: '',
        nextWeekPlan: '',
        kpiMetrics: '',
    });
    const [approvalRouteId, setApprovalRouteId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { requestConfirmation, ConfirmationDialog } = useSubmitWithConfirmation();

    useEffect(() => {
        if (resumedApplication && resumedApplication.formData) {
            setFormData(prev => ({ ...prev, ...resumedApplication?.formData }));
            setApprovalRouteId(resumedApplication.approvalRouteId || '');
        }
    }, [resumedApplication]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvalRouteId) {
            addToast('承認ルートを選択してください。', 'warning');
            return;
        }

        await requestConfirmation({
            label: '週報を提出',
            title: '週報を提出しますか？',
            description: '提出すると承認者に通知されます。',
            confirmLabel: '提出する',
            cancelLabel: 'キャンセル',
            onConfirm: async () => {
                setIsSubmitting(true);
                try {
                    await submitApplication({
                        applicationCodeId,
                        formData,
                        approvalRouteId
                    }, currentUser?.id || '');
                    addToast('週報を提出しました。', 'success');
                    onSuccess();
                } catch (err) {
                    addToast('週報の提出に失敗しました。', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            }
        });
    };

    const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";
    const inputClass = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all";

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">週間業務報告</h2>
                        <p className="text-sm text-slate-500 mt-1">週の振り返りと来週の計画を報告してください。</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>対象期間 (開始)</label>
                        <input type="date" name="weekStart" value={formData.weekStart} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                        <label className={labelClass}>対象期間 (終了)</label>
                        <input type="date" name="weekEnd" value={formData.weekEnd} onChange={handleChange} className={inputClass} required />
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className={labelClass}>今週の概況・主要トピック</label>
                        <textarea name="summary" rows={4} value={formData.summary} onChange={handleChange} className={inputClass} placeholder="今週の主な動きや出来事を入力してください" required />
                    </div>

                    <div>
                        <label className={labelClass}>主な成果・達成事項</label>
                        <textarea name="achievements" rows={4} value={formData.achievements} onChange={handleChange} className={inputClass} placeholder="具体的数値や成果を入力してください" />
                    </div>

                    <div>
                        <label className={labelClass}>課題・改善点</label>
                        <textarea name="issues" rows={4} value={formData.issues} onChange={handleChange} className={inputClass} placeholder="発生した課題やその対策案を入力してください" />
                    </div>

                    <div>
                        <label className={labelClass}>来週の計画</label>
                        <textarea name="nextWeekPlan" rows={4} value={formData.nextWeekPlan} onChange={handleChange} className={inputClass} placeholder="来週の主要なタスクや目標を入力してください" required />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                    <ApprovalRouteSelector 
                        onChange={setApprovalRouteId}
                        isSubmitting={isSubmitting}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>週報を提出する</span>
                    </button>
                </div>
            </form>
            {ConfirmationDialog}
        </div>
    );
};

export default WeeklyReportForm;
