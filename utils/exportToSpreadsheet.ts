/**
 * TSV / スプレッドシート出力ユーティリティ
 * テーブルデータをTSV形式に変換し、クリップボードへコピーする。
 * Google スプレッドシートや Excel にそのまま貼り付けられる。
 */

/** 行データは string | number の配列 */
export type SpreadsheetRow = (string | number | null | undefined)[];

/**
 * 2D 配列を TSV 文字列に変換する
 */
export const rowsToTsv = (headers: string[], rows: SpreadsheetRow[]): string => {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // タブや改行を含む場合はダブルクォートで囲む
    if (s.includes('\t') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.map(escape).join('\t');
  const bodyLines = rows.map(row => row.map(escape).join('\t'));
  return [headerLine, ...bodyLines].join('\n');
};

/**
 * TSV 文字列をクリップボードにコピーし、結果を返す
 */
export const copyTsvToClipboard = async (
  headers: string[],
  rows: SpreadsheetRow[],
): Promise<boolean> => {
  try {
    const tsv = rowsToTsv(headers, rows);
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('クリップボードへのコピーに失敗しました', err);
    return false;
  }
};

/**
 * TSV 文字列をファイルとしてダウンロードする
 */
export const downloadTsvFile = (
  headers: string[],
  rows: SpreadsheetRow[],
  filename: string,
): void => {
  const tsv = rowsToTsv(headers, rows);
  const bom = '\uFEFF'; // Excel UTF-8 BOM
  const blob = new Blob([bom + tsv], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.tsv') ? filename : `${filename}.tsv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
