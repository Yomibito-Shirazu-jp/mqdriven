import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JournalReviewPage from './JournalReviewPage';
import { AccountingStatus, ApplicationStatus } from '../../types';

vi.mock('../../services/dataService', () => ({
  getApplications: vi.fn(),
  getJournalEntriesByStatus: vi.fn(),
  updateJournalEntryStatus: vi.fn(),
  generateJournalLinesFromApplication: vi.fn(),
}));

vi.mock('../../utils/mqProfitCalculation', () => ({
  calculateMQProfit: vi.fn(() => null),
  PROFIT_THRESHOLD: 0.3,
}));

const makeApp = (overrides: Record<string, any> = {}) => ({
  id: 'app-1',
  status: ApplicationStatus.APPROVED,
  accounting_status: AccountingStatus.DRAFT,
  formData: { title: 'テスト申請', totalAmount: 1000 },
  applicant: { name: '申請者' },
  approvedAt: '2024-01-02',
  ...overrides,
});

const makeDraftEntry = (overrides: Record<string, any> = {}) => ({
  id: 'journal-1',
  reference_id: 'app-1',
  status: 'draft',
  lines: [],
  ...overrides,
});

describe('JournalReviewPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    const dataService = await import('../../services/dataService');
    (dataService.getApplications as vi.Mock).mockResolvedValue([makeApp()]);
    (dataService.getJournalEntriesByStatus as vi.Mock).mockImplementation((status: string) => {
      if (status === 'draft') return Promise.resolve([makeDraftEntry()]);
      return Promise.resolve([]);
    });
    (dataService.updateJournalEntryStatus as vi.Mock).mockResolvedValue(undefined);
    (dataService.generateJournalLinesFromApplication as vi.Mock).mockResolvedValue({
      journalEntryId: 'journal-gen',
      lines: [{ id: 'line-1', accountCode: '100', debitAmount: 1000, creditAmount: 0 }],
    });
  });

  it('renders journal review table with data', async () => {
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(screen.getByText('テスト申請')).toBeInTheDocument();
      expect(screen.getByText('仕訳レビュー')).toBeInTheDocument();
    });
  });

  it('removes the review row after confirming the journal entry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    // 確定リンクをクリック
    const confirmLink = await screen.findByRole('button', { name: '確定' });
    await user.click(confirmLink);

    // 実行リンクをクリック
    const executeLink = await screen.findByRole('button', { name: '実行' });
    await user.click(executeLink);

    // アニメーション完了を待つ (500ms + 500ms)
    await vi.advanceTimersByTimeAsync(1100);

    await waitFor(() => {
      expect(screen.queryByText('テスト申請')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('shows grouping toggle buttons', async () => {
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(screen.getByText('フラット')).toBeInTheDocument();
      expect(screen.getByText('会社別')).toBeInTheDocument();
      expect(screen.getByText('目的別')).toBeInTheDocument();
    });
  });

  it('shows checkboxes for draft entries', async () => {
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      // Header checkbox + row checkbox
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows batch confirm link when items are selected', async () => {
    const user = userEvent.setup();
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(screen.getByText('テスト申請')).toBeInTheDocument();
    });

    // Find the row checkbox (not the header checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    const rowCheckbox = checkboxes.find(cb => !cb.closest('th'));
    if (rowCheckbox) {
      await user.click(rowCheckbox);
    }

    await waitFor(() => {
      expect(screen.getByText(/一括確定/)).toBeInTheDocument();
      expect(screen.getByText('1件選択中')).toBeInTheDocument();
    });
  });

  it('auto-generates journal entries for NONE status apps', async () => {
    const dataService = await import('../../services/dataService');
    (dataService.getApplications as vi.Mock)
      .mockResolvedValueOnce([makeApp({ accounting_status: AccountingStatus.NONE })])
      .mockResolvedValueOnce([makeApp({ accounting_status: AccountingStatus.DRAFT })]);

    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(dataService.generateJournalLinesFromApplication).toHaveBeenCalledWith('app-1');
    });
  });

  it('shows section header when purpose mode is selected', async () => {
    const user = userEvent.setup();
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await screen.findByText('テスト申請');

    const purposeButton = screen.getByText('目的別');
    await user.click(purposeButton);

    await waitFor(() => {
      expect(screen.getByText('セクション選択')).toBeInTheDocument();
    });
  });

  it('shows inline 2-step confirm (確定 → 実行/取消)', async () => {
    const user = userEvent.setup();
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    const confirmLink = await screen.findByRole('button', { name: '確定' });
    await user.click(confirmLink);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '実行' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    });
  });
});
