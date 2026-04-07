import { User } from './types';

declare const jspdf: any;
declare const html2canvas: any;

export const getEnvValue = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return undefined;
};

export const formatJPY = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.round(amount));
};

/**
 * Safely convert any value to a finite number, or return null.
 *
 * This is the SINGLE source-of-truth numeric parser used by
 * `deriveApplicationAmount`.  Every component that needs to extract a
 * monetary value from application formData MUST call
 * `deriveApplicationAmount` (below) instead of rolling its own parser.
 */
export const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return !Number.isNaN(parsed) && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * ====================================================================
 *  deriveApplicationAmount  –  唯一の金額取得関数
 * ====================================================================
 *
 *  全画面（一覧・詳細・ダッシュボード・承認・会計）はこの関数だけを
 *  使って申請金額を取得すること。ロジックを各コンポーネントにコピー
 *  しないこと！
 *
 *  経費精算 (EXP) フォームは金額を formData.invoice.totalGross に
 *  保存するため、トップレベルの amount / totalAmount だけでは不十分。
 *
 *  優先順:
 *    1. data.amount
 *    2. data.totalAmount
 *    3. data.requestedAmount
 *    4. data.estimatedAmount
 *    5. data.invoice.totalGross   ← 経費精算はここに入る
 *    6. data.invoice.totalNet
 *    7. data.invoice.totalAmount
 *    8. data.invoice.total
 *    9. sum(data.details[].amount)
 *   10. sum(data.invoice.lines[].amountExclTax ?? .amount)
 * ====================================================================
 */
export const deriveApplicationAmount = (formData: any): number | null => {
  const data: Record<string, any> = formData && typeof formData === 'object' ? formData : {};
  const invoice: Record<string, any> = data.invoice && typeof data.invoice === 'object' ? data.invoice : {};

  // --- scalar candidates (first non-null wins) ---
  const scalars = [
    toFiniteNumber(data.amount),
    toFiniteNumber(data.totalAmount),
    toFiniteNumber(data.requestedAmount),
    toFiniteNumber(data.estimatedAmount),
    toFiniteNumber(invoice.totalGross),
    toFiniteNumber(invoice.totalNet),
    toFiniteNumber(invoice.totalAmount),
    toFiniteNumber(invoice.total),
  ];

  for (const v of scalars) {
    if (v !== null) return v;
  }

  // --- array sums as last resort ---
  const sumArray = (items: unknown[], key: string, altKey?: string): number | null => {
    if (!Array.isArray(items) || items.length === 0) return null;
    let total = 0;
    let found = false;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, any>;
      const n = toFiniteNumber(rec[key]) ?? (altKey ? toFiniteNumber(rec[altKey]) : null);
      if (n !== null) { total += n; found = true; }
    }
    return found && total > 0 ? total : null;
  };

  return (
    sumArray(data.details, 'amount') ??
    sumArray(invoice.lines, 'amountExclTax', 'amount') ??
    null
  );
};

export const parseDateSafe = (input: string | Date | null | undefined): Date | null => {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // Prefer stable parsing for date-only strings (avoid timezone shifts and Safari parsing quirks).
  const ymdMatch = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const d = new Date(year, month - 1, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = parseDateSafe(dateString);
    if (!date) return String(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (e) {
    return String(dateString);
  }
};

export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = parseDateSafe(dateString);
    if (!date) return String(dateString);
    //toLocaleString can produce slightly different formats, so we build it manually
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return String(dateString);
  }
};

export const normalizeSearchText = (value: string | undefined | null): string => {
    if (!value) return '';
    return value
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFKC')
        .replace(/\s+/g, ' ');
};

export const createSignature = (): string => {
    try {
        const settingsStr = localStorage.getItem('signatureSettings');
        const settings = settingsStr ? JSON.parse(settingsStr) : null;
        
        const companyName = settings?.companyName || '文唱堂印刷株式会社';
        const address = '〒101-0025 東京都千代田区神田佐久間町3-37';
        const phone = settings?.phone || 'TEL：03-3851-0111　FAX：03-3861-1979';
        const department = settings?.department || 'システム管理・開発';
        const name = settings?.yourName || '石嶋 洋平';
        const email = settings?.email || 'sales.system@mqprint.co.jp';
        const website = settings?.website;

        let signature = `\n\n---------------------------------------
${companyName}
${address}
${phone}
${department}
${name}
E-mail：${email}`;
        
        if (website) {
            signature += `\n${website}`;
        }

        signature += `
---------------------------------------`;
        
        return signature;

    } catch (error) {
        console.error("Failed to create signature:", error);
        return `\n\n---------------------------------------
（署名の自動生成に失敗しました。設定画面の署名情報を確認してください。）
---------------------------------------`;
    }
};

export const generateMultipagePdf = async (elementId: string, fileName: string) => {
    const input = document.getElementById(elementId);
    if (!input) {
        throw new Error(`PDF生成用の要素(ID: "${elementId}")が見つかりませんでした。`);
    }

    const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: input.scrollWidth,
        height: input.scrollHeight,
        windowWidth: input.scrollWidth,
        windowHeight: input.scrollHeight,
    });

    const pdf = new jspdf.jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate the height of the canvas content when fitted to the PDF width
    const ratio = canvasWidth / pdfWidth;
    const canvasRenderedHeight = canvasHeight / ratio;

    let position = 0;
    let pageCount = 1;
    const totalPages = Math.ceil(canvasRenderedHeight / pdfHeight);

    while (position < canvasRenderedHeight) {
        if (pageCount > 1) {
            pdf.addPage();
        }
        
        pdf.addImage(canvas, 'PNG', 0, -position, pdfWidth, canvasRenderedHeight);

        // Add header and footer to each page
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        
        // Header
        pdf.text('文唱堂印刷株式会社 | Confidential', 15, 10);
        
        // Footer
        pdf.text(
            `Page ${pageCount} of ${totalPages}`,
            pdfWidth / 2,
            pdfHeight - 10,
            { align: 'center' }
        );
        pdf.text(
            new Date().toLocaleDateString('ja-JP'),
            pdfWidth - 15,
            pdfHeight - 10,
            { align: 'right' }
        );

        position += pdfHeight;
    }

    pdf.save(fileName);
};

export const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '¥0';
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(amount);
};
