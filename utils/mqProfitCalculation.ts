import { ApplicationWithDetails } from '../types';

export interface MQProfitResult {
  salesAmount: number;
  variableCost: number;
  marginalProfit: number;
  profitRate: number;
  isAutoApprovable: boolean;
  source: 'formData' | 'estimated';
}

export const PROFIT_THRESHOLD = 0.3;

export const calculateMQProfit = (app: ApplicationWithDetails): MQProfitResult | null => {
  const fd = app.formData;
  if (!fd) return null;

  // パターン1: formData に直接 MQ 情報がある
  if (fd.salesAmount && fd.variableCost) {
    const sales = Number(fd.salesAmount);
    const variable = Number(fd.variableCost);
    const mq = sales - variable;
    const rate = sales > 0 ? mq / sales : 0;
    return {
      salesAmount: sales,
      variableCost: variable,
      marginalProfit: mq,
      profitRate: rate,
      isAutoApprovable: rate >= PROFIT_THRESHOLD,
      source: 'formData',
    };
  }

  // パターン2: invoice.lines から集計
  if (fd.invoice?.lines && Array.isArray(fd.invoice.lines)) {
    let totalSales = 0;
    let totalVariable = 0;
    for (const line of fd.invoice.lines) {
      if (line.mqType === 'P' || line.lineType === 'revenue') {
        totalSales += Number(line.amount || line.lineTotal || 0);
      }
      if (line.mqType === 'V' || line.lineType === 'variable_cost') {
        totalVariable += Number(line.amount || line.lineTotal || 0);
      }
    }
    if (totalSales > 0) {
      const mq = totalSales - totalVariable;
      const rate = mq / totalSales;
      return {
        salesAmount: totalSales,
        variableCost: totalVariable,
        marginalProfit: mq,
        profitRate: rate,
        isAutoApprovable: rate >= PROFIT_THRESHOLD,
        source: 'formData',
      };
    }
  }

  // パターン3: planItems から推定
  if (Array.isArray(fd.planItems)) {
    let totalSales = 0;
    let totalVariable = 0;
    for (const item of fd.planItems) {
      if (item.price && item.quantity) {
        totalSales += Number(item.price) * Number(item.quantity);
      }
      if (item.variableCost) {
        totalVariable += Number(item.variableCost) * (Number(item.quantity) || 1);
      }
    }
    if (totalSales > 0) {
      const mq = totalSales - totalVariable;
      const rate = mq / totalSales;
      return {
        salesAmount: totalSales,
        variableCost: totalVariable,
        marginalProfit: mq,
        profitRate: rate,
        isAutoApprovable: rate >= PROFIT_THRESHOLD,
        source: 'formData',
      };
    }
  }

  // パターン4: expectedRevenue がある場合（稟議申請など）
  if (fd.expectedRevenue) {
    const sales = Number(fd.expectedRevenue);
    const cost = Number(fd.totalAmount || fd.amount || 0);
    if (sales > 0) {
      const mq = sales - cost;
      const rate = mq / sales;
      return {
        salesAmount: sales,
        variableCost: cost,
        marginalProfit: mq,
        profitRate: rate,
        isAutoApprovable: rate >= PROFIT_THRESHOLD,
        source: 'estimated',
      };
    }
  }

  return null;
};
