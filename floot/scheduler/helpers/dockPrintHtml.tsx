// Shared print document for the scheduler's popup and history modal.
export type DockPrintJob = {
  fullName?: string; lastName?: string; phone?: string; email?: string; address?: string; rawAddress?: string;
  bodyOfWater?: string; roNumber?: string; completed?: boolean; submissionId?: string;
  hasCoordinates?: boolean; latitude?: number; longitude?: number; appointment?: string;
  workDescription?: string; notes?: string; completionSignature?: string; completionDate?: string;
  photos?: { dataUrl: string; name?: string }[];
};
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function safePhotoSource(value: string) {
  return /^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/|\/(?!\/))/.test(value || '') ? value : '';
}
function signatureStamp(name: string) {
  const text = String(name || '');
  return '<svg class="signature-stamp" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 60" role="img" aria-label="Typed signature: ' + escapeHtml(text) + '">' +
    '<text x="8" y="43" fill="#111" font-family="Segoe Script, Brush Script MT, cursive" font-size="34"' +
    (text.length > 32 ? ' textLength="570" lengthAdjust="spacingAndGlyphs"' : '') + '>' + escapeHtml(text) + '</text></svg>';
}
function completionDateLabel(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return parts ? parts[2] + '/' + parts[3] + '/' + parts[1] : String(value || '');
}

export function dockPrintHtml(location: DockPrintJob, {scheduleName = '', editUrl = '', showToolbar = true, logoDataUri = '/scheduler-assets/lakeview-logo.png'} = {}) {
  const displayName =
    location.fullName || 'Customer';
  const safeFilename =
    (
      (location.lastName || displayName) +
      '_Dock_Removal'
    ).replace(
      /[^a-z0-9_-]+/gi,
      '_'
    );
  const row =
    function(label: string, value: unknown) {
      if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
      ) {
        return '';
      }
      return (
        '<tr><th>' +
          escapeHtml(label) +
        '</th><td>' +
          escapeHtml(value)
            .replace(/\n/g, '<br>') +
        '</td></tr>'
      );
    };
  const section =
    function(title: string, content: string) {
      return (
        '<section><h2>' +
          escapeHtml(title) +
        '</h2>' +
          content +
        '</section>'
      );
    };
  const coordinates =
    location.hasCoordinates
      ? (
          Number(location.latitude).toFixed(6) +
          ', ' +
          Number(location.longitude).toFixed(6)
        )
      : 'Not geocoded';
  const textSection = function(title: string, value: unknown) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return '';
    }
    return section(title, '<div class="text">' + escapeHtml(value) + '</div>');
  };
  const details =
    row('Customer', displayName) +
    row('Phone', location.phone) +
    row('Email', location.email) +
    row(
      'Address',
      location.address || location.rawAddress
    ) +
    row('Body of Water', location.bodyOfWater) +
    row('RO#', location.roNumber) +
    row('Schedule', scheduleName) +
    row(
      'Status',
      location.completed
        ? 'Completed'
        : 'Not Completed'
    );
  const reference =
    row('Submission ID', location.submissionId) +
    row('Coordinates', coordinates);
  const logo =
    logoDataUri
      ? (
          '<img src="' +
            escapeHtml(logoDataUri) +
          '" alt="Lakeview Marine">'
        )
      : '<div class="brand-text">Lakeview Marine</div>';
  const editButton =
    editUrl
      ? (
          '<a class="edit" href="' +
            escapeHtml(editUrl) +
          '" target="_blank" rel="noopener noreferrer">' +
            'Edit job' +
          '</a>'
        )
      : '';
  const html =
    '<!doctype html><html><head>' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + escapeHtml(safeFilename) + '</title>' +
      '<style>' +
        '*{box-sizing:border-box}' +
        'body{margin:0;background:#eef1f4;color:#111;font-family:Arial,sans-serif}' +
        '.toolbar{position:sticky;top:0;z-index:2;display:flex;gap:8px;padding:10px 16px;background:#fff;border-bottom:1px solid #c9ced6}' +
        '.toolbar button,.toolbar a{border:0;border-radius:5px;padding:9px 14px;background:#111827;color:#fff;font-size:13px;font-weight:700;text-decoration:none;cursor:pointer}' +
        '.toolbar .edit{background:#2f6fed}' +
        '.sheet{width:8.5in;min-height:11in;margin:18px auto;padding:.45in;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.16)}' +
        '.mast{display:grid;grid-template-columns:1.25in 1fr 1.25in;align-items:center;padding-bottom:12px;border-bottom:4px solid #111}' +
        '.brand img{display:block;max-width:1.1in;max-height:.8in;object-fit:contain}' +
        '.brand-text{font-size:15px;font-weight:800;color:#183d63}' +
        '.heading{text-align:center}' +
        'h1{margin:0;font-size:21px;line-height:1.2;text-transform:uppercase;letter-spacing:.3px}' +
        '.subtitle{margin-top:4px;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#555}' +
        '.status{text-align:right;font-size:12px;font-weight:800}' +
        'section{margin-top:14px;border:1px solid #111;border-radius:4px;overflow:hidden;break-inside:auto}' +
        'h2{margin:0;padding:6px 8px;background:#000;color:#fff;font-size:11px;letter-spacing:.9px;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
        'table{width:100%;border-collapse:collapse;font-size:12px}' +
        'th,td{padding:7px 9px;border-bottom:1px solid #bbb;text-align:left;vertical-align:top}' +
        'tr:last-child th,tr:last-child td{border-bottom:0}' +
        'th{width:1.45in;background:#f2f3f5;font-size:10px;text-transform:uppercase;letter-spacing:.4px}' +
        '.text{padding:8px;font-size:12px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}' +
        '.appointment{margin-top:14px;padding:10px 12px;border:2px solid #111;border-radius:4px;font-size:14px;break-inside:avoid}' +
        '.completion th{vertical-align:middle}.completion td{height:42px;padding:8px 12px}.write-line{display:block;height:24px;border-bottom:1px solid #111}.date-line{max-width:2.5in}' +
        '.signature-stamp{display:block;width:100%;max-width:480px;height:48px}.completion .signed-line{height:auto;min-height:24px}.completion .signed-date{padding-top:4px}' +
        '.job-photos{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}.job-photos figure{margin:0;min-width:0;break-inside:avoid}.job-photos img{display:block;width:100%;height:2.5in;object-fit:contain}.job-photos figcaption{font-size:10px;overflow-wrap:anywhere;margin-top:6px}' +
        '.footer{margin-top:12px;text-align:right;color:#666;font-size:9px}' +
        '@page{size:letter;margin:.35in}' +
        '@media print{body{background:#fff}.toolbar{display:none!important}.sheet{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}section{margin-top:8px}h2{padding:4px 8px}th,td{padding:4px 9px}.completion td{height:36px;padding:6px 12px}.signature-stamp{height:40px}}' +
        '@media screen and (max-width:850px){.sheet{width:calc(100% - 20px);min-height:0;margin:10px;padding:22px}.mast{grid-template-columns:90px 1fr}.status{grid-column:1 / -1;margin-top:8px;text-align:left}}' +
      '</style>' +
    '</head><body>' +
      (showToolbar ? '<div class="toolbar">' +
        '<button type="button" onclick="window.print()">Print</button>' +
        editButton +
      '</div>' : '') +
      '<main class="sheet">' +
        '<header class="mast">' +
          '<div class="brand">' + logo + '</div>' +
          '<div class="heading">' +
            '<h1>Lakeview Marine</h1>' + '<div>' + escapeHtml(scheduleName || 'Dock Crew Scheduler') + '</div>' +
            '<div class="subtitle">QUICK JOB SUMMARY</div>' +
          '</div>' +
          '<div class="status">' +
            (
              location.completed
                ? '✓ COMPLETED'
                : 'NOT COMPLETED'
            ) +
          '</div>' +
        '</header>' +
        '<div class="appointment"><strong>Appointment Date:</strong> ' +
          escapeHtml(location.appointment || 'Not scheduled') +
        '</div>' +
        section(
          'Job Information',
          '<table>' + details + '</table>'
        ) +
        textSection('Description of Work', location.workDescription) +
        textSection('Notes', location.notes) +
        section(
          'Record Information',
          '<table>' + reference + '</table>'
        ) +
        section(
          'Job Completion',
          '<table class="completion">' +
            '<tr><th>Signature</th><td><div class="write-line signed-line">' +
              (location.completionSignature ? signatureStamp(location.completionSignature) : '') +
            '</div></td></tr>' +
            '<tr><th>Date</th><td><div class="write-line date-line signed-date">' +
              (location.completionDate ? escapeHtml(completionDateLabel(location.completionDate)) : '') +
            '</div></td></tr>' +
          '</table>'
        ) +
        ((location.photos || []).length ? section('Job Photos',
          '<div class="job-photos">' + (location.photos || []).map(function(photo, index) {
            return '<figure><img src="' + escapeHtml(safePhotoSource(photo.dataUrl)) + '" alt="Job photo ' + (index + 1) + '">' +
              '<figcaption>' + escapeHtml(photo.name) + '</figcaption></figure>';
          }).join('') + '</div>') : '') +
        '<div class="footer">Generated ' +
          escapeHtml(new Date().toLocaleString()) +
        '</div>' +
      '</main>' +
    '</body></html>';

  return html;
}
