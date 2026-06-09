import React, { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase';
import {
  T,
  fmtDate, fmtMoney, fmtMoneyNum, fmtClaimMonth,
  docTh, docTd, docTdTotal,
  PRINT_CSS,
  DocPage, DocBody, DocTitle, DocInfoHeader, DocLeadText,
  DocSpacer, DocEnd, DocRemarks,
  DocWatermark, DocStamp, DocFooter,
  PrintToolbar,
} from './printTemplate';

// ─────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────

interface OrderRow {
  row_uuid: string;
  project_id: string;
  project_name: string | null;
  customer_code: string | null;
  customer_name: string | null;
  post_no: string | null;
  address_1: string | null;
  order_date: string | null;
  delivery_date: string | null;
  claim_month: string | null;
  copies: string | null;
  quantity: string | null;
  size: string | null;
  total_page: string | null;
  amount: string | null;
  subamount: string | null;
  delivery_form: string | null;
  quality: string | null;
}

interface CompanyInfo {
  name: string;
  hq_address: string;
  hq_tel: string;
  hq_fax: string | null;
}

const supabase = createSupabaseBrowser();
const PAGE_SIZE = 50;
const EMPTY_ROWS = 6;

// ─────────────────────────────────────────────────────────────────
//  LIST PAGE
// ─────────────────────────────────────────────────────────────────

export const LegacyOrderInvoicePage: React.FC = () => {
  const [orders, setOrders]   = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [page, setPage]       = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('company_info')
        .select('name, hq_address, hq_tel, hq_fax')
        .single();
      if (data) setCompany(data as CompanyInfo);
    })();
  }, []);

  useEffect(() => { setPage(0); setSelected(null); }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const from = page * PAGE_SIZE;
      const { data: raw } = await supabase
        .from('orders_legacy')
        .select('row_uuid,project_id,order_date,delivery_date,claim_month,copies,quantity,size,total_page,amount,subamount,delivery_form,quality')
        .not('amount', 'is', null)
        .neq('amount', '')
        .order('order_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (!active || !raw) { setLoading(false); return; }

      const pids = [...new Set(raw.map((o: any) => o.project_id).filter(Boolean))];
      const { data: projects } = await supabase
        .from('projects_legacy')
        .select('project_id,project_name,customer_code')
        .in('project_id', pids);

      const codes = [...new Set((projects || []).map((p: any) => p.customer_code).filter(Boolean))];
      const { data: custs } = codes.length
        ? await supabase.from('customers').select('customer_code,customer_name,post_no,address_1').in('customer_code', codes)
        : { data: [] };

      const pMap = new Map((projects || []).map((p: any) => [p.project_id, p]));
      const cMap = new Map((custs    || []).map((c: any) => [c.customer_code, c]));

      const rows: OrderRow[] = raw.map((o: any) => {
        const proj = pMap.get(o.project_id);
        const cust = proj ? cMap.get(proj.customer_code) : null;
        return { ...o, project_name: proj?.project_name ?? null, customer_code: proj?.customer_code ?? null,
          customer_name: cust?.customer_name ?? null, post_no: cust?.post_no ?? null, address_1: cust?.address_1 ?? null };
      });

      if (active) { setOrders(prev => page === 0 ? rows : [...prev, ...rows]); setLoading(false); }
    })();
    return () => { active = false; };
  }, [page]);

  const filtered = search
    ? orders.filter(o => {
        const s = search.toLowerCase();
        return (o.project_id ?? '').includes(s) || (o.project_name ?? '').toLowerCase().includes(s)
          || (o.customer_name ?? '').toLowerCase().includes(s) || (o.claim_month ?? '').includes(s);
      })
    : orders;

  if (selected) return <InvoicePrint order={selected} company={company} onBack={() => setSelected(null)} />;

  return (
    <div style={{ padding: 20, fontFamily: T.fontUI, fontSize: 13 }}>
      <h2 style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 4, marginBottom: 12 }}>
        受注レガシー 請求書発行
      </h2>

      <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>検索:</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="案件名・取引先・請求月…"
          style={{ border: '1px solid #aaa', padding: '3px 8px', fontFamily: 'inherit', width: 260, borderRadius: 3 }} />
        {loading && <span style={{ color: T.subtle }}>読込中…</span>}
      </div>

      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            {['案件ID','案件名','取引先','受注日','請求月','税込金額'].map(h => (
              <th key={h} style={{ ...docTh(undefined, 'left'), background: T.tableHead, color: T.tableHeadFg }}>
                {h}
              </th>
            ))}
            <th style={{ ...docTh(), background: T.tableHead }} />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && !loading && (
            <tr><td colSpan={7} style={{ padding: 10, color: T.subtle, border: `1px solid ${T.border}` }}>データなし</td></tr>
          )}
          {filtered.map((o, i) => (
            <tr key={o.row_uuid} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              <td style={docTd()}>{o.project_id}</td>
              <td style={docTd()}>{o.project_name ?? '-'}</td>
              <td style={docTd()}>{o.customer_name ?? '-'}</td>
              <td style={docTd()}>{fmtDate(o.order_date)}</td>
              <td style={docTd()}>{fmtClaimMonth(o.claim_month)}</td>
              <td style={docTd('right')}>{fmtMoney(o.amount)}</td>
              <td style={{ ...docTd('center') }}>
                <button onClick={() => setSelected(o)}
                  style={{ border: `1px solid ${T.tableHead}`, background: '#e8f5f3', color: T.tableHead,
                    cursor: 'pointer', padding: '2px 10px', fontFamily: 'inherit', borderRadius: 3 }}>
                  請求書
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && filtered.length >= PAGE_SIZE && (
        <button onClick={() => setPage(p => p + 1)}
          style={{ marginTop: 10, border: `1px solid ${T.borderStrong}`, background: '#ddd',
            padding: '4px 16px', fontFamily: 'inherit', cursor: 'pointer', borderRadius: 3 }}>
          さらに読み込む
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
//  INVOICE PRINT VIEW
// ─────────────────────────────────────────────────────────────────

interface InvoicePrintProps {
  order: OrderRow;
  company: CompanyInfo | null;
  onBack: () => void;
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({ order, company, onBack }) => {
  const sub   = Number(order.subamount ?? 0);
  const total = Number(order.amount    ?? 0);
  const tax   = total - sub;

  const today  = new Date();
  const cm     = order.claim_month ?? today.toISOString().slice(0, 7).replace('-', '');
  const invNo  = `INV-${cm}-${String(order.project_id).padStart(4, '0')}`;
  const issueDate = fmtDate(today.toISOString());

  const itemName = order.project_name ?? '印刷物';
  const specs = [
    order.size      && `サイズ${order.size}`,
    order.total_page && `${order.total_page}P`,
    order.copies    && `${Number(order.copies).toLocaleString()}部`,
    order.delivery_form,
    order.quality,
  ].filter(Boolean).join('・');

  return (
    <>
      <style>{PRINT_CSS}</style>

      <PrintToolbar
        onBack={onBack}
        note="フォント：MS 明朝（固定）/ 透かし・フッターは有料版でのみ除去可"
      />

      <DocPage>
        <DocWatermark />
        <DocStamp top="130mm" left="45mm" />

        <DocBody>
          <DocTitle title="御　請　求　書" />

          <DocInfoHeader
            customerName={order.customer_name}
            customerPostNo={order.post_no}
            customerAddress={order.address_1}
            issuerName={company?.name}
            issuerAddress={company?.hq_address}
            issuerTel={company?.hq_tel}
            issuerFax={company?.hq_fax ?? undefined}
            meta={[
              { label: '請求番号', value: invNo },
              { label: '発行日',   value: issueDate },
              ...(order.claim_month ? [{ label: '請求月', value: fmtClaimMonth(order.claim_month) }] : []),
            ]}
          />

          <DocLeadText>下記の通りご請求申し上げます。</DocLeadText>

          {/* 明細テーブル */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
            <thead>
              <tr>
                <th style={docTh('54%')}>品　名</th>
                <th style={docTh('12%', 'center')}>数　量</th>
                <th style={docTh('17%', 'right')}>単　価</th>
                <th style={docTh('17%', 'right')}>金　額</th>
              </tr>
            </thead>
            <tbody>
              {/* データ行 */}
              <tr>
                <td style={docTd()}>
                  <div style={{ fontWeight: 'bold' }}>{itemName}</div>
                  {specs && <div style={{ fontSize: '8pt', color: T.muted, marginTop: 2 }}>{specs}</div>}
                </td>
                <td style={docTd('center')}>1　式</td>
                <td style={docTd('right')}>{fmtMoneyNum(order.subamount)}</td>
                <td style={docTd('right')}>{fmtMoneyNum(order.subamount)}</td>
              </tr>

              {/* 空行 */}
              {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                <tr key={i}>
                  <td style={docTd()}>&nbsp;</td>
                  <td style={docTd('center')} />
                  <td style={docTd('right')} />
                  <td style={docTd('right')} />
                </tr>
              ))}

              {/* 集計行 */}
              <tr>
                <td colSpan={3} style={docTdTotal('right')}>小　計</td>
                <td style={docTdTotal('right')}>{fmtMoneyNum(order.subamount)}</td>
              </tr>
              <tr>
                <td colSpan={3} style={docTdTotal('right')}>消費税（10%）</td>
                <td style={docTdTotal('right')}>{isNaN(tax) ? '-' : tax.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={3} style={docTdTotal('right', true, true)}>合　計　金　額</td>
                <td style={docTdTotal('right', true, true)}>{fmtMoney(order.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '5mm' }}>
            <DocRemarks>
              <div>・お支払いは請求月末日までにお振り込みください。</div>
              <div>・ご不明な点がございましたら担当者までお問い合わせください。</div>
            </DocRemarks>
          </div>

          <DocSpacer />
          <DocEnd />
        </DocBody>

        <DocFooter />
      </DocPage>
    </>
  );
};

export default LegacyOrderInvoicePage;
