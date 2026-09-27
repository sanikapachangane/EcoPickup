const statusOrder = ['Pending', 'Accepted', 'Scheduled', 'Picked Up', 'Completed', 'Cancelled'];
const apiFetch = window.EcoPickupAPI.apiFetch;
let preserveSubmitStateOnNextReset = false;
let adminRequestsCache = [];
let adminStatsCache = {};
let trackHistoryCache = [];
let unavailableHistoryCount = 0;
let sectionRevealObserver = null;
let activityRangeDays = 30;
let adminSortKey = 'createdAt';
let adminSortDirection = -1;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function showToast(message, type = 'success') {
  const region = document.getElementById('toastRegion');
  if (!region) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function bindSiteNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('siteNav');
  if (!toggle || !nav) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    nav.classList.toggle('is-open', !isOpen);
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

function bindSectionReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sections = document.querySelectorAll('main > .section, .request-aside, .pickup-form-card, .track-layout, .history-section, .admin-section');
  const revealVisibleSections = () => {
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top < window.innerHeight * 0.94) {
        section.classList.add('reveal-visible');
        sectionRevealObserver?.unobserve(section);
      }
    });
  };

  if ('IntersectionObserver' in window) {
    sectionRevealObserver = new IntersectionObserver((entries, observerInstance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-visible');
        observerInstance.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
  }

  sections.forEach((section) => {
    section.classList.add('reveal-pending');
    sectionRevealObserver?.observe(section);
  });
  window.addEventListener('scroll', revealVisibleSections, { passive: true });
  window.addEventListener('resize', revealVisibleSections);
  revealVisibleSections();
}

function saveRequestId(requestId) {
  try {
    const savedIds = getSavedRequestIds();
    const nextIds = [requestId, ...savedIds.filter((savedId) => savedId !== requestId)].slice(0, 12);
    localStorage.setItem('ecopickup.requestIds', JSON.stringify(nextIds));
  } catch (_error) {
    showToast('Request created. This browser could not save it to your local history.', 'error');
  }
}

function getSavedRequestIds() {
  try {
    const savedIds = JSON.parse(localStorage.getItem('ecopickup.requestIds') || '[]');
    return Array.isArray(savedIds) ? savedIds.filter((requestId) => typeof requestId === 'string') : [];
  } catch (_error) {
    return [];
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

async function bindHomeImpactStats() {
  const totalValue = document.querySelector('[data-impact-total]');
  if (!totalValue) return;

  const source = document.getElementById('impactSource');
  try {
    const response = await apiFetch('/api/public/stats');
    if (!response.ok) throw new Error('Impact data unavailable');
    const { stats } = await response.json();
    const total = Number(stats?.total) || 0;
    const completed = Number(stats?.completed) || 0;
    const cancelled = Number(stats?.cancelled) || 0;
    totalValue.textContent = total.toLocaleString();
    document.querySelector('[data-impact-completed]').textContent = completed.toLocaleString();
    document.querySelector('[data-impact-active]').textContent = Math.max(0, total - completed - cancelled).toLocaleString();
    document.querySelector('[data-impact-rate]').textContent = `${Number(stats?.completionRate) || 0}%`;
    if (source) source.textContent = 'Updated from current pickup request records.';
  } catch (_error) {
    if (source) source.textContent = 'Live request indicators are unavailable right now.';
  }
}

function showStatus(element, type, message) {
  if (!element) return;
  element.className = 'submit-state';
  if (type) element.classList.add(type);
  element.textContent = message;
}

function setFieldState(field, errorMessage) {
  const input = document.getElementById(field);
  const group = field === 'wasteCategory' ? document.querySelectorAll('input[name="wasteCategory"]') : [];
  if (!input && !group.length) return;
  const formError = document.querySelector(`[data-error-for="${field}"]`);

  if (formError) {
    formError.textContent = errorMessage || '';
  }

  (group.length ? group : [input]).forEach((fieldInput) => {
    fieldInput.setAttribute('aria-invalid', Boolean(errorMessage).toString());
  });
}

function extractFormData(form) {
  return {
    fullName: form.fullName.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    wasteCategory: form.wasteCategory.value.trim(),
    wasteDescription: form.wasteDescription.value.trim(),
    quantity: form.quantity.value.trim(),
    address: form.address.value.trim(),
    city: form.city.value.trim(),
    pincode: form.pincode.value.trim(),
    pickupDate: form.pickupDate.value,
    timeSlot: form.timeSlot.value.trim(),
    instructions: form.instructions.value.trim(),
  };
}

function validateRequest(payload) {
  const errors = {};

  if (payload.fullName.length < 2 || payload.fullName.length > 80) {
    errors.fullName = 'Full name must be between 2 and 80 characters.';
  }

  if (!/^\d{10}$/.test(payload.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!payload.wasteCategory) {
    errors.wasteCategory = 'Please select a waste category.';
  }

  if (!payload.wasteDescription) {
    errors.wasteDescription = 'Please describe the waste.';
  }

  if (!payload.quantity) {
    errors.quantity = 'Tell us the approximate quantity.';
  }

  if (!payload.address) {
    errors.address = 'Please enter the pickup address.';
  }

  if (!payload.city) {
    errors.city = 'Please enter the city.';
  }

  if (!/^\d{6}$/.test(payload.pincode)) {
    errors.pincode = 'Pincode must be exactly 6 digits.';
  }

  if (!payload.pickupDate) {
    errors.pickupDate = 'Please select a pickup date.';
  } else {
    const selected = new Date(`${payload.pickupDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      errors.pickupDate = 'Pickup date cannot be in the past.';
    }
  }

  if (!payload.timeSlot) {
    errors.timeSlot = 'Please select a time slot.';
  }

  return errors;
}

function clearErrors() {
  ['fullName', 'phone', 'email', 'wasteCategory', 'wasteDescription', 'quantity', 'address', 'city', 'pincode', 'pickupDate', 'timeSlot', 'instructions'].forEach((key) => {
    setFieldState(key, '');
  });
}

function displayValidationErrors(errors) {
  clearErrors();
  Object.entries(errors).forEach(([key, message]) => {
    setFieldState(key, message);
  });
}

function formatStatus(status) {
  const safeStatus = status || 'Pending';
  return safeStatus;
}

function normalizeStatusClass(status) {
  return (status || 'Pending').replace(/\s+/g, '-');
}

function renderRequestSummary(request) {
  const summary = document.createElement('div');
  summary.className = 'request-summary';

  const items = [
    ['Request ID', request.requestId],
    ['Waste Category', request.wasteCategory],
    ['Pickup Date', request.pickupDate],
    ['Time Slot', request.timeSlot],
    ['Location', [request.address, request.city, request.pincode].filter(Boolean).join(', ')],
    ['Status', request.status],
  ];

  items.forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    const labelElement = document.createElement('span');
    const valueElement = document.createElement('strong');
    labelElement.textContent = label;
    valueElement.textContent = value || '—';
    item.append(labelElement, valueElement);
    summary.appendChild(item);
  });

  return summary;
}

function bindPickupForm() {
  const form = document.getElementById('pickupForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = document.getElementById('submitPickupBtn');
    const stateBox = document.getElementById('submitState');
    const payload = extractFormData(form);
    const errors = validateRequest(payload);

    if (Object.keys(errors).length > 0) {
      displayValidationErrors(errors);
      showStatus(stateBox, 'error', 'Please correct the highlighted fields in the form.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    showStatus(stateBox, 'success', 'Submitting your request...');

    try {
      const response = await apiFetch('/api/pickup-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiErrors = data.errors || {};
        displayValidationErrors(apiErrors);
        showStatus(stateBox, 'error', data.message || 'Unable to submit your request right now.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request';
        return;
      }

      clearErrors();
      stateBox.className = 'submit-state success';
      stateBox.replaceChildren();
      const successHeading = document.createElement('div');
      successHeading.className = 'success-heading';
      successHeading.innerHTML = '<span class="success-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span><strong>Pickup Request Created</strong><small>Your request has been successfully registered.</small></span>';
      stateBox.appendChild(successHeading);
      const summary = renderRequestSummary(data.request);
      stateBox.appendChild(summary);
      saveRequestId(data.request.requestId);
      preserveSubmitStateOnNextReset = true;
      form.reset();

      const copyRequestId = document.createElement('button');
      copyRequestId.type = 'button';
      copyRequestId.className = 'secondary-btn';
      copyRequestId.textContent = 'Copy Request ID';
      copyRequestId.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(data.request.requestId);
          copyRequestId.textContent = 'Copied!';
        } catch (_error) {
          copyRequestId.textContent = 'Copy failed';
        }
      });

      const trackBtn = document.createElement('a');
      trackBtn.href = `http://localhost:3003/?id=${encodeURIComponent(data.request.requestId)}`;
      trackBtn.className = 'primary-btn';
      trackBtn.textContent = 'Track Request';

      const historyBtn = document.createElement('a');
      historyBtn.href = `http://localhost:3003/?ids=${encodeURIComponent(getSavedRequestIds().join(','))}#my-requests`;
      historyBtn.className = 'secondary-btn';
      historyBtn.textContent = 'View My Requests';

      const newBtn = document.createElement('button');
      newBtn.type = 'button';
      newBtn.className = 'ghost-btn';
      newBtn.textContent = 'New Request';
      newBtn.addEventListener('click', () => {
        stateBox.className = 'submit-state';
        stateBox.textContent = '';
        form.reset();
      });

      const actions = document.createElement('div');
      actions.className = 'form-actions';
      actions.style.marginTop = '1rem';
      actions.style.justifyContent = 'flex-start';
      actions.appendChild(copyRequestId);
      actions.appendChild(trackBtn);
      actions.appendChild(historyBtn);
      actions.appendChild(newBtn);
      stateBox.appendChild(actions);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    } catch (_error) {
      showStatus(stateBox, 'error', 'Something went wrong while submitting your request. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }
  });

  form.addEventListener('reset', () => {
    const shouldClearStatus = !preserveSubmitStateOnNextReset;
    preserveSubmitStateOnNextReset = false;
    setTimeout(() => {
      clearErrors();
      const stateBox = document.getElementById('submitState');
      if (stateBox && shouldClearStatus) {
        stateBox.className = 'submit-state';
        stateBox.textContent = '';
      }
    }, 0);
  });
}

function renderTrackingResult(request) {
  const resultBox = document.getElementById('trackingResult');
  if (!resultBox) return;

  const stages = [
    { status: 'Pending', label: 'Request submitted' },
    { status: 'Accepted', label: 'Request accepted' },
    { status: 'Scheduled', label: 'Pickup scheduled' },
    { status: 'Picked Up', label: 'Waste picked up' },
    { status: 'Completed', label: 'Pickup completed' },
  ];
  const currentIndex = stages.findIndex((stage) => stage.status === request.status);
  const location = [request.address, request.city, request.pincode].filter(Boolean).join(', ') || 'Not provided';
  const items = stages.map((stage, index) => {
    const isDone = currentIndex >= 0 && index < currentIndex;
    const isCurrent = index === currentIndex;
    const stateLabel = isCurrent ? 'Current status' : isDone ? 'Completed' : 'Waiting';
    return `
      <div class="timeline-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}">
        <div class="timeline-bullet" aria-hidden="true">${isDone ? '✓' : index + 1}</div>
        <div><strong>${escapeHtml(stage.label)}</strong><div>${stateLabel}</div></div>
        <span class="status-badge status-${normalizeStatusClass(stage.status)}">${stateLabel}</span>
      </div>`;
  }).join('');
  const currentStatus = formatStatus(request.status);
  const currentStatusClass = normalizeStatusClass(currentStatus);
  const cancelledMessage = request.status === 'Cancelled'
    ? '<p class="cancelled-note">This request was cancelled. No later pickup steps are marked complete.</p>'
    : '';

  resultBox.innerHTML = `
    <div class="tracking-result-header"><div><span class="section-kicker">Request details</span><h2>${escapeHtml(request.requestId || 'Request')}</h2></div><span class="status-badge status-${currentStatusClass}">${escapeHtml(currentStatus)}</span></div>
    <div class="tracking-facts">
      <div class="summary-item"><span>Waste category</span><strong>${escapeHtml(request.wasteCategory || '—')}</strong></div>
      <div class="summary-item"><span>Pickup date</span><strong>${escapeHtml(formatDate(request.pickupDate))}</strong></div>
      <div class="summary-item"><span>Time slot</span><strong>${escapeHtml(request.timeSlot || '—')}</strong></div>
      <div class="summary-item"><span>Location</span><strong>${escapeHtml(location)}</strong></div>
    </div>
    ${cancelledMessage}
    <h3 class="timeline-heading">Collection progress</h3>
    <div class="timeline">${items}</div>`;
}

function renderTrackHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  const search = (document.getElementById('historySearch')?.value || '').trim().toLowerCase();
  const status = document.getElementById('historyStatus')?.value || '';
  const requests = trackHistoryCache.filter((request) => {
    const matchesSearch = [request.requestId, request.wasteCategory, request.city].join(' ').toLowerCase().includes(search);
    return matchesSearch && (!status || request.status === status);
  });

  list.innerHTML = requests.map((request) => `
    <article class="history-card">
      <div class="history-card-main">
        <div><span class="history-id">${escapeHtml(request.requestId)}</span><span class="status-badge status-${normalizeStatusClass(request.status)}">${escapeHtml(request.status)}</span></div>
        <h3>${escapeHtml(request.wasteCategory)}</h3>
        <p>${escapeHtml(formatDate(request.pickupDate))} · ${escapeHtml(request.timeSlot)}</p>
      </div>
      <div class="history-card-meta"><span>${escapeHtml(request.city || request.address || 'Location not set')}</span><small>Created ${escapeHtml(formatDate(request.createdAt))}</small></div>
      <a class="secondary-btn history-view" href="http://localhost:3003/?id=${encodeURIComponent(request.requestId)}">View details</a>
    </article>`).join('');

  const empty = document.getElementById('historyEmpty');
  if (empty) {
    empty.hidden = requests.length > 0;
    empty.textContent = trackHistoryCache.length && (search || status)
      ? 'No saved requests match these filters.'
      : unavailableHistoryCount
        ? 'Some saved requests are no longer available in the current service.'
        : 'No requests are saved in this browser yet.';
  }
}

async function loadTrackHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;

  const loading = document.getElementById('historyLoading');
  const empty = document.getElementById('historyEmpty');
  const error = document.getElementById('historyError');
  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  if (error) error.hidden = true;

  try {
    const savedIds = JSON.parse(localStorage.getItem('ecopickup.requestIds') || '[]');
    if (!Array.isArray(savedIds) || !savedIds.length) {
      trackHistoryCache = [];
      unavailableHistoryCount = 0;
      renderTrackHistory();
      return;
    }

    const validIds = savedIds.filter((requestId) => typeof requestId === 'string' && /^EP-[A-Z0-9]{6}$/i.test(requestId)).slice(0, 12);
    const requests = await Promise.all(validIds.map(async (requestId) => {
      const response = await apiFetch(`/api/pickup-requests/${encodeURIComponent(requestId)}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Unable to load a saved request.');
      return (await response.json()).request;
    }));
    trackHistoryCache = requests.filter(Boolean);
    unavailableHistoryCount = savedIds.length - trackHistoryCache.length;
    if (unavailableHistoryCount) {
      localStorage.setItem('ecopickup.requestIds', JSON.stringify(trackHistoryCache.map((request) => request.requestId)));
    }
    renderTrackHistory();
  } catch (_error) {
    if (error) {
      error.textContent = 'Saved requests could not be loaded. Check the connection and try again.';
      error.hidden = false;
    }
  } finally {
    if (loading) loading.hidden = true;
  }
}

function bindTrackHistory() {
  const search = document.getElementById('historySearch');
  const status = document.getElementById('historyStatus');
  if (!search || !status) return;

  const query = new URLSearchParams(window.location.search);
  const transferredIds = (query.get('ids') || '').split(',').filter((requestId) => /^EP-[A-Z0-9]{6}$/i.test(requestId));
  transferredIds.reverse().forEach(saveRequestId);
  if (query.has('ids')) {
    query.delete('ids');
    const nextLocation = `${window.location.pathname}${query.size ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextLocation);
  }

  search.addEventListener('input', renderTrackHistory);
  status.addEventListener('change', renderTrackHistory);
  loadTrackHistory();
}

function bindTrackForm() {
  const form = document.getElementById('trackForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const requestIdInput = document.getElementById('requestIdInput');
    const statusBox = document.getElementById('trackStatus');
    const requestId = (requestIdInput.value || '').trim();

    if (!requestId) {
      showStatus(statusBox, 'error', 'Please enter a valid request ID.');
      return;
    }

    showStatus(statusBox, 'success', 'Searching for your request...');

    try {
      const response = await apiFetch(`/api/pickup-requests/${encodeURIComponent(requestId)}`);
      const data = await response.json();
      if (!response.ok) {
        showStatus(statusBox, 'error', data.message || 'Request not found.');
        return;
      }

      renderTrackingResult(data.request);
      showStatus(statusBox, 'success', `Request ${data.request.requestId} is available.`);
    } catch (_error) {
      showStatus(statusBox, 'error', 'Unable to track this request right now.');
    }
  });

  const requestId = new URLSearchParams(window.location.search).get('id');
  if (requestId) {
    const input = document.getElementById('requestIdInput');
    input.value = requestId;
    form.requestSubmit();
  }
}

function generateAdminKpis(stats) {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;

  const total = Number(stats.total) || 0;
  const active = (Number(stats.accepted) || 0) + (Number(stats.scheduled) || 0) + (Number(stats.pickedUp) || 0);
  const icons = [
    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5m8-5v5"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M3 12h4l3 7 4-14 3 7h4"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  ];
  const items = [
    { key: 'total', label: 'Total Requests', value: total, detail: 'All recorded pickups' },
    { key: 'pending', label: 'Pending', value: Number(stats.pending) || 0, detail: 'Awaiting review' },
    { key: 'active', label: 'Active Pickups', value: active, detail: 'Accepted, scheduled or picked up' },
    { key: 'completed', label: 'Completed', value: Number(stats.completed) || 0, detail: 'Marked complete' },
  ];

  grid.innerHTML = items
    .map(
      (item, index) => `
        <div class="kpi-card kpi-${item.key}">
          <div class="kpi-card-top"><span class="kpi-icon" aria-hidden="true">${icons[index]}</span><h3>${item.label}</h3></div>
          <div class="kpi-value">${item.value}</div>
          <p>${item.detail}</p>
        </div>
      `,
    )
    .join('');

  const pendingCount = document.getElementById('pendingCountBadge');
  if (pendingCount) pendingCount.textContent = String(Number(stats.pending) || 0);
}

function drawCharts(stats, requests, rangeDays = activityRangeDays) {
  const canvases = ['categoryChart', 'activityChart']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (typeof Chart === 'undefined') {
    canvases.forEach((canvas) => {
      if (!canvas.nextElementSibling?.classList.contains('chart-unavailable')) {
        canvas.insertAdjacentHTML('afterend', '<p class="chart-unavailable">Chart library unavailable. Request totals remain available above.</p>');
      }
    });
    return;
  }

  canvases.forEach((canvas) => Chart.getChart?.(canvas)?.destroy());
  const categoryEntries = Object.entries(stats.categories || {}).sort((first, second) => second[1] - first[1]);
  const categoryLabels = categoryEntries.length ? categoryEntries.map(([label]) => label) : ['No requests yet'];
  const categoryValues = categoryEntries.length ? categoryEntries.map(([, value]) => Number(value) || 0) : [0];
  const days = [7, 30, 90].includes(Number(rangeDays)) ? Number(rangeDays) : 30;
  const intervalDays = days === 90 ? 7 : 1;
  const bucketCount = Math.ceil(days / intervalDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: bucketCount }, () => ({ completed: 0, active: 0, pending: 0 }));
  (requests || []).forEach((request) => {
    const createdAt = new Date(request.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    createdAt.setHours(0, 0, 0, 0);
    const ageDays = Math.floor((today.getTime() - createdAt.getTime()) / 86400000);
    if (ageDays < 0 || ageDays >= days) return;
    const bucketIndex = Math.floor((days - 1 - ageDays) / intervalDays);
    const bucket = buckets[bucketIndex];
    if (request.status === 'Completed') bucket.completed += 1;
    else if (request.status === 'Pending') bucket.pending += 1;
    else if (['Accepted', 'Scheduled', 'Picked Up'].includes(request.status)) bucket.active += 1;
  });
  const labels = buckets.map((_bucket, index) => {
    const distanceFromToday = days - 1 - index * intervalDays;
    const date = new Date(today);
    date.setDate(date.getDate() - distanceFromToday);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  const categoryCtx = document.getElementById('categoryChart');
  const activityCtx = document.getElementById('activityChart');

  if (categoryCtx) {
    new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: categoryLabels,
        datasets: [{
          data: categoryValues,
          backgroundColor: ['#32966c', '#258f8c', '#658c70', '#c68838', '#bd5360', '#55756b'],
          borderWidth: 0,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true, padding: 16 } } } },
    });
  }

  if (activityCtx) {
    new Chart(activityCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Completed', data: buckets.map((bucket) => bucket.completed), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.35, pointRadius: 2, pointHoverRadius: 4 },
          { label: 'Active', data: buckets.map((bucket) => bucket.active), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.06)', fill: true, tension: 0.35, pointRadius: 2, pointHoverRadius: 4 },
          { label: 'Pending', data: buckets.map((bucket) => bucket.pending), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.04)', fill: false, tension: 0.35, pointRadius: 2, pointHoverRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#171e2b', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#f8fafc', bodyColor: '#cbd5e1' } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', maxTicksLimit: days === 7 ? 7 : 8 } },
          y: { beginAtZero: true, ticks: { precision: 0, color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        },
      },
    });
  }
}

async function updateRequestStatus(requestId, nextStatus) {
  const response = await apiFetch(`/api/admin/requests/${encodeURIComponent(requestId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: nextStatus }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to update request status.');
  showToast(data.message || 'Request status updated.');
  await loadAdminData();
}

function renderAdminTable(requests) {
  const tableBody = document.getElementById('adminTableBody');
  if (!tableBody) return;
  const requestCount = document.getElementById('requestCount');
  if (requestCount) requestCount.textContent = `Showing ${requests.length} of ${adminRequestsCache.length} requests`;

  if (!requests.length) {
    const hasRequests = adminRequestsCache.length > 0;
    tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">${hasRequests ? 'No requests match these filters.' : 'No pickup requests have been submitted yet.'}</div></td></tr>`;
    return;
  }

  tableBody.innerHTML = requests
    .map((request) => {
      const statusBadge = `status-${normalizeStatusClass(request.status)}`;
      const selectOptions = statusOrder
        .map((status) => `<option value="${status}" ${status === request.status ? 'selected' : ''}>${status}</option>`)
        .join('');
      const location = [request.address, request.city, request.pincode].filter(Boolean).join(', ');
      const requestId = escapeHtml(request.requestId);

      return `
        <tr>
          <td data-label="Request ID"><strong>${requestId}</strong></td>
          <td data-label="User"><div><strong>${escapeHtml(request.fullName)}</strong></div><div class="table-secondary">${escapeHtml(request.email)}</div></td>
          <td data-label="Waste type">${escapeHtml(request.wasteCategory)}</td>
          <td data-label="Location"><span class="table-location">${escapeHtml(location)}</span></td>
          <td data-label="Pickup date">${escapeHtml(formatDate(request.pickupDate))}</td>
          <td data-label="Time slot">${escapeHtml(request.timeSlot)}</td>
          <td data-label="Status"><span class="status-badge ${statusBadge}">${escapeHtml(request.status)}</span></td>
          <td data-label="Actions">
            <div class="action-row">
              <button class="small-btn" data-view-id="${requestId}" type="button" aria-label="View request ${requestId}">Details</button>
              <select class="inline-select" data-status-id="${requestId}" aria-label="Set status for ${requestId}">${selectOptions}</select>
              <button class="small-btn" data-update-id="${requestId}" type="button">Update</button>
              <button class="small-btn danger" data-delete-id="${requestId}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  tableBody.querySelectorAll('[data-update-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.getAttribute('data-update-id');
      const select = document.querySelector(`[data-status-id="${requestId}"]`);
      const nextStatus = select?.value;
      if (!nextStatus) return;

      button.disabled = true;
      try {
        await updateRequestStatus(requestId, nextStatus);
      } catch (error) {
        showToast(error.message || 'Unable to update request status.', 'error');
        button.disabled = false;
      }
    });
  });

  tableBody.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const requestId = button.getAttribute('data-delete-id');
      if (!window.confirm(`Delete request ${requestId}?`)) {
        return;
      }

      try {
        const response = await apiFetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to delete request.');
        showToast(data.message || 'Request deleted.');
        await loadAdminData();
      } catch (error) {
        showToast(error.message || 'Unable to delete request.', 'error');
      }
    });
  });

  tableBody.querySelectorAll('[data-view-id]').forEach((button) => {
    button.addEventListener('click', () => showRequestDetails(button.getAttribute('data-view-id')));
  });
}

function showRequestDetails(requestId) {
  const request = adminRequestsCache.find((item) => item.requestId === requestId);
  const dialog = document.getElementById('requestDetailsDialog');
  const body = document.getElementById('requestDetailsBody');
  if (!request || !dialog || !body) return;

  const fields = [
    ['Request ID', request.requestId],
    ['Customer', request.fullName],
    ['Email', request.email],
    ['Phone', request.phone],
    ['Waste type', request.wasteCategory],
    ['Description', request.wasteDescription],
    ['Quantity', request.quantity],
    ['Pickup location', [request.address, request.city, request.pincode].filter(Boolean).join(', ')],
    ['Pickup date', formatDate(request.pickupDate)],
    ['Time slot', request.timeSlot],
    ['Status', request.status],
    ['Instructions', request.instructions || 'No additional instructions'],
    ['Created', formatDate(request.createdAt)],
  ];
  body.replaceChildren();
  fields.forEach(([label, value]) => {
    const item = document.createElement('div');
    const labelElement = document.createElement('span');
    const valueElement = document.createElement('strong');
    item.className = 'detail-item';
    labelElement.textContent = label;
    valueElement.textContent = value || '—';
    item.append(labelElement, valueElement);
    body.appendChild(item);
  });

  const timeline = document.getElementById('detailsTimeline');
  if (timeline) {
    const stages = ['Pending', 'Accepted', 'Scheduled', 'Picked Up', 'Completed'];
    const currentIndex = stages.indexOf(request.status);
    timeline.innerHTML = stages.map((status, index) => {
      const isPast = currentIndex >= 0 && index < currentIndex;
      const isCurrent = index === currentIndex;
      return `<div class="detail-timeline-step ${isPast ? 'is-past' : ''} ${isCurrent ? 'is-current' : ''}"><span>${isPast ? '✓' : index + 1}</span><strong>${escapeHtml(status)}</strong></div>`;
    }).join('');
    timeline.setAttribute('aria-label', `Current lifecycle position: ${request.status}. Historical transition times are not recorded.`);
  }

  const actions = document.getElementById('detailActions');
  if (actions) {
    const availableActions = [
      ['Accepted', 'Accept'],
      ['Scheduled', 'Schedule'],
      ['Picked Up', 'Mark Picked Up'],
      ['Completed', 'Complete'],
      ['Cancelled', 'Cancel'],
    ];
    actions.replaceChildren();
    availableActions.forEach(([status, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = status === 'Cancelled' ? 'small-btn danger' : 'small-btn';
      button.textContent = label;
      button.disabled = request.status === status;
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await updateRequestStatus(request.requestId, status);
          dialog.close();
        } catch (error) {
          showToast(error.message || 'Unable to update request status.', 'error');
          button.disabled = false;
        }
      });
      actions.appendChild(button);
    });
  }
  dialog.showModal();
}

function bindAdminDetails() {
  const dialog = document.getElementById('requestDetailsDialog');
  document.getElementById('closeDetails')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function updateAdminGreeting() {
  const greeting = document.getElementById('adminGreeting');
  if (!greeting) return;
  const hour = new Date().getHours();
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  greeting.textContent = `${salutation}, Admin`;
}

async function checkServiceHealth() {
  const label = document.getElementById('systemStatusText');
  if (!label) return;
  const status = document.getElementById('systemStatus');
  const sidebarText = document.getElementById('sidebarConnectionText');
  const sidebarDot = document.getElementById('sidebarConnectionDot');
  try {
    const response = await apiFetch('/api/health');
    if (!response.ok) throw new Error('Service unavailable');
    label.textContent = 'System Operational';
    if (sidebarText) sidebarText.textContent = 'Connected';
    status?.classList.add('is-online');
    status?.classList.remove('is-offline');
    sidebarDot?.classList.add('is-online');
    sidebarDot?.classList.remove('is-offline');
  } catch (_error) {
    label.textContent = 'Service Offline';
    if (sidebarText) sidebarText.textContent = 'Unavailable';
    status?.classList.add('is-offline');
    status?.classList.remove('is-online');
    sidebarDot?.classList.add('is-offline');
    sidebarDot?.classList.remove('is-online');
  }
}

function bindAdminDashboardControls() {
  const dashboard = document.getElementById('adminDashboard');
  if (!dashboard) return;

  document.querySelectorAll('[data-range-days]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.rangeDays) === activityRangeDays));
    button.addEventListener('click', () => {
      activityRangeDays = Number(button.dataset.rangeDays);
      document.querySelectorAll('[data-range-days]').forEach((rangeButton) => {
        const isActive = Number(rangeButton.dataset.rangeDays) === activityRangeDays;
        rangeButton.classList.toggle('active', isActive);
        rangeButton.setAttribute('aria-pressed', String(isActive));
      });
      const rangeLabel = document.getElementById('activityRangeLabel');
      if (rangeLabel) rangeLabel.textContent = `Last ${activityRangeDays} days`;
      drawCharts(adminStatsCache, adminRequestsCache, activityRangeDays);
    });
  });

  const resetFilters = () => {
    ['adminSearch', 'adminCategoryFilter', 'adminStatusFilter', 'adminDateFilter'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    renderAdminTable(filterAdminRequests());
  };

  document.getElementById('clearAdminFilters')?.addEventListener('click', resetFilters);
  document.getElementById('adminNotificationBtn')?.addEventListener('click', () => {
    resetFilters();
    const statusFilter = document.getElementById('adminStatusFilter');
    if (statusFilter) statusFilter.value = 'Pending';
    renderAdminTable(filterAdminRequests());
    document.getElementById('requestsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const helpDialog = document.getElementById('dashboardHelpDialog');
  document.getElementById('dashboardHelpBtn')?.addEventListener('click', () => helpDialog?.showModal());
  document.getElementById('closeDashboardHelp')?.addEventListener('click', () => helpDialog?.close());

  const menuToggle = document.getElementById('adminMenuToggle');
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('adminSidebarBackdrop');
  if (!menuToggle || !sidebar || !backdrop) return;

  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open admin navigation');
  };
  const openMenu = () => {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close admin navigation');
  };

  menuToggle.addEventListener('click', () => (menuToggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu()));
  backdrop.addEventListener('click', closeMenu);
  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      sidebar.querySelectorAll('a[href^="#"]').forEach((navLink) => navLink.classList.toggle('active', navLink === link));
      closeMenu();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      helpDialog?.close();
    }
  });
}

async function loadAdminData() {
  const adminDashboard = document.getElementById('adminDashboard');
  const loginCard = document.getElementById('adminLoginCard');
  const loading = document.getElementById('adminLoading');
  const errorBox = document.getElementById('adminError');
  if (loading) loading.hidden = false;
  if (errorBox) errorBox.hidden = true;
  adminDashboard?.classList.add('visible');

  try {
    const response = await apiFetch('/api/admin/requests', { method: 'GET', headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        if (loginCard) loginCard.style.display = 'block';
        const pageIntro = document.getElementById('adminPageIntro');
        if (pageIntro) pageIntro.style.display = 'block';
        adminDashboard?.classList.remove('visible');
        return;
      }
      throw new Error(data.message || 'Unable to load pickup requests.');
    }

    adminRequestsCache = Array.isArray(data.requests) ? data.requests : [];
    adminStatsCache = data.stats || {};
    generateAdminKpis(adminStatsCache);
    updateAdminCategoryFilter();
    renderAdminTable(filterAdminRequests());
    drawCharts(adminStatsCache, adminRequestsCache);

    if (loginCard) loginCard.style.display = 'none';
    const pageIntro = document.getElementById('adminPageIntro');
    if (pageIntro) pageIntro.style.display = 'none';
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = error.message || 'Unable to load pickup requests. Try again.';
      errorBox.hidden = false;
    }
  } finally {
    if (loading) loading.hidden = true;
  }
}

function filterAdminRequests() {
  const search = (document.getElementById('adminSearch')?.value || '').trim().toLowerCase();
  const category = document.getElementById('adminCategoryFilter')?.value || '';
  const status = document.getElementById('adminStatusFilter')?.value || '';
  const pickupDate = document.getElementById('adminDateFilter')?.value || '';

  const filteredRequests = adminRequestsCache.filter((request) => {
    const searchable = [request.requestId, request.fullName, request.email, request.wasteCategory, request.address, request.city, request.pincode]
      .join(' ')
      .toLowerCase();
    return (!search || searchable.includes(search))
      && (!category || request.wasteCategory === category)
      && (!status || request.status === status)
      && (!pickupDate || request.pickupDate === pickupDate);
  });

  const valueForSort = (request) => {
    if (adminSortKey === 'city') return request.city || request.address || '';
    if (adminSortKey === 'pickupDate') return request.pickupDate || '';
    if (adminSortKey === 'createdAt') return request.createdAt || '';
    return request[adminSortKey] || '';
  };
  return filteredRequests.sort((first, second) => String(valueForSort(first)).localeCompare(String(valueForSort(second)), undefined, { numeric: true, sensitivity: 'base' }) * adminSortDirection);
}

function updateAdminCategoryFilter() {
  const filter = document.getElementById('adminCategoryFilter');
  if (!filter) return;

  const selected = filter.value;
  filter.replaceChildren(new Option('All waste types', ''));
  [...new Set(adminRequestsCache.map((request) => request.wasteCategory).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second))
    .forEach((category) => filter.add(new Option(category, category)));
  filter.value = selected;
}

function bindAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('adminEmail')?.value || '';
    const password = document.getElementById('adminPassword')?.value || '';
    const statusBox = document.getElementById('adminLoginStatus');

    if (!email.trim() || !password) {
      showStatus(statusBox, 'error', 'Enter your administrator email and password.');
      return;
    }

    showStatus(statusBox, 'success', 'Authenticating as admin...');

    try {
      const response = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showStatus(statusBox, 'error', data.message || 'Admin login failed.');
        return;
      }

      showStatus(statusBox, 'success', data.message || 'Admin login successful.');
      await loadAdminData();
    } catch (_error) {
      showStatus(statusBox, 'error', 'Unable to login at this time.');
    }
  });

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn?.addEventListener('click', async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
      const loginCard = document.getElementById('adminLoginCard');
      const adminDashboard = document.getElementById('adminDashboard');
      if (loginCard) loginCard.style.display = 'block';
      if (adminDashboard) adminDashboard.classList.remove('visible');
      showToast('You have signed out.');
    } catch (_error) {
      showToast('Unable to sign out right now.', 'error');
    }
  });
}

function setupAdminSearch() {
  ['adminSearch', 'adminCategoryFilter', 'adminStatusFilter', 'adminDateFilter'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener(id === 'adminSearch' ? 'input' : 'change', () => renderAdminTable(filterAdminRequests()));
  });
}

function setupAdminSort() {
  document.querySelectorAll('[data-sort-key]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sortKey;
      adminSortDirection = key === adminSortKey ? adminSortDirection * -1 : 1;
      adminSortKey = key;
      document.querySelectorAll('[data-sort-key]').forEach((sortButton) => {
        const isActive = sortButton === button;
        const header = sortButton.closest('th');
        const indicator = sortButton.querySelector('span');
        if (header) header.setAttribute('aria-sort', isActive ? (adminSortDirection === 1 ? 'ascending' : 'descending') : 'none');
        if (indicator) indicator.textContent = isActive ? (adminSortDirection === 1 ? '↑' : '↓') : '↕';
      });
      renderAdminTable(filterAdminRequests());
    });
  });
}

function bootstrap() {
  bindSiteNav();
  bindSectionReveals();
  bindHomeImpactStats();
  bindPickupForm();
  bindTrackForm();
  bindTrackHistory();
  bindAdminLogin();
  setupAdminSearch();
  setupAdminSort();

  bindAdminDetails();
  bindAdminDashboardControls();
  updateAdminGreeting();
  checkServiceHealth();

  if (document.getElementById('adminDashboard')) {
    apiFetch('/api/admin/session')
      .then((response) => response.json())
      .then((data) => {
        const adminDashboard = document.getElementById('adminDashboard');
        const loginCard = document.getElementById('adminLoginCard');
        if (data.authenticated) {
          if (loginCard) loginCard.style.display = 'none';
          if (adminDashboard) adminDashboard.classList.add('visible');
          loadAdminData();
        }
      })
      .catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
