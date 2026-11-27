import React from 'react';
import { repairLineIsChecked, type RepairChecklistItem } from '../helpers/repairOrders';
import styles from './RepairOrderTiles.module.css';

export function RepairOrderChecklist({ items }: { items: RepairChecklistItem[] }) {
  if (!items.length) return <p className={styles.emptyChecklist}>No jobs on this order.</p>;
  return <ul className={styles.checklist} aria-label="Repair order job checklist">
    {items.map(item => <li key={item.id}>
      <label title={item.status}>
        <input type="checkbox" disabled checked={repairLineIsChecked(item.status)} />
        <span>{item.title}</span>
      </label>
    </li>)}
  </ul>;
}
