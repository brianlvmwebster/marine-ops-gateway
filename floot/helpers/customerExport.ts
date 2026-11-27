export const customerExportColumns = [
  'Customer Number', 'Active', 'First Name', 'Last Name', 'Home Phone', 'Work Phone', 'Mobile Phone',
  'E-Mail', 'Address 1', 'Address 2', 'City', 'State', 'Zip Code', 'County', 'Country',
  'Alternate Address 1', 'Alternate Address 2', 'Alternate City', 'Alternate State',
  'Alternate Zip Code', 'Alternate County', 'Alternate Country', 'Company Name',
] as const;

export const maxCustomerExportRows = 20_000;
export const maxCustomerExportBytes = 12 * 1024 * 1024;

export const customerContacts = {
  first_name: 'First Name', last_name: 'Last Name', company_name: 'Company Name', email: 'E-Mail',
  home_phone: 'Home Phone', work_phone: 'Work Phone', mobile_phone: 'Mobile Phone',
} as const;

export const customerAddressFields = {
  line1: 'Address 1', line2: 'Address 2', city: 'City', state: 'State',
  postal_code: 'Zip Code', county: 'County', country: 'Country',
} as const;

export function customerExportRows(rows: string[][]) {
  const headerIndex = rows.slice(0, 10).findIndex(row => row.includes('Customer Number'));
  if (headerIndex < 0) throw new Error('The Lightspeed Customer Bulk headings were not found.');
  const headings = rows[headerIndex];
  const columns = customerExportColumns.map(name => headings.indexOf(name));
  // An older export doesn't say whether a business name should change.
  if (columns.at(-1) === -1) columns.pop();
  if (columns.includes(-1) || new Set(headings.filter(Boolean)).size !== headings.filter(Boolean).length)
    throw new Error('The file is missing required Lightspeed Customer Bulk columns or has duplicate headings.');
  const result = [];
  const seen = new Set<string>();
  for (const row of rows.slice(headerIndex + 1)) {
    const cells = columns.map(col => row[col]?.trim() ?? '');
    const number = cells[0];
    if (!number || /^Customer:/i.test(number)) continue;
    if (!/^\d{1,100}$/.test(number) || seen.has(number))
      throw new Error('The export contains an invalid or duplicate customer number.');
    if (cells.some(value => value.length > 500)) throw new Error('A customer field exceeds 500 characters.');
    seen.add(number);
    result.push(cells);
    if (result.length > maxCustomerExportRows) throw new Error('The export exceeds 20,000 customer rows.');
  }
  if (!result.length) throw new Error('The export contains no customer rows.');
  return result;
}
