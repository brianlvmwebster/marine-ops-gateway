import { read, utils } from 'xlsx';
import { customerExportRows, maxCustomerExportRows } from './customerExport';
import { maxPartsExportRows, partsExportRows } from './partsExport';

self.onmessage = ({ data }: MessageEvent<{ bytes: ArrayBuffer; area: 'customers' | 'parts' }>) => {
  try {
    const bytes = new Uint8Array(data.bytes);
    const legacy = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    const zipped = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
    if (!legacy && !zipped) throw new Error('Select a Lightspeed Excel export (.xls or .xlsx).');
    const parts = data.area === 'parts';
    const rowLimit = parts ? maxPartsExportRows + 2_000 : maxCustomerExportRows + 100;
    const book = read(bytes, { sheets: 0, dense: true, sheetRows: rowLimit + 1, cellFormula: false, cellHTML: false });
    const sheet = book.Sheets[book.SheetNames[0]];
    const range = utils.decode_range(sheet['!fullref'] ?? sheet['!ref'] ?? 'A1');
    if (range.e.r >= rowLimit || range.e.c >= 128)
      throw new Error('The workbook exceeds the supported sheet dimensions.');
    const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: parts, defval: '' });
    self.postMessage({ rows: parts ? partsExportRows(rows) : customerExportRows(rows.map(row => row.map(cell => String(cell).trim()))) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'The spreadsheet could not be read.' });
  }
};
