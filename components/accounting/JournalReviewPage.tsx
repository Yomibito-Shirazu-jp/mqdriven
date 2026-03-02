import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, Calendar, ChevronDown, Loader, FileText, CheckCircle, AlertTriangle, Eye, Plus, Check } from 'lucide-react';
import { ApplicationWithDetails, User, AccountingStatus, ApplicationStatus, JournalEntry, JournalEntryLine } from '../../types';
import * as dataService from '../../services/dataService';
import { calculateMQProfit } from '../../utils/mqProfitCalculation';

interface JournalReviewPageProps {
  currentUser?: User | null;
}

interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
}

type GroupMode = 'flat' | 'company' | 'purpose';

const JournalReviewPage: React.FC<JournalReviewPageProps> = ({ currentUser }) => {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntryWithLines[]>([]);
  const [archivedApplications, setArchivedApplications] = useState<ApplicationWithDetails[]>([]);
  const [archivedJournalEntries, setArchivedJournalEntries] = useState<JournalEntryWithLines[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<ApplicationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountingStatus | 'all'>('all');
  const [applicantFilter, setApplicantFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [archiveShowAll, setArchiveShowAll] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const ARCHIVE_PREVIEW_COUNT = 5;

  // Phase 1: 自動補完生成
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ done: 0, total: 0 });
  const [autoGenErrors, setAutoGenErrors] = useState<string[]>([]);
  const isAutoGeneratingRef = useRef(false);

  // Phase 2: グルーピング
  const [groupMode, setGroupMode] = useState<GroupMode>('flat');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Phase 3: 一括確定
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);
  const [showBatchConfirmDialog, setShowBatchConfirmDialog] = useState(false);

  const extractCompanyName = useCallback((app: ApplicationWithDetails): string => {
    const fd = app.formData;
    if (!fd) return '';
    if (fd.invoice?.supplierName) return fd.invoice.supplierName;
    if (fd.supplierName) return fd.supplierName;
    if (typeof fd.customerName === 'string' && fd.customerName.trim()) return fd.customerName.trim();
    if (Array.isArray(fd.planItems)) {
      for (const item of fd.planItems) {
        if (typeof item?.customerName === 'string' && item.customerName.trim()) {
          return item.customerName.trim();
        }
      }
    }
    if (Array.isArray(fd.invoice?.lines)) {
      for (const line of fd.invoice.lines) {
        const name = line?.customerName || line?.customCustomerName || line?.customer?.customerName;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
    return '';
  }, []);

  const applicantOptions = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      if (app.applicant?.name) names.add(app.applicant.name);
    });
    return Array.from(names).sort();
  }, [applications]);

  const companyOptions = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      const company = extractCompanyName(app);
      if (company) names.add(company);
    });
    return Array.from(names).sort();
  }, [applications, extractCompanyName]);

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  // グルーピング
  const groupedApplications = useMemo(() => {
    if (groupMode === 'flat') {
      return [['すべて', filteredApplications] as [string, ApplicationWithDetails[]]];
    }

    const groups: Record<string, ApplicationWithDetails[]> = {};
    filteredApplications.forEach(app => {
      let key: string;
      if (groupMode === 'company') {
        key = extractCompanyName(app) || '企業名なし';
      } else {
        key = app.applicationCode?.name || '種別不明';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'ja'));
  }, [filteredApplications, groupMode, extractCompanyName]);

  // 利益率30%以上の自動承認候補
  const autoApprovableApps = useMemo(() => {
    return filteredApplications.filter(app => {
      const profit = calculateMQProfit(app);
      return profit?.isAutoApprovable && journalEntries.some(
        entry => entry.reference_id === app.id && entry.status === 'draft'
      );
    });
  }, [filteredApplications, journalEntries]);

  // データ読み込み + NONE状態の自動補完生成
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);

    try {
      const allApplications = await dataService.getApplications(currentUser);
      // NONE + DRAFT を対象に表示（承認時に自動生成済みのDRAFTも含む）
      const targetApplications = allApplications.filter(app =>
        app.status === ApplicationStatus.APPROVED &&
        (!app.accounting_status ||
         app.accounting_status === AccountingStatus.NONE ||
         app.accounting_status === AccountingStatus.DRAFT) &&
        !app.applicationCode?.name?.includes('休暇') &&
        !app.applicationCode?.name?.includes('休み')
      );

      const archivedApps = allApplications.filter(app =>
        app.status === ApplicationStatus.APPROVED &&
        app.accounting_status === AccountingStatus.POSTED &&
        !app.applicationCode?.name?.includes('休暇') &&
        !app.applicationCode?.name?.includes('休み')
      );
      setArchivedApplications(archivedApps);

      const draftEntries = await dataService.getJournalEntriesByStatus('draft');
      setJournalEntries(draftEntries.map(entry => ({
        ...entry,
        lines: entry.lines || []
      })));

      const postedEntries = await dataService.getJournalEntriesByStatus('posted');
      setArchivedJournalEntries(postedEntries.map(entry => ({
        ...entry,
        lines: entry.lines || []
      })));

      // NONE状態の残りを自動補完生成
      const noneApps = targetApplications.filter(
        app => !app.accounting_status || app.accounting_status === AccountingStatus.NONE
      );

      if (noneApps.length > 0 && !isAutoGeneratingRef.current) {
        isAutoGeneratingRef.current = true;
        setAutoGenerating(true);
        setAutoGenProgress({ done: 0, total: noneApps.length });
        setAutoGenErrors([]);

        // 先にDRAFT済みのものは表示
        const draftApps = targetApplications.filter(
          app => app.accounting_status === AccountingStatus.DRAFT
        );
        setApplications(draftApps);
        setFilteredApplications(draftApps);
        setIsLoading(false);

        const BATCH_SIZE = 3;
        let done = 0;
        const errors: string[] = [];

        for (let i = 0; i < noneApps.length; i += BATCH_SIZE) {
          const batch = noneApps.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map(app => dataService.generateJournalLinesFromApplication(app.id))
          );
          results.forEach((result, idx) => {
            if (result.status === 'rejected') {
              errors.push(`${batch[idx].formData?.title || batch[idx].id.slice(0, 8)}: ${result.reason?.message || '生成失敗'}`);
            }
          });
          done += batch.length;
          setAutoGenProgress({ done, total: noneApps.length });
        }

        setAutoGenErrors(errors);
        setAutoGenerating(false);
        isAutoGeneratingRef.current = false;

        // 再取得して最新状態を反映
        const refreshed = await dataService.getApplications(currentUser);
        const refreshedTarget = refreshed.filter(app =>
          app.status === ApplicationStatus.APPROVED &&
          (!app.accounting_status ||
           app.accounting_status === AccountingStatus.NONE ||
           app.accounting_status === AccountingStatus.DRAFT) &&
          !app.applicationCode?.name?.includes('休暇') &&
          !app.applicationCode?.name?.includes('休み')
        );
        setApplications(refreshedTarget);
        setFilteredApplications(refreshedTarget);

        const refreshedDraft = await dataService.getJournalEntriesByStatus('draft');
        setJournalEntries(refreshedDraft.map(entry => ({
          ...entry,
          lines: entry.lines || []
        })));
      } else {
        setApplications(targetApplications);
        setFilteredApplications(targetApplications);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError('データの読み込みに失敗しました。');
      console.error(err);
      setIsLoading(false);
    }
  }, [currentUser]);

  // 仕訳生成処理
  const handleGenerateJournal = async (application: ApplicationWithDetails) => {
    if (!currentUser) {
      alert('ログインが必要です。');
      return;
    }

    try {
      const result = await dataService.generateJournalLinesFromApplication(application.id);
      alert(`仕訳を生成しました。${result.lines.length}行の仕訳が作成されました。`);
      await loadData();
    } catch (error: any) {
      console.error('仕訳生成エラー:', error);
      alert(`仕訳の生成に失敗しました: ${error.message}`);
    }
  };

  // 仕訳確定処理（単体）
  const handleConfirmJournal = async (journalEntryId: string | number) => {
    if (!currentUser) {
      alert('ログインが必要です。');
      return;
    }

    try {
      const entry = journalEntries.find(target => String(target.id) === String(journalEntryId));
      const sourceApplicationId = entry?.reference_id;
      const applicationToArchive = sourceApplicationId
        ? applications.find(app => app.id === sourceApplicationId)
        : undefined;

      await dataService.updateJournalEntryStatus(String(journalEntryId), 'posted');

      // チェックマークオーバーレイ表示
      setConfirmingId(sourceApplicationId || String(journalEntryId));

      // 500ms後にフェードアウト開始
      setTimeout(() => {
        if (sourceApplicationId) {
          setConfirmedIds(prev => new Set(prev).add(sourceApplicationId));
        }
      }, 500);

      // 1000ms後にDOM除去 + state更新
      setTimeout(() => {
        setConfirmingId(null);

        if (entry) {
          setJournalEntries(prev => prev.filter(item => String(item.id) !== String(journalEntryId)));
          setArchivedJournalEntries(prev => [
            { ...entry, status: 'posted' },
            ...prev,
          ]);
        }

        if (applicationToArchive) {
          const archivedApplication: ApplicationWithDetails = {
            ...applicationToArchive,
            accounting_status: AccountingStatus.POSTED,
          };
          setApplications(prev => prev.filter(app => app.id !== applicationToArchive.id));
          setFilteredApplications(prev => prev.filter(app => app.id !== applicationToArchive.id));
          setArchivedApplications(prev => [archivedApplication, ...prev]);
        }

        setConfirmedIds(prev => {
          const next = new Set(prev);
          if (sourceApplicationId) next.delete(sourceApplicationId);
          return next;
        });
      }, 1000);

    } catch (error: any) {
      console.error('仕訳確定エラー:', error);
      alert(`仕訳の確定に失敗しました: ${error.message}`);
      setConfirmingId(null);
    }
  };

  // 一括確定ハンドラ
  const handleToggleSelect = (appId: string) => {
    setSelectedIds(prev => ({ ...prev, [appId]: !prev[appId] }));
  };

  const handleToggleSectionSelect = (apps: ApplicationWithDetails[]) => {
    const draftApps = apps.filter(app => getJournalLinesForApplication(app.id));
    const allSelected = draftApps.length > 0 && draftApps.every(app => selectedIds[app.id]);
    setSelectedIds(prev => {
      const next = { ...prev };
      draftApps.forEach(app => { next[app.id] = !allSelected; });
      return next;
    });
  };

  const handleSelectRoutine = () => {
    const routineCodes = ['TRP'];
    setSelectedIds(prev => {
      const next = { ...prev };
      filteredApplications.forEach(app => {
        const code = app.applicationCode?.code;
        if (routineCodes.includes(code || '') && getJournalLinesForApplication(app.id)) {
          next[app.id] = true;
        }
      });
      return next;
    });
  };

  const handleSelectAutoApprovable = () => {
    setSelectedIds(prev => {
      const next = { ...prev };
      autoApprovableApps.forEach(app => { next[app.id] = true; });
      return next;
    });
  };

  const handleBatchConfirm = async () => {
    setShowBatchConfirmDialog(false);
    setIsBatchConfirming(true);

    const targetAppIds = Object.entries(selectedIds)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);

    const targetEntries = targetAppIds
      .map(appId => getJournalLinesForApplication(appId))
      .filter((entry): entry is JournalEntryWithLines => entry !== null);

    let successCount = 0;
    const errors: string[] = [];

    for (const entry of targetEntries) {
      try {
        await dataService.updateJournalEntryStatus(String(entry.id), 'posted');
        successCount++;
      } catch (err: any) {
        errors.push(`Entry ${String(entry.id).slice(0, 8)}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      await loadData();
    }

    setSelectedIds({});
    setIsBatchConfirming(false);

    if (errors.length > 0) {
      alert(`${successCount}件確定、${errors.length}件失敗\n${errors.join('\n')}`);
    }
  };

  // フィルタリング
  useEffect(() => {
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.formData?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.accounting_status === statusFilter);
    }

    if (applicantFilter !== 'all') {
      filtered = filtered.filter(app => app.applicant?.name === applicantFilter);
    }

    if (companyFilter !== 'all') {
      filtered = filtered.filter(app => extractCompanyName(app) === companyFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter(app => {
        if (!app.approvedAt) return false;
        return new Date(app.approvedAt) >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      filtered = filtered.filter(app => {
        if (!app.approvedAt) return false;
        return new Date(app.approvedAt) <= new Date(dateTo + 'T23:59:59');
      });
    }

    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter, applicantFilter, companyFilter, dateFrom, dateTo, extractCompanyName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatAmount = (app: ApplicationWithDetails) => {
    const amount = app.formData?.totalAmount || app.formData?.amount || 0;
    return `¥${Number(amount).toLocaleString()}`;
  };

  const getStatusBadge = (status: AccountingStatus | undefined) => {
    switch (status) {
      case AccountingStatus.NONE:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">仕訳未生成</span>;
      case AccountingStatus.DRAFT:
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">仕訳下書き</span>;
      case AccountingStatus.POSTED:
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">仕訳確定</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">不明</span>;
    }
  };

  const getArchivedEntryForApplication = (applicationId: string): JournalEntryWithLines | null => {
    return archivedJournalEntries.find(entry =>
      entry.reference_id === applicationId && entry.status === 'posted'
    ) || null;
  };

  const getJournalLinesForApplication = (applicationId: string): JournalEntryWithLines | null => {
    return journalEntries.find(entry =>
      entry.reference_id === applicationId && entry.status === 'draft'
    ) || null;
  };

  // カード1件分のレンダリング
  const renderApplicationCard = (app: ApplicationWithDetails) => {
    const journalEntry = getJournalLinesForApplication(app.id);
    const isConfirming = confirmingId === app.id;
    const isFadingOut = confirmedIds.has(app.id);
    const mqProfit = calculateMQProfit(app);
    const hasDraft = !!journalEntry;

    return (
      <div key={app.id} className={`p-6 hover:bg-slate-50 transition-all duration-300 relative ${isFadingOut ? 'animate-fade-out-right' : ''}`}>
        {isConfirming && (
          <div className="absolute inset-0 bg-green-50/80 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2 animate-check-pop">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <span className="text-sm font-semibold text-green-700">確定完了</span>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={!!selectedIds[app.id]}
            onChange={() => handleToggleSelect(app.id)}
            disabled={!hasDraft}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-slate-800">
                {app.formData?.title || app.formData?.description || '申請'}
              </h3>
              {journalEntry ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  仕訳下書き ({journalEntry.lines.length}行)
                </span>
              ) : (
                getStatusBadge(app.accounting_status)
              )}
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                {app.applicationCode?.name || '申請種別'}
              </span>
              {mqProfit && (
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  mqProfit.isAutoApprovable
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  利益率 {(mqProfit.profitRate * 100).toFixed(1)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
              <div>
                <span className="font-medium">申請者</span>
                <div>{app.applicant?.name || '-'}</div>
              </div>
              <div>
                <span className="font-medium">承認日</span>
                <div>{app.approvedAt ? new Date(app.approvedAt).toLocaleDateString('ja-JP') : '-'}</div>
              </div>
              <div>
                <span className="font-medium">金額</span>
                <div className="font-bold text-slate-800">{formatAmount(app)}</div>
              </div>
              <div>
                <span className="font-medium">申請ID</span>
                <div className="font-mono text-xs">{app.id.slice(0, 8)}...</div>
              </div>
            </div>

            {journalEntry && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  仕訳明細 (draft)
                </h4>
                <div className="space-y-2">
                  {journalEntry.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-slate-600">{line.account_code}</span>
                        <span className="font-medium text-slate-800">{line.account_name}</span>
                      </div>
                      <div className="text-right">
                        {line.debit_amount && line.debit_amount > 0 ? (
                          <span className="font-bold text-red-600">¥{Number(line.debit_amount).toLocaleString()}</span>
                        ) : (
                          <span className="font-bold text-blue-600">¥{Number(line.credit_amount).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {app.formData?.description && (
              <div className="mt-3 p-3 bg-slate-50 rounded text-sm text-slate-600">
                {app.formData.description}
              </div>
            )}
          </div>

          <div className="ml-4 flex flex-col gap-2">
            {!journalEntry ? (
              <button
                onClick={() => handleGenerateJournal(app)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                仕訳を生成
              </button>
            ) : (
              <button
                onClick={() => handleConfirmJournal(journalEntry.id)}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                仕訳を確定
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              仕訳レビュー
            </h1>
            <p className="text-slate-600 mt-1">
              承認済み申請の仕訳生成と確認を行います。
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold text-blue-600 ${confirmingId ? 'animate-count-pulse' : ''}`}>{filteredApplications.length}</div>
            <div className="text-sm text-slate-600">対象件数</div>
          </div>
        </div>

        {/* 検索・フィルター */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="申請タイトル・申請者名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AccountingStatus | 'all')}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            <option value={AccountingStatus.NONE}>仕訳未生成</option>
            <option value={AccountingStatus.DRAFT}>仕訳下書き</option>
          </select>

          <select
            value={applicantFilter}
            onChange={(e) => setApplicantFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">申請者: すべて</option>
            {applicantOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {companyOptions.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">企業: すべて</option>
              {companyOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* グルーピングモード切替 */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['flat', 'company', 'purpose'] as GroupMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  groupMode === mode
                    ? 'bg-white text-blue-600 font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'flat' ? 'フラット' : mode === 'company' ? '会社別' : '目的別'}
              </button>
            ))}
          </div>

          {(searchTerm || statusFilter !== 'all' || applicantFilter !== 'all' ||
            companyFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setApplicantFilter('all');
                setCompanyFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              フィルターをリセット
            </button>
          )}
        </div>
      </div>

      {/* 一括確定アクションバー */}
      {selectedCount > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-blue-800">
              {selectedCount}件選択中
            </span>
            <button
              onClick={handleSelectRoutine}
              className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
            >
              定型（交通費）を自動選択
            </button>
            {autoApprovableApps.length > 0 && (
              <button
                onClick={handleSelectAutoApprovable}
                className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 font-semibold"
              >
                利益率30%以上を全選択 ({autoApprovableApps.length}件)
              </button>
            )}
          </div>
          <button
            onClick={() => setShowBatchConfirmDialog(true)}
            disabled={isBatchConfirming}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-400"
          >
            {isBatchConfirming ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            一括確定 ({selectedCount}件)
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden">
        {autoGenerating ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 p-8">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>AI仕訳を自動生成中...</span>
                <span>{autoGenProgress.done} / {autoGenProgress.total}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${autoGenProgress.total > 0 ? (autoGenProgress.done / autoGenProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            {autoGenErrors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="font-semibold">{autoGenErrors.length}件の生成に失敗:</p>
                <ul className="mt-1 list-disc pl-4">
                  {autoGenErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">読み込み中...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <AlertTriangle className="w-6 h-6 mr-2" />
            {error}
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">対象の申請はありません</h3>
              <p className="mb-2">現在、仕訳レビュー対象の申請がありません。</p>
              <div className="text-sm text-slate-400 bg-slate-50 rounded-lg p-3 mt-4">
                <p>申請が承認されると仕訳レビューに表示されます。</p>
                <ul className="text-left mt-2 space-y-1">
                  <li>・申請が承認されていること</li>
                  <li>・まだ仕訳が確定されていないこと</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {groupedApplications.map(([sectionName, apps]) => (
              <div key={sectionName}>
                {/* セクションヘッダー（フラットモード以外で表示） */}
                {groupMode !== 'flat' && (
                  <div
                    className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-100 border-b border-slate-200 cursor-pointer"
                    onClick={() => {
                      setCollapsedSections(prev => {
                        const next = new Set(prev);
                        next.has(sectionName) ? next.delete(sectionName) : next.add(sectionName);
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`w-4 h-4 transition-transform ${
                        collapsedSections.has(sectionName) ? '-rotate-90' : ''
                      }`} />
                      <span className="font-semibold text-slate-700">{sectionName}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {apps.length}件
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSectionSelect(apps);
                      }}
                      className="text-xs px-3 py-1 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300"
                    >
                      セクション選択
                    </button>
                  </div>
                )}

                {/* セクション内カード */}
                {!collapsedSections.has(sectionName) && (
                  <div className="divide-y divide-slate-200">
                    {apps.map(app => renderApplicationCard(app))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {archivedApplications.length > 0 && (
          <div className="mt-6 border border-slate-200 rounded-2xl bg-slate-50/40 p-5 space-y-4">
            <button
              onClick={() => setArchiveExpanded(prev => !prev)}
              className="w-full flex items-center justify-between cursor-pointer group text-left"
            >
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  アーカイブ済みの仕訳
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${archiveExpanded ? 'rotate-180' : ''}`} />
                </h3>
                <p className="text-xs text-slate-500">
                  仕訳確定済みの申請 ({archivedApplications.length}件)
                </p>
              </div>
              <span className="text-sm font-semibold text-blue-600">
                {archivedApplications.length}件
              </span>
            </button>
            {archiveExpanded && (
              <div className="grid gap-3">
                {archivedApplications
                  .slice(0, archiveShowAll ? archivedApplications.length : ARCHIVE_PREVIEW_COUNT)
                  .map((app) => {
                    const journalEntry = getArchivedEntryForApplication(app.id);
                    return (
                      <div key={`archive-${app.id}`} className="flex items-start justify-between p-4 bg-white rounded-xl border border-slate-200">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm text-slate-400">申請ID {app.id.slice(0, 8)}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-slate-800">{app.formData?.title || app.formData?.description || '申請'}</h4>
                            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                              仕訳確定済
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            {app.applicant?.name || '申請者不明'}・{app.approvedAt ? new Date(app.approvedAt).toLocaleDateString('ja-JP') : '承認日なし'}
                          </p>
                          <p className="text-sm font-semibold text-slate-800">{formatAmount(app)}</p>
                          {journalEntry && (
                            <p className="text-xs text-slate-500">
                              {journalEntry.lines.length}行 (posted at {journalEntry.date ? new Date(journalEntry.date).toLocaleDateString('ja-JP') : '―'})
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>アーカイブ済</p>
                          <p>{journalEntry?.created_at ? new Date(journalEntry.created_at).toLocaleDateString('ja-JP') : '登録日不明'}</p>
                        </div>
                      </div>
                    );
                  })}
                {!archiveShowAll && archivedApplications.length > ARCHIVE_PREVIEW_COUNT && (
                  <button
                    onClick={() => setArchiveShowAll(true)}
                    className="w-full py-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    残り {archivedApplications.length - ARCHIVE_PREVIEW_COUNT} 件を表示
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 一括確定ダイアログ */}
      {showBatchConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">一括確定の確認</h3>
            <p className="text-slate-600 mb-4">
              {selectedCount}件の仕訳を確定します。この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatchConfirmDialog(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleBatchConfirm}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
              >
                確定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalReviewPage;
