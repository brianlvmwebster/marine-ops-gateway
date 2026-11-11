import React from 'react';
import { Link } from 'react-router-dom';
import styles from './GatewayBrand.module.css';
export function GatewayBrand() {
  return <Link className={styles.brand} to="/" aria-label="Marine Ops Technology home">
    <img src="/_cdn/static/ddcbf277-8310-4a20-93a3-175674120c04-marine-ops-light.svg" alt="Marine Ops Technology" width={280} height={41} />
    <span className={styles.subtitle}>Operations Hub</span>
  </Link>;
}
