/**
 * printTemplate.tsx
 * 印刷帳票共通テンプレート
 *
 * 使い方:
 *   import { T, fmtDate, fmtMoney, DocPage, DocTitle, DocInfoHeader, ... } from './printTemplate';
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────

export const T = {
  // Typography
  fontDoc: '"MS Mincho","ＭＳ 明朝","Yu Mincho","游明朝",serif',
  fontUI:  '"MS Gothic","ＭＳ ゴシック","Hiragino Kaku Gothic Pro",monospace',

  // A4
  pageW: '210mm' as const,
  pageH: '297mm' as const,
  padOuter: '14mm 16mm 22mm' as const,

  // Monochrome ink
  ink:          '#000000',
  muted:        '#444444',
  subtle:       '#888888',
  border:       '#cccccc',
  borderStrong: '#888888',

  // Table — teal accent (#0f766e from tailwind.config)
  tableHead:    '#0f766e',
  tableHeadFg:  '#ffffff',
  tableAlt:     '#f5f5f5',
  tableTotals:  '#e8f5f3',
  tableTotalBold:'#c9e8e3',

  // Overlay
  watermark:    'rgba(0,0,0,0.05)',
  stamp:        'rgba(60,60,200,0.12)',

  // Footer bar
  footerBg:     '#222222',
  footerFg:     '#bbbbbb',
} as const;

// ─────────────────────────────────────────────────────────────────
//  FORMATTER UTILITIES
// ─────────────────────────────────────────────────────────────────

export const fmtDate = (v?: string | null): string => {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

export const fmtMoney = (v?: string | number | null): string => {
  const n = Number(v);
  if (v == null || v === '' || isNaN(n)) return '-';
  return `¥${n.toLocaleString()}`;
};

export const fmtMoneyNum = (v?: string | number | null): string => {
  const n = Number(v);
  if (v == null || v === '' || isNaN(n)) return '-';
  return n.toLocaleString();
};

export const fmtClaimMonth = (v?: string | null): string => {
  if (!v || v.length < 6) return v ?? '-';
  return `${v.slice(0, 4)}年${v.slice(4, 6)}月`;
};

// ─────────────────────────────────────────────────────────────────
//  TABLE CELL STYLE HELPERS
// ─────────────────────────────────────────────────────────────────

export const docTh = (
  width?: string,
  align: React.CSSProperties['textAlign'] = 'left',
): React.CSSProperties => ({
  width,
  textAlign: align,
  padding: '5px 8px',
  background: T.tableHead,
  color: T.tableHeadFg,
  border: `1px solid ${T.tableHead}`,
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
});

export const docTd = (
  align: React.CSSProperties['textAlign'] = 'left',
  extra?: React.CSSProperties,
): React.CSSProperties => ({
  textAlign: align,
  padding: '4px 8px',
  border: `1px solid ${T.border}`,
  verticalAlign: 'top',
  ...extra,
});

export const docTdTotal = (
  align: React.CSSProperties['textAlign'] = 'right',
  bold = false,
  strong = false,
): React.CSSProperties => ({
  ...docTd(align),
  background: strong ? T.tableTotalBold : T.tableTotals,
  fontWeight: bold || strong ? 'bold' : 'normal',
  fontSize: strong ? '12pt' : undefined,
});

// ─────────────────────────────────────────────────────────────────
//  PRINT CSS (inject once per page)
// ─────────────────────────────────────────────────────────────────

export const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  @page { margin: 0; size: A4 portrait; }
  body { margin: 0; }
}
`;

// ─────────────────────────────────────────────────────────────────
//  SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────

/** A4 page wrapper */
export const DocPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    width: T.pageW,
    height: T.pageH,
    position: 'relative',
    background: '#fff',
    fontFamily: T.fontDoc,
    fontSize: '10.5pt',
    color: T.ink,
    overflow: 'hidden',
    boxSizing: 'border-box',
  }}>
    {children}
  </div>
);

/** Content area — flex column, sits above overlay elements */
export const DocBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'relative',
    zIndex: 1,
    padding: T.padOuter,
    paddingBottom: '20mm',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  }}>
    {children}
  </div>
);

/** Centered bold title + bottom rule */
export const DocTitle: React.FC<{ title: string }> = ({ title }) => (
  <>
    <div style={{
      textAlign: 'center',
      fontSize: '22pt',
      fontWeight: 'bold',
      letterSpacing: '0.5em',
      marginBottom: '3mm',
    }}>
      {title}
    </div>
    <hr style={{ border: 'none', borderTop: `2px solid ${T.ink}`, margin: '0 0 5mm' }} />
  </>
);

/** Two-column info block: customer (left) + doc meta (right) */
export interface DocInfoHeaderProps {
  customerName?: string | null;
  customerPostNo?: string | null;
  customerAddress?: string | null;
  issuerName?: string | null;
  issuerAddress?: string | null;
  issuerTel?: string | null;
  issuerFax?: string | null;
  meta: Array<{ label: string; value: string }>;
}

export const DocInfoHeader: React.FC<DocInfoHeaderProps> = ({
  customerName,
  customerPostNo,
  customerAddress,
  issuerName,
  issuerAddress,
  issuerTel,
  issuerFax,
  meta,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm' }}>
    {/* 左: 宛先 + 自社 */}
    <div style={{ flex: '0 0 58%' }}>
      <div style={{
        fontSize: '14pt', fontWeight: 'bold',
        borderBottom: `1.5px solid ${T.ink}`,
        paddingBottom: '1mm',
        display: 'inline-block',
        minWidth: '70%',
      }}>
        {customerName ?? '（取引先不明）'}　御中
      </div>
      <div style={{ marginTop: '3mm', fontSize: '9pt', lineHeight: 1.9 }}>
        {issuerName    && <div style={{ fontWeight: 'bold' }}>{issuerName}</div>}
        {customerPostNo && <div>〒{customerPostNo}</div>}
        {customerAddress && <div>{customerAddress}</div>}
        {issuerAddress && <div>{issuerAddress}</div>}
        {issuerTel && (
          <div>TEL　{issuerTel}{issuerFax ? `　FAX　${issuerFax}` : ''}</div>
        )}
      </div>
    </div>
    {/* 右: 番号・日付 */}
    <div style={{ textAlign: 'right', fontSize: '9.5pt', lineHeight: 2.0 }}>
      {meta.map(({ label, value }) => (
        <div key={label}>{label}：{value}</div>
      ))}
    </div>
  </div>
);

/** Bold lead sentence */
export const DocLeadText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '4mm' }}>
    {children}
  </div>
);

/** Spacer that grows to fill remaining vertical space */
export const DocSpacer: React.FC = () => <div style={{ flex: 1 }} />;

/** ― 以 上 ― line */
export const DocEnd: React.FC = () => (
  <div style={{ textAlign: 'center', fontSize: '8.5pt', color: T.subtle, marginBottom: '3mm' }}>
    ―　以　上　―
  </div>
);

/** Remarks box */
export const DocRemarks: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    border: `1px solid ${T.border}`,
    padding: '3mm 4mm',
    fontSize: '8.5pt',
    lineHeight: 1.8,
    marginBottom: '4mm',
  }}>
    <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>備　考</div>
    {children}
  </div>
);

/** "SAMPLE" diagonal watermark */
export const DocWatermark: React.FC = () => (
  <div aria-hidden style={{
    position: 'absolute',
    top: '38%', left: '50%',
    transform: 'translate(-50%, -50%) rotate(-35deg)',
    fontSize: 96,
    fontWeight: 'bold',
    color: T.watermark,
    letterSpacing: 12,
    userSelect: 'none',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    fontFamily: '"Arial Black",sans-serif',
    zIndex: 0,
  }}>SAMPLE</div>
);

/** Faded circular stamp impression */
export const DocStamp: React.FC<{ top?: string; left?: string }> = ({
  top = '135mm',
  left = '48mm',
}) => (
  <div aria-hidden style={{
    position: 'absolute',
    top, left,
    width: 52, height: 52,
    borderRadius: '50%',
    border: `2.5px solid ${T.stamp}`,
    zIndex: 0,
    pointerEvents: 'none',
  }} />
);

/** Fixed footer bar — cannot be hidden in free edition */
export const DocFooter: React.FC<{ appName?: string }> = ({
  appName = 'MQDriven ERP Lite',
}) => (
  <div style={{
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    background: T.footerBg,
    color: T.footerFg,
    fontSize: '7.5pt',
    padding: '2.5mm 5mm',
    textAlign: 'center',
    fontFamily: '"Arial","Helvetica",sans-serif',
    zIndex: 10,
  }}>
    Generated with {appName} (Free Edition)
    　―　このフッター・レイアウトは変更できません / Upgrade to remove watermark &amp; footer
  </div>
);

/** Toolbar shown on screen (hidden at print) */
interface PrintToolbarProps {
  onBack: () => void;
  onPrint?: () => void;
  note?: string;
}
export const PrintToolbar: React.FC<PrintToolbarProps> = ({
  onBack,
  onPrint = () => window.print(),
  note,
}) => (
  <div className="no-print" style={{
    padding: '8px 16px',
    background: '#f0f0f0',
    borderBottom: '1px solid #bbb',
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    fontFamily: T.fontUI,
  }}>
    <button onClick={onBack}  style={toolbarBtn}>← 一覧に戻る</button>
    <button onClick={onPrint} style={{ ...toolbarBtn, background: '#0f766e', color: '#fff', border: '1px solid #0b5e57' }}>
      🖨　印刷 / PDF保存
    </button>
    {note && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{note}</span>}
  </div>
);

const toolbarBtn: React.CSSProperties = {
  border: '1px solid #888',
  background: '#e0e0e0',
  cursor: 'pointer',
  padding: '4px 14px',
  fontFamily: 'inherit',
  fontSize: 13,
  borderRadius: 3,
};
