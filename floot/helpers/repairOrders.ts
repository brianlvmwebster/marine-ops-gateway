import type { jobStatuses } from './workflowModel';

export const repairOrdersPath = '/service/repair-orders';
export const repairOrderPageSize = 25;
export const repairLineStatuses = ['Pending', 'In progress', 'Done', 'Ready to Cashier', 'Cashiered', 'Cancelled'] as const;
export const repairLineIsChecked = (status: string) => status === 'Ready to Cashier' || status === 'Cashiered';
export const defaultRepairOrderSort = 'promisedLatest';
export const repairOrderSorts = [defaultRepairOrderSort, 'promisedSoonest', 'newest', 'oldest', 'updated', 'customer'] as const;
export const repairOrderSortLabels = {
  promisedLatest: 'Latest promised first', promisedSoonest: 'Earliest promised first',
  newest: 'Newest created first', oldest: 'Oldest created first', updated: 'Recently updated', customer: 'Customer name',
} satisfies Record<typeof repairOrderSorts[number], string>;
const promisedFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York',
});
export const promisedDateLabel = (value: string | null | undefined) =>
  value ? promisedFormat.format(new Date(value)) : 'No promised date';

export type RepairLine = {
  id: string;
  title: string;
  notes: string;
  status: typeof repairLineStatuses[number];
};

export type RepairChecklistItem = Pick<RepairLine, 'id' | 'title' | 'status'>;

export type RepairOrderTile = RepairOrderRow & {
  checklist: RepairChecklistItem[];
  pickup: string;
  trailer: string;
  technician: string;
};

export type RepairOrderRow = {
  id: string;
  version: number;
  number: string;
  customer_name: string;
  unit_description: string;
  unit_serial: string;
  status: typeof jobStatuses[number];
  created_at: string;
  updated_at: string;
  promised_at: string | null;
  line_count: number;
};

export type RepairOrder = RepairOrderRow & {
  customer_id: string | null;
  unit_id: string | null;
  notes: string;
  locked: boolean;
  lines: RepairLine[];
};
