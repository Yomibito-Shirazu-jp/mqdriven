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

  it('removes the review card after confirming the journal entry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    const confirmButton = await screen.findByRole('button', { name: '仕訳を確定' });
    await user.click(confirmButton);

    // アニメーション完了を待つ (500ms + 500ms)
    await vi.advanceTimersByTimeAsync(1100);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '仕訳を確定' })).not.toBeInTheDocument();
      expect(screen.getByText('アーカイブ済みの仕訳')).toBeInTheDocument();
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

  it('shows checkbox for draft entries', async () => {
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeDisabled();
    });
  });

  it('shows batch confirm button when items are selected', async () => {
    const user = userEvent.setup();
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);

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

    // データロード完了を待つ
    await screen.findByText('テスト申請');

    const purposeButton = screen.getByText('目的別');
    await user.click(purposeButton);

    await waitFor(() => {
      expect(screen.getByText('セクション選択')).toBeInTheDocument();
    });
  });
});
