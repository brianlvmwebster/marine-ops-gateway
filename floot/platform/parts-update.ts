import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { expandPartExportRow, maxPartsExportRows, partSourceColumns, type PartExportRow } from '../helpers/partsExport';
import { partData } from './parts';
import { PlatformError } from './policy';

type Part = z.infer<typeof partData>;
type Field = keyof Part;
type Difference = { field: string; before: string; after: string; held?: boolean };
type SavedPart = { id: string; version: number; data: Part; baseline: Part; managedStock: boolean };
type PreviewRow = { number: string; name: string; outcome: 'add' | 'update' | 'conflict' | 'missing'; differences?: Difference[] };
type Update = { id: string; version: number; data: Part; baseline: Part; refreshQuantity: boolean };
type NewPart = { data: Part; row: number; source: string[] };

const textFields = {
  supplier_code: 116, part_number: 82, description: 24, supplier_name: 118, category: 20,
  manufacturer: 46, manufacturer_part_number: 50, upc: 120, comments: 22,
} as const;
const numericFields = {
  on_hand: 72, available: 11, active_price: 1, retail_price: 96, sale_price: 98,
  replacement_cost: 94, inventory_value: 32, reorder_point: 88, minimum: 60, maximum: 58,
} as const;
const labels: Record<Field, string> = {
  supplier_code: 'Supplier code', part_number: 'Part number', description: 'Description', supplier_name: 'Supplier name',
  category: 'Category', manufacturer: 'Manufacturer', manufacturer_part_number: 'Manufacturer part number', upc: 'UPC',
  comments: 'Comments', on_hand: 'On hand', available: 'Available', active_price: 'Active price', retail_price: 'Retail price',
  sale_price: 'Sale price', replacement_cost: 'Replacement cost', inventory_value: 'Inventory value',
  reorder_point: 'Reorder point', minimum: 'Minimum stock', maximum: 'Maximum stock', active: 'Active', bins: 'Bins',
};
const quantities = ['on_hand', 'available'] as const;
const catalog = Object.keys(labels).filter(key => !['supplier_code', 'part_number', ...quantities].includes(key)) as Field[];
const maxPreviewBytes = 8 * 1024 * 1024;

export const partsInputRows = z.array(z.tuple([
  z.number().int().min(2).max(maxPartsExportRows + 2_000),
  z.array(z.string().max(5000)).length(partSourceColumns.length),
])).min(1).max(maxPartsExportRows);

const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const partKey = (part: Part) => JSON.stringify([part.supplier_code, part.part_number]);
const numberLabel = (part: Part) => part.supplier_code + ' / ' + part.part_number;

function decimal(value: string) {
  const text = value.trim().replaceAll(',', '');
  const [whole, fraction] = text.split('.');
  const digits = fraction?.replace(/0+$/, '');
  const canonical = whole?.replace(/^(-?)0+(?=\d)/, '$1');
  return text.match(/^-?\d+(\.\d+)?$/) ? digits ? canonical + '.' + digits : canonical === '-0' ? '0' : canonical : text;
}

function equal(field: Field, first: Part, second: Part) {
  return field in numericFields
    ? decimal(first[field] as string) === decimal(second[field] as string)
    : JSON.stringify(first[field]) === JSON.stringify(second[field]);
}

function display(value: Part[Field]): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(' · ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value;
}

function explain(field: Field, current: Part, incoming: Part, held = false): Difference {
  return { field: labels[field], before: display(current[field]), after: display(incoming[field]), ...(held ? { held } : {}) };
}

function readParts(rows: PartExportRow[]) {
  const parsed = new Map<string, NewPart>();
  for (const [row, cells] of rows) {
    const source = expandPartExportRow(cells);
    if (!/^(true|false)$/i.test(source[7].trim()))
      throw new PlatformError(400, 'Invalid Active value on spreadsheet row ' + row + '.');
    const candidate = partData.safeParse({
      ...Object.fromEntries(Object.entries(textFields).map(([key, index]) => [key, source[index].trim()])),
      ...Object.fromEntries(Object.entries(numericFields).map(([key, index]) => [key, decimal(source[index])])),
      active: source[7].trim().toLowerCase() === 'true',
      bins: [13, 16, 18].map(index => source[index].trim()),
    });
    if (!candidate.success) throw new PlatformError(400, 'Invalid part or quantity on spreadsheet row ' + row + '.');
    const key = partKey(candidate.data);
    if (parsed.has(key)) throw new PlatformError(400, 'Duplicate supplier and part number on spreadsheet row ' + row + '.');
    parsed.set(key, { data: candidate.data, row, source });
  }
  return parsed;
}

export async function partsUpdatePlan(sql: any, company: string, rows: PartExportRow[]) {
  const source = readParts(rows);
  const saved: SavedPart[] = await sql`SELECT p.id,p.version,p.data,coalesce(p.lightspeed_data,p.opening_data) AS baseline,
    EXISTS (SELECT FROM part_stock_movements m WHERE m.company_id=p.company_id AND m.part_id=p.id) AS "managedStock"
    FROM inventory_parts p WHERE p.company_id=${company}`;
  const existing = new Map(saved.map(part => [partKey(part.data), part]));
  const summary = { compared: source.size, added: 0, updated: 0, missing: 0, conflicts: 0, alreadyCurrent: 0,
    stockReview: 0, applied: 0, omitted: 0 };
  const preview: PreviewRow[] = [], additions: NewPart[] = [], updates: Update[] = [];
  let previewBytes = 0;
  function record(row: PreviewRow) {
    const bytes = Buffer.byteLength(JSON.stringify(row)) + 1;
    if (previewBytes + bytes > maxPreviewBytes) summary.omitted++;
    else { previewBytes += bytes; preview.push(row); }
  }

  for (const [key, item] of source) {
    const incoming = item.data;
    const saved = existing.get(key);
    const descriptor = { number: numberLabel(incoming), name: incoming.description };
    if (!saved) {
      summary.added++;
      additions.push(item);
      record({ ...descriptor, outcome: 'add', differences: quantities.map(field => ({ field: labels[field], before: '', after: incoming[field] })) });
      continue;
    }
    const data = { ...saved.data }, baseline = { ...saved.baseline };
    const target: Partial<Part> = {}, nextBaseline: Partial<Part> = {};
    const differences: Difference[] = [];
    for (const field of catalog) {
      if (equal(field, saved.baseline, incoming)) continue;
      const agreed = equal(field, saved.data, incoming);
      const held = !agreed && !equal(field, saved.data, saved.baseline);
      if (!agreed) differences.push(explain(field, saved.data, incoming, held));
      if (!held) Object.assign(nextBaseline, { [field]: incoming[field] });
      if (!agreed && !held) Object.assign(target, { [field]: incoming[field] });
    }
    const sourceStockChanged = quantities.some(field => !equal(field, saved.baseline, incoming));
    const stockDiffers = quantities.some(field => !equal(field, saved.data, incoming));
    const holdStock = sourceStockChanged && stockDiffers
      && (saved.managedStock || quantities.some(field => !equal(field, saved.baseline, saved.data)));
    if (sourceStockChanged) {
      if (holdStock) summary.stockReview++;
      for (const field of quantities) {
        if (!equal(field, saved.data, incoming)) differences.push(explain(field, saved.data, incoming, holdStock));
        if (!holdStock) {
          nextBaseline[field] = incoming[field];
          if (!equal(field, saved.data, incoming)) target[field] = incoming[field];
        }
      }
    }
    const held = differences.some(change => change.held);
    if (held) summary.conflicts++;
    if (Object.keys(target).length) {
      summary.updated++;
      updates.push({ id: saved.id, version: saved.version, data: { ...data, ...target },
        baseline: { ...baseline, ...nextBaseline }, refreshQuantity: !holdStock && sourceStockChanged && stockDiffers });
      record({ ...descriptor, outcome: 'update', differences });
    } else if (held) {
      record({ ...descriptor, outcome: 'conflict', differences });
    } else if (Object.keys(nextBaseline).length) {
      summary.alreadyCurrent++;
    }
  }
  for (const [key, part] of existing) {
    if (source.has(key)) continue;
    summary.missing++;
    record({ number: numberLabel(part.data), name: part.data.description, outcome: 'missing' });
  }
  const batch = sha(rows);
  const hash = sha({ batch, summary, updates });
  return { summary, preview, hash, batch, additions, updates, hasChanges: !!(additions.length || updates.length) && !summary.omitted };
}

export async function writePartsUpdate(tx: any, company: string, result: Awaited<ReturnType<typeof partsUpdatePlan>>) {
  for (let index = 0; index < result.updates.length; index += 250) {
    const batch = result.updates.slice(index, index + 250);
    const updated = await tx`UPDATE inventory_parts p SET data=b.data,description=b.data->>'description',
      active=(b.data->>'active')::boolean,lightspeed_data=b.baseline,version=p.version+1,
      lightspeed_quantity_updated_at=CASE WHEN b."refreshQuantity" THEN now() ELSE p.lightspeed_quantity_updated_at END
      FROM jsonb_to_recordset(${tx.json(batch)}::jsonb) AS b(id uuid, version int, data jsonb, baseline jsonb, "refreshQuantity" boolean)
      WHERE p.company_id=${company} AND p.id=b.id AND p.version=b.version RETURNING p.id`;
    if (updated.length !== batch.length) throw new PlatformError(409, 'Inventory changed. Check the file again before applying.');
  }
  for (let index = 0; index < result.additions.length; index += 250) {
    const batch = result.additions.slice(index, index + 250)
      .map(part => ({ ...part, id: randomUUID(), sha: sha(part.source) }));
    const inserted = await tx`INSERT INTO inventory_parts(id,company_id,supplier_code,part_number,description,active,data,
      opening_data,source_record,source_sha,source_batch,source_row)
      SELECT b.id,${company},b.data->>'supplier_code',b.data->>'part_number',b.data->>'description',(b.data->>'active')::boolean,
        b.data,b.data,b.source,b.sha,${result.batch},b.row
      FROM jsonb_to_recordset(${tx.json(batch)}::jsonb) AS b(id uuid,data jsonb,source jsonb,sha text,row int)
      ON CONFLICT(company_id,supplier_code,part_number) DO NOTHING RETURNING id`;
    if (inserted.length !== batch.length) throw new PlatformError(409, 'Inventory changed. Check the file again before applying.');
  }
  return result.additions.length + result.updates.length;
}
