import React from 'react';
import JournalLedger from './accounting/JournalLedger';
import GeneralLedger from './accounting/GeneralLedger';
import TrialBalancePage from './accounting/TrialBalancePage';
import InvoiceOCR from './InvoiceOCR';
import PaymentManagement from './accounting/PaymentManagement';
import LaborCostManagement from './accounting/LaborCostManagement';
import PeriodClosingPage from './accounting/PeriodClosingPage';
import PlaceholderPage from './PlaceholderPage';
import BillingManagement from './accounting/BillingManagement';
import { STANDARD_CONSUMPTION_TAX_RATE } from '../services/accountingConstants';
import {
    JournalEntry,
    InvoiceData,
    Page,
    EmployeeUser,
    Employee,
    Job,
    ApplicationWithDetails,
    ConfirmationDialogProps,
} from '../types';

interface AccountingPageProps {
    page: Page;
    journalEntries: JournalEntry[];
    accountItems: unknown[];
    onAddEntry: (entry: Omit<JournalEntry, 'id'> | JournalEntry) => void | Promise<void>;
    addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
    requestConfirmation: (dialog: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => void;
    jobs: Job[];
    applications: ApplicationWithDetails[];
    onNavigate: (page: Page) => void;
    customers: unknown[];
    employees: Employee[];
    onRefreshData: () => void;
    isAIOff?: boolean;
    currentUser?: EmployeeUser | null;
}

const AccountingPage: React.FC<AccountingPageProps> = (props) => {
    const {
        page,
        journalEntries,
        onAddEntry,
        addToast,
        requestConfirmation,
        jobs,
        applications,
        onNavigate,
        employees,
        onRefreshData,
    } = props;

    switch (page as Page) {
        case 'accounting_journal':
            return (
                <JournalLedger
                    onAddEntry={onAddEntry}
                    isAIOff={props.isAIOff}
                    currentUser={props.currentUser}
                />
            );

        case 'sales_billing':
            return (
                <BillingManagement jobs={jobs} onRefreshData={onRefreshData} onMarkPaid={() => {}} />
            );

        case 'purchasing_invoices': {
            const handleSaveExpenses = (data: InvoiceData) => {
                let expenseAmount: number;
                let consumptionTaxAmount: number;
                let totalCreditAmount = data.totalAmount ?? 0;

                if (data.taxInclusive) {
                    if (data.taxAmount && data.taxAmount > 0) {
                        consumptionTaxAmount = data.taxAmount;
                        expenseAmount = (data.totalAmount ?? 0) - consumptionTaxAmount;
                    } else if (data.subtotalAmount && data.subtotalAmount > 0) {
                        expenseAmount = data.subtotalAmount;
                        consumptionTaxAmount = (data.totalAmount ?? 0) - expenseAmount;
                    } else {
                        expenseAmount = Math.round((data.totalAmount ?? 0) / (1 + STANDARD_CONSUMPTION_TAX_RATE));
                        consumptionTaxAmount = (data.totalAmount ?? 0) - expenseAmount;
                    }
                } else {
                    expenseAmount = data.totalAmount ?? 0;
                    consumptionTaxAmount =
                        data.taxAmount ?? Math.round((data.totalAmount ?? 0) * STANDARD_CONSUMPTION_TAX_RATE);
                    totalCreditAmount = expenseAmount + consumptionTaxAmount;
                }

                onAddEntry({
                    account: '買掛金',
                    description: `仕入 ${data.vendorName} (${data.description})`,
                    credit: totalCreditAmount,
                    debit: 0,
                });

                onAddEntry({
                    account: data.account || '仕入高',
                    description: `仕入 ${data.vendorName}`,
                    debit: expenseAmount,
                    credit: 0,
                });

                if (consumptionTaxAmount > 0) {
                    onAddEntry({
                        account: '仮払消費税',
                        description: `仮払消費税 ${data.vendorName}`,
                        debit: consumptionTaxAmount,
                        credit: 0,
                    });
                }

                addToast('買掛金と経費が計上されました。', 'success');
            };
            return (
                <InvoiceOCR
                    onSaveExpenses={handleSaveExpenses}
                    addToast={addToast}
                    requestConfirmation={requestConfirmation}
                    isAIOff={props.isAIOff}
                />
            );
        }

        case 'purchasing_payments': {
            const handleExecutePayment = async (supplier: string, amount: number) => {
                await onAddEntry({
                    account: '買掛金',
                    description: `支払実施: ${supplier}`,
                    debit: amount,
                    credit: 0,
                });
                await onAddEntry({
                    account: '普通預金',
                    description: `支払: ${supplier}`,
                    debit: 0,
                    credit: amount,
                });
                addToast(`${supplier}への支払処理が完了し、仕訳が作成されました。`, 'success');
            };
            return (
                <PaymentManagement
                    journalEntries={journalEntries}
                    onExecutePayment={handleExecutePayment}
                />
            );
        }

        case 'hr_labor_cost':
            return <LaborCostManagement employees={employees || []} />;

        case 'accounting_general_ledger':
            return <GeneralLedger />;

        case 'accounting_trial_balance':
            return <TrialBalancePage />;

        case 'accounting_period_closing':
            return (
                <PeriodClosingPage
                    addToast={addToast}
                    jobs={jobs}
                    applications={applications}
                    journalEntries={journalEntries}
                    onNavigate={onNavigate}
                />
            );

        default:
            return <PlaceholderPage title={String(page)} />;
    }
};

export default AccountingPage;
