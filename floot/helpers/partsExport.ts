import headers from '../pages/parts-source-columns.json';

export const maxPartsExportBytes = 64 * 1024 * 1024;
export const maxPartsUploadBytes = 24 * 1024 * 1024;
export const maxPartsExportRows = 40_000;
export const partSourceColumns = headers.flatMap((heading, index) => heading ? [index] : []);
export type PartExportRow = [rowNumber: number, cells: string[]];

export function expandPartExportRow(cells: string[]) {
  const row = headers.map(() => '');
  partSourceColumns.forEach((column, index) => { row[column] = cells[index]; });
  return row;
}

export function partsExportRows(rows: unknown[][]): PartExportRow[] {
  const headerIndex = rows.slice(0, 10).findIndex(row => row.includes('Part Number') && row.includes('Supplier Code'));
  if (headerIndex < 0) throw new Error('The Lightspeed Parts Inventory headings were not found.');
  const headings = rows[headerIndex];
  const columns = headings.flatMap((value, index) => value ? [index] : []);
  // Lightspeed reports use spacer columns that different Excel readers may collapse.
  // Ordered headings preserve the position of repeated labels.
  if (columns.length !== partSourceColumns.length
      || columns.some((column, index) => headings[column] !== headers[partSourceColumns[index]]))
    throw new Error('The file columns do not match the Lightspeed Parts Inventory bulk export.');
  const result: PartExportRow[] = [];
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const cells = columns.map(column => String(rows[index][column] ?? ''));
    if (!cells.some(value => value.trim()) || /^Parts Inventory:/i.test(cells[0].trim())) continue;
    result.push([index + 1, cells]);
    if (result.length > maxPartsExportRows) throw new Error('The export exceeds 40,000 parts.');
  }
  if (!result.length) throw new Error('The export contains no parts.');
  return result;
}
