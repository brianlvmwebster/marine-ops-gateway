// @ts-nocheck
import { dockPrintHtml } from './dockPrintHtml';
// Existing tested map/job engine, scoped to one mounted scheduler page.
export function initializeDockEngine(L) {
 const subscriptions=[]; let mapResizeObserver;
 const listen=(name,fn)=>{window.addEventListener(name,fn);subscriptions.push([name,fn]);};
 // Preserve the original success/failure callback flow using same-origin HTTP.
const crewApi = (() => {
  const records = new Map();
  let signInPromise;
  let geocodingMissing = false;
  let geocodingAll = false;

  async function responseBody(response) {
    try { return await response.json(); }
    catch { throw new Error('The server returned an unexpected response. Please try again.'); }
  }
  async function signIn() {
    if (signInPromise) return signInPromise;
    signInPromise = new Promise(resolve => {
      const dialog = window.schedulerUI.createDialog('signin');
      dialog.setAttribute('aria-labelledby', 'crew-sign-in-title');
      dialog.addEventListener('cancel', event => event.preventDefault());
      document.body.appendChild(dialog);
      dialog.showModal();
      dialog.querySelector('input').focus();
      dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        const button = dialog.querySelector('button[type=submit]');
        const error = dialog.querySelector('.completion-error');
        button.disabled = true;
        error.textContent = '';
        try {
          const response = await window.dockFetch('/api/session', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: dialog.querySelector('input').value }),
          });
          const result = await responseBody(response);
          if (!response.ok) throw new Error(result.error);
          dialog.close(); dialog.remove(); resolve();
        } catch (failure) { error.textContent = failure.message; }
        finally { button.disabled = false; }
      };
    });
    try { await signInPromise; } finally { signInPromise = undefined; }
  }

  async function request(action, args = [], options) {
    const row = Number(args[0]);
    const record = records.get(row);
    const payload = {
      action, args, options,
      identity: record && reference(record),
    };
    const send = () => window.dockFetch('/api/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), cache: 'no-store',
    });
    let response = await send();
    if (response.status === 401) { await signIn(); response = await send(); }
    const result = await responseBody(response);
    if (!response.ok) throw new Error(result.error || 'Unable to complete this request.');
    if (action === 'getLocations') {
      // If a popup opened while this refresh was in flight, the UI will reject
      // the snapshot. Keep its identity/version too, so an unseen refresh cannot
      // silently rebase the crew's unsaved edit onto somebody else's changes.
      if (typeof hasOpenLocationPopup === 'function' && hasOpenLocationPopup()) return result;
      records.clear();
      result.locations.forEach(item => records.set(item.rowNumber, item));
      // Fill one new address per refresh while the app is open. A protected cron
      // endpoint is also available when geocoding must run with the browser closed.
      const missing = result.locations.find(item => isCurrentScheduleJob(item, result) && !item.hasCoordinates && item.address);
      if (result.geocodingEnabled === true && missing && !geocodingMissing && !geocodingAll && options?.autoGeocode !== false) {
        geocodingMissing = true;
        setTimeout(() => request('geocodeBatch', [], { onlyMissing: true, identities: [reference(missing)] })
          .catch(error => console.warn('Automatic geocoding:', error.message))
          .finally(() => { geocodingMissing = false; }), 500);
      }
    } else if (action === 'geocodeBatch' && result.results) {
      for (const changed of result.results) {
        const previous = records.get(changed.rowNumber);
        if (previous) syncRecord(previous, changed);
      }
    } else if (record && result.rowNumber) {
      syncRecord(record, result);
    }
    return result;
  }

  function syncRecord(record, result) {
      window.schedulerUI.jobChanged(result);
      const row = record.rowNumber;
      records.delete(row);
      records.set(result.rowNumber, { ...record, ...result });
      // Keep the visible record aligned if a sheet sort moved it during the request.
      if (typeof locations !== 'undefined') {
        const visible = locations.find(item => record.jobId ? item.jobId === record.jobId : item.recordKey === record.recordKey);
        if (visible) Object.assign(visible, result);
      }
  }

  function reference(item) {
    return { rowNumber: item.rowNumber, submissionId: item.submissionId, recordKey: item.recordKey, jobId: item.jobId, version: item.version };
  }
  function isCurrentScheduleJob(item, snapshot) {
    return !item.deletionPending && (!Array.isArray(snapshot.schedules) || snapshot.schedules.some(schedule => schedule.id === item.scheduleId));
  }
  async function geocodeAllLocations() {
    geocodingAll = true;
    try {
      const current = await request('getLocations', [], { autoGeocode: false });
      const identities = current.locations.filter(item => isCurrentScheduleJob(item, current)).map(reference);
      const results = [];
      for (const identity of identities) {
        const batch = await request('geocodeBatch', [], { identities: [identity] });
        results.push(...batch.results);
        if (typeof setStatus === 'function') setStatus(`Geocoding ${results.length} of ${identities.length} addresses…`);
      }
      return {
        total: results.length,
        updated: results.filter(item => item.status === 'updated').length,
        skipped: results.filter(item => item.status === 'skipped').length,
        failed: results.filter(item => item.status === 'failed').length,
        results,
      };
    } finally { geocodingAll = false; }
  }

  function runner(success = () => {}, failure = error => console.error(error)) {
    const run = {
      withSuccessHandler(handler) { return runner(handler, failure); },
      withFailureHandler(handler) { return runner(success, handler); },
    };
    for (const action of ['getLocations', 'setCompleted', 'setNotes', 'setPhotos', 'setBodyOfWater', 'geocodeLocation', 'geocodeAllLocations']) {
      run[action] = (...args) => {
        const promise = action === 'geocodeAllLocations' ? geocodeAllLocations() : request(action, args);
        promise.then(success).catch(failure);
      };
    }
    return run;
  }
  return { get run() { return runner(); } };
})();

 /************************************************************
 * STATE
 ************************************************************/
let locations = [];
const locallyDeletedJobIds = new Set();
let markers = [];
let map;
let lightTileLayer;
let pendingMapBounds;
const PRINT_LOGO_DATA_URI = '/scheduler-assets/lakeview-logo.png';
/************************************************************
 * START
 ************************************************************/
function start() {
  map =
    L.map(
      'map'
    );
  // Keep tiles aligned when the filter bar wraps or changes height.
  mapResizeObserver = new ResizeObserver(() => {
    if (!document.getElementById('map').clientHeight || !document.getElementById('map').clientWidth) return;
    map.invalidateSize({animate: false});
    if (pendingMapBounds) {
      map.fitBounds(pendingMapBounds, {padding: [40, 40], maxZoom: 16});
      pendingMapBounds = undefined;
    }
    map.eachLayer(layer => { if (layer instanceof L.Popup) layer.update(); });
  });
  mapResizeObserver.observe(document.getElementById('map'));
  lightTileLayer =
    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        // Set this on each image too: embedded previews may override page headers.
        referrerPolicy: 'strict-origin-when-cross-origin',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    );
  lightTileLayer.addTo(map);
  map.setView(
    [
      42.05,
      -71.88
    ],
    11
  );
  loadData();
  // Floot realtime refreshes the jobs when a crew member saves.
}
/************************************************************
 * LOAD DATA
 ************************************************************/
let dataLoadInFlight = false;
let hasLoadedData = false;
function hasOpenLocationPopup() {
  return completionBusy || Boolean(document.querySelector('.photo-dialog')) || markers.some(function(marker) { return marker.isPopupOpen(); });
}
function loadData(
  options
) {
  options =
    options || {};
  const manual =
    options.manual === true;
  // Do not replace popup DOM or its underlying record while the user is editing.
  if (hasOpenLocationPopup()) {
    if (manual) setStatus('Close the open job popup before refreshing. Your edits are preserved.');
    return;
  }
  if (dataLoadInFlight) return;
  dataLoadInFlight = true;
  const refreshButton =
    document.getElementById(
      'refresh-data'
    );
  const refreshStatus =
    document.getElementById(
      'refresh-status'
    );
  if (
    manual &&
    refreshButton
  ) {
    refreshButton.disabled =
      true;
    refreshButton.textContent =
      '↻ Refreshing…';
    if (
      refreshStatus
    ) {
      refreshStatus.textContent =
        'Loading jobs…';
    }
  }
  crewApi.run
    .withSuccessHandler(
      function(result) {
        dataLoadInFlight = false;
        // A popup may have opened while the network request was in flight.
        if (hasOpenLocationPopup()) {
          if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = '↻ Refresh jobs';
          }
          if (manual && refreshStatus) refreshStatus.textContent = 'Refresh deferred while a job popup is open.';
          return;
        }
        locations =
          (
            result &&
            Array.isArray(
              result.locations
            )
          )
            ? result.locations.filter(job => !locallyDeletedJobIds.has(job.jobId))
            : [];
        window.schedulerUI.setStorage(result.storage || 'sheets');
        window.schedulerUI.setSnapshot({ ...result, locations });
        populateTownFilter();
        populateWaterFilter();
        render({ fitBounds: !hasLoadedData });
        hasLoadedData = true;
        if (
          manual &&
          refreshStatus
        ) {
          refreshStatus.textContent =
            'Updated ' +
            new Date()
              .toLocaleTimeString(
                [],
                {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit'
                }
              ) +
            ' • ' +
            locations.length +
            ' records';
        }
        if (
          manual &&
          refreshButton
        ) {
          refreshButton.disabled =
            false;
          refreshButton.textContent =
            '↻ Refresh jobs';
        }
      }
    )
    .withFailureHandler(
      function(error) {
        dataLoadInFlight = false;
        console.error(
          error
        );
        setStatus(
          'Error loading data'
        );
        if (
          manual &&
          refreshStatus
        ) {
          refreshStatus.textContent =
            'Refresh failed';
        }
        if (
          manual &&
          refreshButton
        ) {
          refreshButton.disabled =
            false;
          refreshButton.textContent =
            '↻ Refresh jobs';
        }
        const message = error?.message || 'Unable to load jobs. Try Refresh jobs.';
        setStatus(message);
        if (!hasLoadedData) {
          document.getElementById('visible-count').textContent = 'Jobs unavailable';
          for (const key of ['total','completed','remaining']) document.getElementById('summary-' + key).textContent = '—';
          const notice = document.createElement('p'); notice.setAttribute('role','alert'); notice.style.padding = '1rem'; notice.textContent = message;
          document.getElementById('customer-list').replaceChildren(notice);
        }
      }
    )
    .getLocations();
}
function refreshData() {
  loadData(
    {
      manual: true
    }
  );
}
/************************************************************
 * FILTER
 ************************************************************/
function getFilteredLocations() {
  const search =
    document
      .getElementById(
        'search'
      )
      .value
      .trim()
      .toLowerCase();
  const town =
    document
      .getElementById(
        'town'
      )
      .value;
  const water =
    document
      .getElementById(
        'water-filter'
      )
      .value;
  const includeCompleted =
    document
      .getElementById(
        'include-completed'
      )
      .checked;
  const from =
    document
      .getElementById(
        'date-from'
      )
      .value;
  const to =
    document
      .getElementById(
        'date-to'
      )
      .value;
  return locations.filter(
    function(location) {
      if (!window.schedulerUI.matchesSchedule(location)) return false;
      if (
        town &&
        location.town !== town
      ) {
        return false;
      }
      if (
        water &&
        location.bodyOfWater !== water &&
        location.otherBody !== water
      ) {
        return false;
      }
      if (
        !includeCompleted &&
        location.completed
      ) {
        return false;
      }
      if (
        from &&
        (
          !location.appointmentDate ||
          location.appointmentDate < from
        )
      ) {
        return false;
      }
      if (
        to &&
        (
          !location.appointmentDate ||
          location.appointmentDate > to
        )
      ) {
        return false;
      }
      if (search) {
        const searchable = [
          location.roNumber,
          location.firstName,
          location.lastName,
          location.fullName,
          location.address,
          location.rawAddress,
          location.bodyOfWater,
          location.otherBody,
          location.phone,
          location.appointment,
          location.workDescription,
          location.submissionId,
          location.town,
          location.state,
          location.zip,
          location.notes
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (
          !searchable.includes(
            search
          )
        ) {
          return false;
        }
      }
      return true;
    }
  );
}
/************************************************************
 * RENDER
 ************************************************************/
function render(options) {
  clearMarkers();
  const filtered =
    getFilteredLocations();
  updateSummary(
    filtered
  );
  drawMarkers(
    filtered,
    !options || options.fitBounds !== false
  );
  drawList(
    filtered
  );
}
/************************************************************
 * SUMMARY
 ************************************************************/
function updateSummary(
  filtered
) {
  const total =
    filtered.length;
  const completed =
    filtered.filter(
      function(location) {
        return location.completed;
      }
    ).length;
  const remaining =
    total -
    completed;
  document
    .getElementById(
      'summary-total'
    )
    .textContent =
    total;
  document
    .getElementById(
      'summary-completed'
    )
    .textContent =
    completed;
  document
    .getElementById(
      'summary-remaining'
    )
    .textContent =
    remaining;
}
/************************************************************
 * DRAW MARKERS
 ************************************************************/
// Keep ordinary Leaflet markers so popup, keyboard and click behavior stays intact.
const locationMarkerIcons = {};
function locationMarkerIcon(completed, appointmentDate) {
  // Use the normalized calendar date directly to avoid timezone shifts.
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(appointmentDate || '');
  const dateLabel = dateParts ? dateParts[2] + '/' + dateParts[3] : '';
  const width = dateLabel ? 68 : 24;
  const key = (completed ? 'completed' : 'remaining') + ':' + dateLabel;
  if (locationMarkerIcons[key]) return locationMarkerIcons[key];
  const color = completed ? '#228447' : '#cc3434';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" viewBox="0 0 ${width} 24">
    ${dateLabel ? `<rect x="16" y="3" width="50" height="18" rx="9" fill="white" stroke="${color}" stroke-width="1.2"/>
    <text x="43" y="15.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="${color}">${dateLabel}</text>` : ''}
    <circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="2"/>
    ${completed ? '<path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' : '<circle cx="12" cy="12" r="2.5" fill="white"/>'}
  </svg>`;
  return locationMarkerIcons[key] = L.icon({
    iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    iconSize: [width, 24], iconAnchor: [12, 12], popupAnchor: [0, -12], tooltipAnchor: [12, 0]
  });
}
function updateMarkerGlow(marker) {
  const highlighted = !!marker._listHovered || marker.isPopupOpen();
  const element = marker.getElement();
  if (element) element.classList.toggle('marker-glow', highlighted);
  marker.setZIndexOffset(highlighted ? 1000 : 0);
}
function drawMarkers(
  rows,
  fitBounds
) {
  const bounds = [];
  rows.forEach(
    function(location) {
      if (
        !location.hasCoordinates
      ) {
        return;
      }
      const marker =
        L.marker(
          [
            location.latitude,
            location.longitude
          ],
          {
            icon: locationMarkerIcon(location.completed, location.appointmentDate),
            alt: (location.completed ? 'Completed location' : 'Not completed location') +
              (location.appointmentDate ? ', appointment ' + location.appointmentDate : '')
          }
        )
        .addTo(map);
      marker.bindPopup(
        buildPopup(
          location
        ),
        {
          maxWidth: 360
        }
      );
      marker.on('popupopen popupclose', function() {
        updateMarkerGlow(marker);
      });
      marker._rowNumber =
        location.rowNumber;
      markers.push(
        marker
      );
      bounds.push(
        [
          location.latitude,
          location.longitude
        ]
      );
    }
  );
  setStatus(
    rows.length +
    ' locations'
  );
  if (
    bounds.length && fitBounds !== false
  ) {
    if (!document.getElementById('map').clientHeight || !document.getElementById('map').clientWidth) {
      pendingMapBounds = bounds;
    } else {
      map.fitBounds(bounds, {padding: [40, 40], maxZoom: 16});
      pendingMapBounds = undefined;
    }
  }
}
/************************************************************
 * POPUP
 ************************************************************/
function buildPopup(location) {
  const e = escapeHtml;
  const row = location.rowNumber;
  const completed = location.completed;
  const editUrl = window.schedulerUI.jobEditUrl(location);
  return `<article class="popup-card">
    <header class="popup-heading">
      <div class="popup-name">${e(location.fullName || 'Customer')}</div>
      ${location.bodyOfWater ? `<div class="popup-water">${e(location.bodyOfWater)}</div>` : ''}
    </header>
    <div class="popup-row popup-address">${e(location.address || location.rawAddress || 'Address unavailable')}</div>
    <dl class="popup-details">
      ${location.roNumber ? `<dt>RO#</dt><dd>${e(location.roNumber)}</dd>` : ''}
      ${location.phone ? `<dt>Phone</dt><dd>${e(location.phone)}</dd>` : ''}
      ${location.appointment ? `<dt>Appointment</dt><dd>${e(location.appointment)}</dd>` : ''}
    </dl>
    <div class="popup-actions">
      ${editUrl ? `<a class="popup-edit-link popup-edit-job" href="${e(editUrl)}" target="_blank" rel="noopener noreferrer" onclick="closePopupForEdit()">Edit job</a>` : ''}
      ${location.jobId ? `<button type="button" class="popup-print-button" onclick="requestDeleteJob(${row})">${location.deletionPending ? 'Retry deletion' : 'Delete job'}</button>` : ''}
      <button type="button" class="popup-print-button" onclick="printJobSummary(${row})">Print Job Summary</button>
      <button type="button" class="popup-print-button" onclick="editJobPhotos(${row})">Upload Photos (${(location.photos || []).length}/2)</button>
    </div>
    ${location.workDescription ? `<section class="popup-section"><div class="popup-label">Description of Work</div><div class="popup-work">${e(location.workDescription)}</div></section>` : ''}
    <section class="popup-water-editor">
      <label class="popup-label" for="water-${row}">Body of Water</label>
      <div class="popup-inline-editor">
        <input type="text" id="water-${row}" value="${e(location.bodyOfWater || '')}" placeholder="Enter body of water">
        <button type="button" onclick="saveBodyOfWaterFromPopup(${row}, this)">Save Body of Water</button>
      </div>
    </section>
    <section class="popup-notes-editor">
      <label class="popup-label" for="notes-${row}">Notes</label>
      <textarea id="notes-${row}">${e(location.notes || '')}</textarea>
      <div class="popup-editor-actions"><button type="button" onclick="saveNotesFromPopup(${row}, this)">Save Notes</button></div>
    </section>
    <div class="popup-completed-control">
      <span class="popup-status ${completed ? 'completed' : ''}">${completed ? '✓ Completed' : 'Not Completed'}</span>
      <label><input type="checkbox" ${completed ? 'checked' : ''} onchange="toggleCompletedFromPopup(${row}, this.checked, this)"><span>${completed ? 'Completed' : 'Mark as Completed'}</span></label>
    </div>
    <div class="popup-coordinates">${location.hasCoordinates ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Not geocoded'}</div>
  </article>`;
}
function closePopupForEdit() { map.closePopup(); }
/************************************************************
 * PRINT JOB SUMMARY
 ************************************************************/
async function compressJobPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose JPEG, PNG, or WebP photos. Convert HEIC photos to JPEG first.');
  }
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose photos smaller than 20 MB each.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    for (const edge of [1280, 1024, 800, 640, 480, 320]) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.45, 0.25]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= 48000) return { name: file.name.slice(0, 120) || 'Job photo.jpg', dataUrl };
      }
    }
    throw new Error('Unable to compress this photo. Choose a smaller image.');
  } catch (error) {
    throw new Error(error.message || 'Unable to read this photo. Choose another image.');
  } finally { URL.revokeObjectURL(url); }
}

function editJobPhotos(rowNumber) {
  if (document.querySelector('.photo-dialog')) return;
  const location = locations.find(item => item.rowNumber === rowNumber);
  if (!location) return;
  let photos = (location.photos || []).slice();
  let busy = false;
  const dialog = window.schedulerUI.createDialog('photos');
  dialog.setAttribute('aria-labelledby', 'photo-heading');
  document.body.appendChild(dialog);
  dialog.querySelector('.photo-customer').textContent = location.fullName || 'Customer';
  const input = dialog.querySelector('input');
  const error = dialog.querySelector('.completion-error');
  const save = dialog.querySelector('.photo-save');
  function setBusy(value, label) {
    busy = value;
    dialog.querySelectorAll('input, button').forEach(el => { el.disabled = value; });
    if (!value) input.disabled = photos.length >= 2;
    save.textContent = label || 'Save Photos';
  }
  function preview() {
    const container = dialog.querySelector('.photo-previews');
    container.replaceChildren();
    photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = photo.dataUrl;
      image.alt = 'Job photo ' + (index + 1);
      const caption = document.createElement('figcaption');
      caption.textContent = photo.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove photo ' + (index + 1);
      remove.onclick = function() { photos.splice(index, 1); preview(); };
      figure.append(image, caption, remove);
      container.appendChild(figure);
    });
    input.disabled = photos.length >= 2;
  }
  function close() { if (!busy) { dialog.close(); dialog.remove(); } }
  dialog.querySelector('.photo-cancel').onclick = close;
  dialog.addEventListener('cancel', function(event) { event.preventDefault(); close(); });
  input.onchange = async function() {
    const files = Array.from(input.files);
    error.textContent = '';
    if (photos.length + files.length > 2) {
      error.textContent = 'You can attach up to two photos. Remove a photo before adding another.';
      input.value = '';
      return;
    }
    setBusy(true, 'Preparing photos…');
    try {
      const additions = [];
      for (const file of files) additions.push(await compressJobPhoto(file));
      photos = photos.concat(additions);
      preview();
    } catch (failure) { error.textContent = failure.message; }
    finally { input.value = ''; setBusy(false); }
  };
  dialog.querySelector('form').onsubmit = function(event) {
    event.preventDefault();
    if (busy) return;
    error.textContent = '';
    setBusy(true, 'Saving…');
    crewApi.run.withSuccessHandler(function(result) {
      location.photos = result.photos;
      setBusy(false);
      close();
      render();
      const marker = findMarker(location.rowNumber);
      if (marker) marker.openPopup();
      setStatus('Job photos saved');
    }).withFailureHandler(function(failure) {
      setBusy(false);
      error.textContent = failure.message || 'Unable to save photos. Please try again.';
    }).setPhotos(location.rowNumber, photos);
  };
  preview();
  dialog.showModal();
}

function printJobSummary(
  rowNumber,
  reservedWindow
) {
  const location =
    locations.find(
      item =>
        Number(item.rowNumber) ===
        Number(rowNumber)
    );
  if (!location) {
    alert('Unable to find this job.');
    return;
  }
  const printWindow =
    reservedWindow && !reservedWindow.closed ? reservedWindow : window.open('', '_blank');
  if (!printWindow) {
    alert(
      'Please allow pop-ups for this app to open the print summary.'
    );
    return;
  }
  renderPrintJobSummary(
    printWindow,
    location,
    PRINT_LOGO_DATA_URI
  );
}
function renderPrintJobSummary(printWindow, location, logoDataUri) {
  if (!printWindow || printWindow.closed) return;
  const editUrl = window.schedulerUI.jobEditUrl(location);
  const html = dockPrintHtml(location, { logoDataUri, editUrl: editUrl ? new URL(editUrl, window.location.origin).href : '' });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
/************************************************************
 * CUSTOMER LIST
 *
 * SORT ORDER IS CONTROLLED BY THE SORT BY DROPDOWN.
 ************************************************************/
function drawList(
  rows
) {
  /*
   * Make a copy so that the underlying locations array
   * remains in its original spreadsheet order.
   */
  const sortBy =
    document.getElementById(
      'sort-by'
    ).value;
  const sortedRows =
    [...rows].sort(
      function(a, b) {
        if (
          sortBy === 'submittedDate'
        ) {
          return window.schedulerUI.compareSubmissionDates(a, b);
        }
        if (
          sortBy === 'lastName'
        ) {
          const lastNameComparison =
            (
              a.lastName || ''
            ).localeCompare(
              b.lastName || '',
              undefined,
              {
                sensitivity: 'base'
              }
            );
          if (
            lastNameComparison !== 0
          ) {
            return lastNameComparison;
          }
          return (
            a.firstName || ''
          ).localeCompare(
            b.firstName || '',
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }
        if (
          sortBy === 'bodyOfWater'
        ) {
          const waterA =
            a.bodyOfWater || '';
          const waterB =
            b.bodyOfWater || '';
          /*
           * Blank Body of Water values go to the bottom.
           */
          if (
            !waterA &&
            !waterB
          ) {
            return 0;
          }
          if (!waterA) {
            return 1;
          }
          if (!waterB) {
            return -1;
          }
          const waterComparison =
            waterA.localeCompare(
              waterB,
              undefined,
              {
                sensitivity: 'base'
              }
            );
          if (
            waterComparison !== 0
          ) {
            return waterComparison;
          }
          return (
            a.lastName || ''
          ).localeCompare(
            b.lastName || '',
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }
        /*
         * Date sort (default):
         * appointmentDate / DateHold ascending.
         * Records without a date go to the bottom.
         */
        if (
          !a.appointmentDate &&
          !b.appointmentDate
        ) {
          return (
            a.lastName || ''
          ).localeCompare(
            b.lastName || '',
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }
        if (!a.appointmentDate) {
          return 1;
        }
        if (!b.appointmentDate) {
          return -1;
        }
        const dateComparison =
          a.appointmentDate.localeCompare(
            b.appointmentDate
          );
        if (
          dateComparison !== 0
        ) {
          return dateComparison;
        }
        // Dates share a day: show the crew's earliest time slot first.
        const timeA = Number.isFinite(a.appointmentTimeMinutes) ? a.appointmentTimeMinutes : Infinity;
        const timeB = Number.isFinite(b.appointmentTimeMinutes) ? b.appointmentTimeMinutes : Infinity;
        if (timeA !== timeB) return timeA < timeB ? -1 : 1;
        const lastNameComparison =
          (
            a.lastName || ''
          ).localeCompare(
            b.lastName || '',
            undefined,
            {
              sensitivity: 'base'
            }
          );
        if (
          lastNameComparison !== 0
        ) {
          return lastNameComparison;
        }
        return (
          a.firstName || ''
        ).localeCompare(
          b.firstName || '',
          undefined,
          {
            sensitivity: 'base'
          }
        );
      }
    );
  window.schedulerUI.renderJobs(sortedRows);
}
/************************************************************
 * OPEN LOCATION POPUP
 ************************************************************/
function openLocationPopup(
  location
) {
  if (
    !location.hasCoordinates
  ) {
    alert(
      'This address has not been geocoded yet.'
    );
    return;
  }
  const marker =
    findMarker(
      location.rowNumber
    );
  if (!marker) {
    focusLocation(
      location
    );
    return;
  }
  marker.setPopupContent(
    buildPopup(
      location
    )
  );
  marker.openPopup();
}
/************************************************************
 * SAVE BODY OF WATER
 ************************************************************/
function saveBodyOfWaterFromPopup(
  rowNumber,
  button
) {
  const input =
    document.getElementById(
      'water-' +
      rowNumber
    );
  if (!input) {
    return;
  }
  const location =
    locations.find(
      function(item) {
        return (
          Number(
            item.rowNumber
          ) ===
          Number(
            rowNumber
          )
        );
      }
    );
  if (!location) {
    return;
  }
  const bodyOfWater =
    input.value.trim();
  button.disabled =
    true;
  button.textContent =
    'Saving...';
  crewApi.run
    .withSuccessHandler(
      function(result) {
        location.bodyOfWater =
          result.bodyOfWater;
        location.otherBody = result.otherBody;
        location.bodyOfWaterSelection = result.bodyOfWaterSelection;
        button.disabled =
          false;
        button.textContent =
          'Saved ✓';
        populateWaterFilter();
        render();
        setStatus(
          'Body of Water saved'
        );
        const marker =
          findMarker(
            location.rowNumber
          );
        if (
          marker
        ) {
          marker.setPopupContent(
            buildPopup(
              location
            )
          );
          marker.openPopup();
        }
      }
    )
    .withFailureHandler(
      function(error) {
        button.disabled =
          false;
        button.textContent =
          'Save Body of Water';
        alert(
          'Unable to save Body of Water.\n\n' +
          (
            error.message ||
            String(error)
          )
        );
      }
    )
    .setBodyOfWater(
      rowNumber,
      bodyOfWater
    );
}
/************************************************************
 * SAVE NOTES
 ************************************************************/
function saveNotesFromPopup(
  rowNumber,
  button
) {
  const textarea =
    document.getElementById(
      'notes-' +
      rowNumber
    );
  if (!textarea) {
    return;
  }
  const location =
    locations.find(
      function(item) {
        return (
          Number(
            item.rowNumber
          ) ===
          Number(
            rowNumber
          )
        );
      }
    );
  if (!location) {
    return;
  }
  const notes =
    textarea.value;
  button.disabled =
    true;
  button.textContent =
    'Saving...';
  crewApi.run
    .withSuccessHandler(
      function(result) {
        location.notes =
          result.notes;
        button.disabled =
          false;
        button.textContent =
          'Saved ✓';
        render();
        setStatus(
          'Notes saved'
        );
        const marker =
          findMarker(
            location.rowNumber
          );
        if (
          marker
        ) {
          marker.setPopupContent(
            buildPopup(
              location
            )
          );
          marker.openPopup();
        }
      }
    )
    .withFailureHandler(
      function(error) {
        button.disabled =
          false;
        button.textContent =
          'Save Notes';
        alert(
          'Unable to save notes.\n\n' +
          (
            error.message ||
            String(error)
          )
        );
      }
    )
    .setNotes(
      rowNumber,
      notes
    );
}
/************************************************************
 * UPDATE COMPLETED
 ************************************************************/
let completionBusy = false;
function signatureStamp(name) {
  const text = String(name || '');
  return '<svg class="signature-stamp" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 60" role="img" aria-label="Typed signature: ' + escapeHtml(text) + '">' +
    '<text x="8" y="43" fill="#111" font-family="Segoe Script, Brush Script MT, cursive" font-size="34"' +
    (text.length > 32 ? ' textLength="570" lengthAdjust="spacingAndGlyphs"' : '') + '>' + escapeHtml(text) + '</text></svg>';
}
function completionDateLabel(value) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return parts ? parts[2] + '/' + parts[3] + '/' + parts[1] : String(value || '');
}
function updateCompleted(location, completed, checkbox) {
  checkbox.checked = location.completed;
  if (completionBusy) return;
  completionBusy = true;
  checkbox.disabled = true;
  let dialog;
  const finish = function() {
    completionBusy = false;
    checkbox.disabled = false;
    checkbox.checked = location.completed;
    if (dialog) { dialog.close(); dialog.remove(); }
  };
  const save = function(signature, date) {
    // Open during the submit gesture so the asynchronous save does not block the print popup.
    const printWindow = completed ? window.open('', '_blank') : null;
    if (printWindow) {
      printWindow.document.title = 'Saving completed job';
      printWindow.document.body.textContent = 'Saving signature and preparing print summary…';
    }
    const saveButton = dialog && dialog.querySelector('.completion-save');
    if (dialog) {
      dialog.dataset.saving = 'true';
      dialog.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
      saveButton.textContent = 'Saving…';
      dialog.querySelector('.completion-error').textContent = '';
    }
    crewApi.run
      .withSuccessHandler(function(result) {
        location.completed = result.completed;
        location.rowNumber = result.rowNumber;
        location.completionSignature = result.completionSignature;
        location.completionDate = result.completionDate;
        finish();
        render({fitBounds: false});
        setStatus(result.completed ? 'Job completed and signed' : 'Marked not completed');
        if (completed && result.completed) {
          printJobSummary(location.rowNumber, printWindow);
        } else if (printWindow && !printWindow.closed) {
          printWindow.close();
        }
      })
      .withFailureHandler(function(error) {
        if (printWindow && !printWindow.closed) printWindow.close();
        const message = error.message || String(error);
        if (dialog) {
          dialog.dataset.saving = 'false';
          dialog.querySelectorAll('input, button').forEach(el => { el.disabled = false; });
          saveButton.textContent = 'Sign & Mark Completed';
          dialog.querySelector('.completion-error').textContent = message;
        } else { finish(); alert('Unable to update Completed.\n\n' + message); }
      })
      .setCompleted(location.rowNumber, completed, signature, date, location.submissionId || '');
  };
  if (!completed) { save('', ''); return; }
  dialog = window.schedulerUI.createDialog('completion');
  dialog.setAttribute('aria-labelledby', 'completion-heading');
  document.body.appendChild(dialog);
  dialog.querySelector('.completion-customer').textContent = location.fullName || 'Customer';
  const nameInput = dialog.querySelector('#completion-signature');
  const dateInput = dialog.querySelector('#completion-date');
  const today = new Date();
  dateInput.value = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  nameInput.oninput = function() {
    nameInput.setCustomValidity('');
    dialog.querySelector('.completion-preview').innerHTML = signatureStamp(nameInput.value.trim());
  };
  dialog.querySelector('.completion-cancel').onclick = finish;
  dialog.addEventListener('cancel', function(event) {
    event.preventDefault();
    if (dialog.dataset.saving !== 'true') finish();
  });
  dialog.querySelector('form').onsubmit = function(event) {
    event.preventDefault();
    if (dialog.dataset.saving === 'true') return;
    if (!nameInput.value.trim()) {
      nameInput.setCustomValidity('Please type your signature.'); nameInput.reportValidity(); return;
    }
    save(nameInput.value.trim(), dateInput.value);
  };
  dialog.showModal();
  nameInput.focus();
}
/************************************************************
 * POPUP COMPLETED
 ************************************************************/
function toggleCompletedFromPopup(
  rowNumber,
  completed,
  checkbox
) {
  const location =
    locations.find(
      function(item) {
        return (
          Number(
            item.rowNumber
          ) ===
          Number(
            rowNumber
          )
        );
      }
    );
  if (!location) {
    return;
  }
  updateCompleted(
    location,
    completed,
    checkbox
  );
}
/************************************************************
 * GEOCODE ONE
 ************************************************************/
function geocodeOne(
  location,
  button
) {
  button.disabled =
    true;
  button.textContent =
    'Geocoding...';
  setStatus(
    'Geocoding...'
  );
  crewApi.run
    .withSuccessHandler(
      function(result) {
        location.latitude =
          result.latitude;
        location.longitude =
          result.longitude;
        location.hasCoordinates =
          true;
        button.disabled =
          false;
        button.textContent =
          '↻ Refresh Location';
        render();
        map.setView(
          [
            result.latitude,
            result.longitude
          ],
          16
        );
        const marker =
          findMarker(
            location.rowNumber
          );
        if (
          marker
        ) {
          marker.openPopup();
        }
        setStatus(
          'Location updated'
        );
      }
    )
    .withFailureHandler(
      function(error) {
        button.disabled =
          false;
        button.textContent =
          '📍 Geocode Address';
        setStatus(
          'Geocoding failed'
        );
        alert(
          error.message ||
          String(error)
        );
      }
    )
    .geocodeLocation(
      location.rowNumber
    );
}
/************************************************************
 * GEOCODE ALL
 ************************************************************/
function geocodeAll() {
  if (
    !confirm(
      'Geocode every address in Fall Removal Requests?\n\n' +
      'This will update Latitude and Longitude.'
    )
  ) {
    return;
  }
  const button =
    document.getElementById(
      'geocode-all'
    );
  button.disabled =
    true;
  button.textContent =
    'Geocoding...';
  setStatus(
    'Geocoding all addresses...'
  );
  crewApi.run
    .withSuccessHandler(
      function(result) {
        result.results.forEach(
          function(update) {
            if (
              update.status !==
              'updated'
            ) {
              return;
            }
            const location =
              locations.find(
                function(item) {
                  return item.recordKey === update.recordKey;
                }
              );
            if (!location) {
              return;
            }
            location.rowNumber = update.rowNumber;
            location.latitude =
              update.latitude;
            location.longitude =
              update.longitude;
            location.hasCoordinates =
              true;
          }
        );
        button.disabled =
          false;
        button.textContent =
          '↻ Geocode All Addresses';
        render();
        setStatus(
          'Geocoding complete'
        );
        alert(
          'Geocoding complete.\n\n' +
          'Updated: ' +
          result.updated +
          '\nSkipped: ' +
          result.skipped +
          '\nFailed: ' +
          result.failed +
          '\nTotal: ' +
          result.total
        );
      }
    )
    .withFailureHandler(
      function(error) {
        button.disabled =
          false;
        button.textContent =
          '↻ Geocode All Addresses';
        setStatus(
          'Geocoding failed'
        );
        alert(
          error.message ||
          String(error)
        );
      }
    )
    .geocodeAllLocations();
}
/************************************************************
 * FIND MARKER
 ************************************************************/
function findMarker(
  rowNumber
) {
  return markers.find(
    function(marker) {
      return (
        Number(
          marker._rowNumber
        ) ===
        Number(
          rowNumber
        )
      );
    }
  );
}
/************************************************************
 * FOCUS LOCATION
 ************************************************************/
function focusLocation(
  location
) {
  if (
    !location.hasCoordinates
  ) {
    alert(
      'This address has not been geocoded yet.'
    );
    return;
  }
  map.setView(
    [
      location.latitude,
      location.longitude
    ],
    16
  );
  const marker =
    findMarker(
      location.rowNumber
    );
  if (
    marker
  ) {
    marker.openPopup();
  }
}
/************************************************************
 * TOWN FILTER
 ************************************************************/
function populateTownFilter() {
  const select =
    document.getElementById(
      'town'
    );
  const current =
    select.value;
  select.innerHTML =
    '<option value="">All towns</option>';
  const towns =
    [
      ...new Set(
        locations
          .map(
            function(location) {
              return location.town;
            }
          )
          .filter(Boolean)
      )
    ]
    .sort();
  towns.forEach(
    function(town) {
      const option =
        document.createElement(
          'option'
        );
      option.value =
        town;
      option.textContent =
        town;
      select.appendChild(
        option
      );
    }
  );
  if (
    towns.includes(
      current
    )
  ) {
    select.value =
      current;
  }
}
/************************************************************
 * BODY OF WATER FILTER
 ************************************************************/
function populateWaterFilter() {
  const select =
    document.getElementById(
      'water-filter'
    );
  const current =
    select.value;
  select.innerHTML =
    '<option value="">All bodies of water</option>';
  const waters =
    [
      ...new Set(
        locations
          .flatMap(
            function(location) {
              return [
                location.bodyOfWater,
                location.otherBody
              ];
            }
          )
          .map(
            function(value) {
              return String(
                value || ''
              ).trim();
            }
          )
          .filter(Boolean)
      )
    ]
    .sort(
      function(a, b) {
        return a.localeCompare(
          b,
          undefined,
          {
            sensitivity: 'base'
          }
        );
      }
    );
  waters.forEach(
    function(water) {
      const option =
        document.createElement(
          'option'
        );
      option.value =
        water;
      option.textContent =
        water;
      select.appendChild(
        option
      );
    }
  );
  if (
    waters.includes(
      current
    )
  ) {
    select.value =
      current;
  }
}
/************************************************************
 * CLEAR MARKERS
 ************************************************************/
function clearMarkers() {
  markers.forEach(
    function(marker) {
      map.removeLayer(
        marker
      );
    }
  );
  markers = [];
}
/************************************************************
 * STATUS
 ************************************************************/
function setStatus(
  message
) {
  document
    .getElementById(
      'map-status'
    )
    .textContent =
    message;
}
/************************************************************
 * HTML ESCAPING
 ************************************************************/
function escapeHtml(
  value
) {
  return String(
    value
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}
/************************************************************
 * THEME
 ************************************************************/
function applyTheme(
  theme
) {
  const isDark =
    theme !== 'light';
  document.body.classList.toggle(
    'dark',
    isDark
  );
  const button =
    document.getElementById(
      'theme-toggle'
    );
  window.schedulerUI.setTheme(isDark ? 'dark' : 'light');
  button.textContent =
    isDark
      ? '☀ Light Theme'
      : '🌙 Dark Theme';
  // One OpenStreetMap layer is used for both themes.
  // Dark mode is created locally with CSS, so no map API key is required.
  try {
    localStorage.setItem(
      'dockCrewMapperTheme',
      isDark
        ? 'dark'
        : 'light'
    );
  }
  catch (error) {
    console.warn(
      'Unable to save theme preference.',
      error
    );
  }
}
function toggleTheme() {
  applyTheme(
    document.body.classList.contains(
      'dark'
    )
      ? 'light'
      : 'dark'
  );
}
function initializeTheme() {
  let theme =
    'light';
  try {
    const savedTheme =
      localStorage.getItem(
        'dockCrewMapperTheme'
      );
    if (
      savedTheme === 'light' ||
      savedTheme === 'dark'
    ) {
      theme =
        savedTheme;
    }
  }
  catch (error) {
    console.warn(
      'Unable to read theme preference.',
      error
    );
  }
  applyTheme(
    theme
  );
}
/************************************************************
 * EVENTS
 ************************************************************/
document
  .getElementById(
    'search'
  )
  .addEventListener(
    'input',
    render
  );
document
  .getElementById(
    'town'
  )
  .addEventListener(
    'change',
    render
  );
document
  .getElementById(
    'water-filter'
  )
  .addEventListener(
    'change',
    render
  );
document
  .getElementById(
    'include-completed'
  )
  .addEventListener(
    'change',
    render
  );
document
  .getElementById(
    'date-from'
  )
  .addEventListener(
    'change',
    render
  );
document
  .getElementById(
    'date-to'
  )
  .addEventListener(
    'change',
    render
  );
['filter-today', 'filter-tomorrow'].forEach(function(id, daysAhead) {
  document.getElementById(id).addEventListener('click', function() {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    const value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    document.getElementById('date-from').value = value;
    document.getElementById('date-to').value = value;
    document.getElementById('sort-by').value = 'date';
    render();
  });
});
document
  .getElementById(
    'clear-date'
  )
  .addEventListener(
    'click',
    function() {
      document.getElementById('search').value = '';
      document.getElementById('town').value = '';
      document.getElementById('water-filter').value = '';
      document
        .getElementById(
          'date-from'
        )
        .value = '';
      document
        .getElementById(
          'date-to'
        )
        .value = '';
      render();
    }
  );
document
  .getElementById(
    'sort-by'
  )
  .addEventListener(
    'change',
    render
  );
document
  .getElementById(
    'theme-toggle'
  )
  .addEventListener(
    'click',
    toggleTheme
  );
document
  .getElementById(
    'geocode-all'
  )
  .addEventListener(
    'click',
    geocodeAll
  );
document
  .getElementById(
    'refresh-data'
  )
  .addEventListener(
    'click',
    refreshData
  );
/************************************************************
 * START
 ************************************************************/
function requestDeleteJob(rowNumber) {
  const job = locations.find(item => item.rowNumber === rowNumber);
  if (job?.jobId) window.schedulerUI.requestDelete(job);
}
window.schedulerEngine = {
  removeJob(jobId) {
    locallyDeletedJobIds.add(jobId);
    if (map) map.closePopup();
    locations = locations.filter(job => job.jobId !== jobId);
    window.schedulerUI.jobDeleted(jobId);
    render({ fitBounds: false });
  },
  refreshData,
  selectSchedule() { if (map) map.closePopup(); render(); },
  focusLocation, openLocationPopup, updateCompleted, geocodeOne,
  hoverLocation(location, hovered) {
    const marker = findMarker(location.rowNumber);
    if (marker) { marker._listHovered = hovered; updateMarkerGlow(marker); }
  },
};
initializeTheme();
start();
listen('storage', function(event) {
  if (event.key === 'dockCrewJobUpdated') loadData({ fitBounds: false });
});
listen('focus', function() { loadData({ fitBounds: false }); });

 Object.assign(window,{closePopupForEdit,requestDeleteJob,printJobSummary,editJobPhotos,saveBodyOfWaterFromPopup,saveNotesFromPopup,toggleCompletedFromPopup});
 return () => { mapResizeObserver?.disconnect(); for(const [name,fn] of subscriptions)window.removeEventListener(name,fn); map?.remove(); delete window.schedulerEngine; };
}
