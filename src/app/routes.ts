import type { Page } from '../../types';

/**
 * Page string literal → URL path mapping.
 * Used by the strangler-fig bridge to keep state-based and URL-based
 * navigation in sync during the incremental migration.
 */
export const PAGE_TO_PATH: Record<Page, string> = {
  // Sales
  sales_dashboard: '/sales/dashboard',
  sales_leads: '/sales/leads',
  sales_customers: '/sales/customers',
  sales_customers_chart: '/sales/customers/chart',
  sales_pipeline: '/sales/pipeline',
  sales_estimates: '/sales/estimates',
  quote_center: '/sales/quotes',
  sales_orders: '/sales/orders',
  sales_billing: '/sales/billing',
  analysis_ranking: '/sales/ranking',
  simple_estimates: '/sales/ai-estimate',
  new_ai_estimate: '/sales/ai-estimate/new',
  print_estimate_app: '/sales/print-estimate',
  detailed_estimate: '/sales/detailed-estimate',
  customer_dashboard: '/sales/customer-dashboard',

  // Analysis
  analysis_dashboard: '/dashboard',
  strac_analysis: '/analysis/strac',

  // Project
  project_management: '/projects',

  // Purchasing
  purchasing_orders: '/purchasing/orders',
  purchasing_invoices: '/purchasing/invoices',
  purchasing_payments: '/purchasing/payments',

  // Inventory & Manufacturing
  inventory_management: '/inventory',
  manufacturing_orders: '/manufacturing/orders',
  manufacturing_progress: '/manufacturing/progress',
  manufacturing_cost: '/manufacturing/cost',

  // HR
  hr_attendance: '/hr/attendance',
  hr_man_hours: '/hr/man-hours',
  hr_labor_cost: '/hr/labor-cost',

  // Approvals
  approval_list: '/approvals',
  approval_form_expense: '/approvals/expense',
  approval_form_transport: '/approvals/transport',
  approval_form_leave: '/approvals/leave',
  approval_form_approval: '/approvals/approval',
  approval_form_daily: '/approvals/daily',
  daily_report_progress: '/approvals/daily-progress',

  // Accounting
  accounting_dashboard: '/accounting/dashboard',
  accounting_journal: '/accounting/journal',
  accounting_journal_review: '/accounting/journal-review',
  accounting_general_ledger: '/accounting/general-ledger',
  accounting_trial_balance: '/accounting/trial-balance',
  accounting_profit_loss: '/accounting/profit-loss',
  accounting_balance_sheet: '/accounting/balance-sheet',
  accounting_tax_summary: '/accounting/tax-summary',
  accounting_period_closing: '/accounting/period-closing',
  accounting_business_plan: '/accounting/business-plan',
  accounting_payables: '/accounting/payables',
  accounting_receivables: '/accounting/receivables',
  accounting_cash_schedule: '/accounting/cash-schedule',
  accounting_expense_analysis: '/accounting/expense-analysis',
  accounting_approved_applications: '/accounting/approved',
  accounting_approved_unhandled: '/accounting/approved/unhandled',
  accounting_approved_expense: '/accounting/approved/expense',
  accounting_approved_transport: '/accounting/approved/transport',
  accounting_approved_leave: '/accounting/approved/leave',
  accounting_approved_apl: '/accounting/approved/approval',
  accounting_approved_dly: '/accounting/approved/daily',

  // AI
  ai_business_consultant: '/ai/consultant',
  ai_market_research: '/ai/market-research',
  ai_transcription: '/ai/transcription',

  // Admin
  admin_audit_log: '/admin/audit-log',
  admin_journal_queue: '/admin/journal-queue',
  admin_user_management: '/admin/users',
  admin_route_management: '/admin/routes',
  admin_master_management: '/admin/master',
  admin_bug_reports: '/admin/bug-reports',
  admin_action_console: '/admin/action-console',
  settings: '/settings',

  // Communication & Knowledge
  bulletin_board: '/bulletin-board',
  knowledge_base: '/knowledge-base',
  meeting_minutes: '/meeting-minutes',
  my_schedule: '/schedule',
  email_auto_reply: '/email/auto-reply',
  newsletter: '/newsletter',

  // Document & Tools
  document_creation_tools: '/tools/documents',
  proposal_ai: '/tools/proposal-ai',
  pdf_editing_tools: '/tools/pdf',
  dtp_tools: '/tools/dtp',
  prompt_management: '/tools/prompts',
  fax_ocr_intake: '/tools/fax-ocr',

  // Business Forms
  business_forms_hub: '/forms',
  business_order: '/forms/order',
  business_production: '/forms/production',
  business_delivery: '/forms/delivery',

  // Turnaround
  turnaround_plan: '/turnaround',
};

/** Reverse map: URL path → Page string literal */
export const PATH_TO_PAGE: Record<string, Page> = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page as Page]),
) as Record<string, Page>;

/** Default page when URL doesn't match any route */
export const DEFAULT_PAGE: Page = 'sales_dashboard';
export const DEFAULT_PATH = PAGE_TO_PATH[DEFAULT_PAGE];
