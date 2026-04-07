import React, { useMemo, useState } from 'react';
import JobList from '../JobList';
import EmptyState from '../ui/EmptyState';
import SortableHeader from '../ui/SortableHeader';
import { Briefcase, FileText, Loader } from '../Icons';
import { ProjectBudgetSummary, PurchaseOrder, PurchaseOrderStatus, SortConfig, Toast, EmployeeUser } from '../../types';
import { formatDate, formatJPY } from '../../utils';
import { createJournalFromOrder } from '../../services/dataService';

interface SalesOrdersPageProps {
  projectSummaries: ProjectBudgetSummary[];
  orders: PurchaseOrder[];
  searchTerm: string;
  onSelectJob: (job: ProjectBudgetSummary) => void;
  onNewJob: () => void;
  onRefresh?: () => void | Promise<void>;
  isLoading?: boolean;
  addToast?: (message: string, type: Toast['type']) => void;
  currentUser?: EmployeeUser | null;
}

type OrderRow = PurchaseOrder & {
  projectCode: string;
  linkedProject?: ProjectBudgetSummary;
  totalAmount: number;
};

const statusStyles: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.Ordered]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [PurchaseOrderStatus.Received]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [PurchaseOrderStatus.Cancelled]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const StatusBadge: React.FC<{ status: PurchaseOrderStatus }> = ({ status }) => (
  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusStyles[status]}`}>
    {status}
  </span>
);

const OrdersSection: React.FC<{
  orders: PurchaseOrder[];
  projects: ProjectBudgetSummary[];
  addToast?: (message: string, type: Toast['type']) => void;
  currentUser?: EmployeeUser | null;
}> = ({ orders, projects, addToast, currentUser }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'orderDate', direction: 'ascending' });
  const [postingOrderId, setPostingOrderId] = useState<string | null>(null);

  const handlePostToJournal = async (order: OrderRow) => {
    setPostingOrderId(order.id);
    try {
      await createJournalFromOrder(order, currentUser?.id);
      addToast?.(`「${order.supplierName || order.projectCode}」の仕訳を作成しました。`, 'success');
    } catch (e: any) {
      addToast?.(e?.message || '仕訳の作成に失敗しました。', 'error');
    } finally {
      setPostingOrderId(null);
    }
  };

  const jobLookup = useMemo(() => {
    const lookup = new Map<string, ProjectBudgetSummary>();
    projects.forEach(project => {
      if (project.projectCode) {
        lookup.set(String(project.projectCode), project);
      }
      if (project.jobNumber) {
        lookup.set(String(project.jobNumber), project);
      }
    });
    return lookup;
  }, [projects]);

  const orderRows = useMemo<OrderRow[]>(() => {
    return orders.map(order => {
      const projectCode = order.projectCode ? String(order.projectCode) : order.itemName ? String(order.itemName) : '';
      const normalizedQuantity = Number(order.quantity ?? 0);
      const normalizedUnitPrice = Number(order.unitPrice ?? 0);
      // amount列がある場合はそちらを優先（DBに合計が入っている）
      const rawAmount = Number((order as any).amount ?? 0);
      const totalAmount = rawAmount > 0 ? rawAmount : (normalizedQuantity * normalizedUnitPrice);
      return {
        ...order,
        quantity: normalizedQuantity,
        unitPrice: normalizedUnitPrice > 0 ? normalizedUnitPrice : (normalizedQuantity > 0 ? Math.round(totalAmount / normalizedQuantity) : 0),
        projectCode,
        linkedProject: projectCode ? jobLookup.get(projectCode) : undefined,
        totalAmount,
      };
    });
  }, [orders, jobLookup]);

  const sortedOrders = useMemo(() => {
    if (!sortConfig) return orderRows;
    const items = [...orderRows];
    items.sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];
      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    return items;
  }, [orderRows, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {orderRows.length === 0 ? (
        <div className="px-6 py-12">
          <EmptyState
            icon={Briefcase}
            title="ordersテーブルにデータがありません"
            message="新規案件を登録すると、初期受注データがここに表示されます。"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-base text-left text-slate-600 dark:text-slate-300">
            <thead className="text-sm uppercase bg-slate-50 dark:bg-slate-700/70 text-slate-600 dark:text-slate-200">
              <tr>
                <SortableHeader sortKey="supplierName" label="顧客 / 案件名" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="orderDate" label="受注日" sortConfig={sortConfig} requestSort={requestSort} />
                <th scope="col" className="px-4 py-3 font-medium">納期</th>
                <SortableHeader sortKey="quantity" label="数量" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                <SortableHeader sortKey="unitPrice" label="単価" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                <SortableHeader sortKey="totalAmount" label="売上高" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                <SortableHeader sortKey="status" label="ステータス" sortConfig={sortConfig} requestSort={requestSort} />
                <th scope="col" className="px-4 py-3 font-medium text-center">計上</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map(order => {
                const customerName = order.linkedProject?.clientName || order.supplierName || '-';
                const projectTitle = order.linkedProject?.title || order.projectCode || order.itemName || '-';
                const statusLabel = order.status === PurchaseOrderStatus.Ordered ? '受注' : order.status === PurchaseOrderStatus.Received ? '納品済' : order.status === PurchaseOrderStatus.Cancelled ? 'キャンセル' : (order.status || '未設定');
                return (
                  <tr key={order.id} className="bg-white dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{customerName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{projectTitle}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDate(order.orderDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatDate((order as any).deliveryDate || (order as any).delivery_date) || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{order.quantity > 0 ? order.quantity.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-sm">{order.unitPrice > 0 ? formatJPY(order.unitPrice) : '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {order.totalAmount > 0 ? formatJPY(order.totalAmount) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        order.status === PurchaseOrderStatus.Ordered ? 'bg-blue-100 text-blue-700' :
                        order.status === PurchaseOrderStatus.Received ? 'bg-green-100 text-green-700' :
                        order.status === PurchaseOrderStatus.Cancelled ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePostToJournal(order)}
                        disabled={postingOrderId === order.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:hover:bg-indigo-800/50 disabled:opacity-50 transition"
                        title="仕訳下書きを作成"
                      >
                        {postingOrderId === order.id ? <Loader className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                        仕訳作成
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SalesOrdersPage: React.FC<SalesOrdersPageProps> = ({
  projectSummaries,
  orders,
  searchTerm,
  onSelectJob,
  onNewJob,
  onRefresh,
  isLoading = false,
  addToast,
  currentUser,
}) => {
  return (
    <div className="space-y-10">
      {onRefresh && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
          >
            再読み込み
          </button>
        </div>
      )}
      <section>
        <JobList
          jobs={projectSummaries}
          searchTerm={searchTerm}
          onSelectJob={onSelectJob}
          onNewJob={onNewJob}
        />
      </section>

      <section className="space-y-4">
        <OrdersSection orders={orders} projects={projectSummaries} addToast={addToast} currentUser={currentUser} />
      </section>
    </div>
  );
};

export default React.memo(SalesOrdersPage);
