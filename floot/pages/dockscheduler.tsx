import React from 'react';
import { useLocation } from 'react-router-dom';
import { GatewayToolWorkspace } from '../components/GatewayToolWorkspace';
import { NativeGatewayGuard } from '../components/NativeGatewayGuard';

export default function DockScheduler() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (location.pathname.endsWith('/add-job')) params.set('view', 'form');
  return <NativeGatewayGuard>
    <GatewayToolWorkspace>
      <main aria-label="Dock Crew Scheduler">
        <iframe className="gateway-scheduler-frame" title="Dock Crew Scheduler" src={'/scheduler.html?' + params}
          allow="geolocation 'self'" />
      </main>
    </GatewayToolWorkspace>
  </NativeGatewayGuard>;
}
