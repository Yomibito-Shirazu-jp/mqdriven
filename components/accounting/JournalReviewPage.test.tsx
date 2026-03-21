import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JournalReviewPage from './JournalReviewPage';

vi.mock('../../services/dataService', () => ({
  getEstimatesPage: vi.fn(),
}));

describe('JournalReviewPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const dataService = await import('../../services/dataService');
    (dataService.getEstimatesPage as vi.Mock).mockResolvedValue({
      rows: [
        {
          id: 'est-1',
          pattern_name: 'テスト案件',
          customer_name: 'テスト顧客',
          specification: 'A4パンフレット',
          subtotal: 100000,
          valiable_cost: 70000,
          create_date: '2024-01-02',
          status: 'draft',
        },
      ],
      totalCount: 1,
    });
  });

  it('renders estimate analysis table with data', async () => {
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(screen.getByText('案件予算分析')).toBeInTheDocument();
      expect(screen.getByText('テスト案件')).toBeInTheDocument();
      expect(screen.getAllByText('テスト顧客').length).toBeGreaterThan(0);
    });
  });

  it('filters estimates by search text', async () => {
    const user = userEvent.setup();
    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(screen.getByText('テスト案件')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('案件名、顧客名、仕様で検索...');
    await user.clear(searchInput);
    await user.type(searchInput, '存在しない案件');

    await waitFor(() => {
      expect(screen.queryByText('テスト案件')).not.toBeInTheDocument();
      expect(screen.getByText('案件が見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('shows empty state when no estimate rows are returned', async () => {
    const dataService = await import('../../services/dataService');
    (dataService.getEstimatesPage as vi.Mock).mockResolvedValue({ rows: [], totalCount: 0 });

    render(<JournalReviewPage currentUser={{ id: 'user-1', name: 'Tester' }} />);

    await waitFor(() => {
      expect(screen.getByText('案件が見つかりませんでした')).toBeInTheDocument();
    });
  });
});
