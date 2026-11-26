import type { jobStatuses } from './workflowModel';

export const repairOrdersPath = '/service/repair-orders';
export const repairOrderPageSize = 25;
export const repairLineStatuses = ['Pending', 'In progress', 'Done', 'Cancelled'] as const;
export const repairOrderSorts = ['newest', 'oldest', 'updated', 'customer'] as const;

export type RepairLine = {
  id: string;
  title: string;
  notes: string;
  status: typeof repairLineStatuses[number];
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
  line_count: number;
};

export type RepairOrder = RepairOrderRow & {
  customer_id: string | null;
  unit_id: string | null;
  notes: string;
  locked: boolean;
  lines: RepairLine[];
};
