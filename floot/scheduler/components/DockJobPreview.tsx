import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Group, Modal, Stack } from '@mantine/core';
import { dockPrintHtml, type DockPrintJob } from '../helpers/dockPrintHtml';

export function DockJobPreview({ job, scheduleName, onClose }: {
  job: DockPrintJob; scheduleName: string; onClose: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loadedHtml, setLoadedHtml] = useState('');
  const [error, setError] = useState('');
  const html = useMemo(() => dockPrintHtml(job, { scheduleName, showToolbar: false }), [job, scheduleName]);
  function print() {
    try {
      const target = frame.current?.contentWindow;
      if (!target || loadedHtml !== html) return;
      target.focus();
      target.print();
    } catch {
      setError('Printing could not open. Please retry in your browser.');
    }
  }
  return <Modal zIndex={1300} opened onClose={onClose} title="Job Print Preview"
    size="min(1000px, 96vw)" closeButtonProps={{ 'aria-label': 'Close Job Print Preview' }}>
    <Stack gap="sm">
      <Group justify="space-between">
        <Button onClick={print} disabled={loadedHtml !== html}>Print</Button>
        <Button variant="default" onClick={onClose}>Close Preview</Button>
      </Group>
      {error && <Alert color="orange" role="alert">{error}</Alert>}
      <iframe ref={frame} title="Printer-friendly job summary" srcDoc={html}
        sandbox="allow-same-origin allow-modals"
        style={{ width: '100%', height: '70dvh', minHeight: 300, border: '1px solid #c9ced6', background: '#eef1f4' }}
        onLoad={() => {
          const images = Array.from(frame.current?.contentDocument?.images || []);
          setError(images.some(image => !image.naturalWidth) ? 'An image could not load. Close and reopen the preview to retry before printing.' : '');
          setLoadedHtml(html);
        }} />
    </Stack>
  </Modal>;
}
