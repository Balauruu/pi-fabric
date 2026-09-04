'use strict';

(() => {
  // Remove the one-time fragment synchronously, before the first asynchronous
  // operation. The token remains only in this script closure until exchange.
  const bootstrapToken = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (bootstrapToken) history.replaceState(null, '', `${location.pathname}${location.search}`);

  const ROUTES = [
    ['overview', 'Overview'], ['tree', 'Tree'], ['attempts', 'Attempts'], ['compare', 'Comparisons'],
    ['metrics', 'Metrics'], ['timeline', 'Events'], ['resources', 'Resources'], ['promotion', 'Promotion'],
    ['report', 'Report'], ['contract', 'Contract'],
  ];
  const INTENTS = [
    ['pause', 'Pause'], ['resume', 'Resume'], ['answerGate', 'Answer gate'], ['cancel', 'Cancel'], ['pinHypothesis', 'Pin hypothesis'],
    ['pruneHypothesis', 'Prune hypothesis'], ['retryAttempt', 'Retry attempt'], ['requestPromotion', 'Request promotion'],
    ['requestRollback', 'Request rollback'], ['requestReport', 'Request report'], ['requestCleanup', 'Request cleanup'],
  ];
  const ROW_IDENTITIES = ['runId', 'attemptId', 'hypothesisId', 'candidateId', 'certificateId', 'effectId', 'observationId', 'promotionId', 'generationId', 'cleanupId', 'budgetReservationId', 'childId', 'workspaceId', 'constructionId', 'gateId', 'artifactId', 'path', 'role', 'kind', 'type', 'state'];
  const byId = (id) => document.getElementById(id);
  const state = { csrf: '', runId: '', revision: 0, cursor: 0, page: 'runs', eventSource: null, loading: false, stale: false, drawerOpen: false, drawerReturnFocus: null };
  const mobile = matchMedia('(max-width: 48rem)');

  function element(name, text, className) {
    const node = document.createElement(name);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function announce(message) {
    const region = byId('announcer');
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }

  function showNotice(message, error = false) {
    const notice = byId('notice');
    notice.textContent = message;
    notice.classList.toggle('error', error);
    notice.setAttribute('role', error ? 'alert' : 'status');
    notice.hidden = false;
  }

  function clearNotice() {
    const notice = byId('notice');
    notice.textContent = '';
    notice.hidden = true;
    notice.classList.remove('error');
    notice.setAttribute('role', 'status');
  }

  function captureFocus() {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.id) return null;
    return {
      id: active.id,
      start: 'selectionStart' in active && typeof active.selectionStart === 'number' ? active.selectionStart : null,
      end: 'selectionEnd' in active && typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
    };
  }

  function restoreFocus(snapshot) {
    if (!snapshot) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== byId('main') && active.isConnected) return;
    const target = byId(snapshot.id);
    if (!(target instanceof HTMLElement) || target.hidden || target.closest('[hidden]')) return;
    target.focus({ preventScroll: true });
    if (snapshot.start !== null && 'setSelectionRange' in target) target.setSelectionRange(snapshot.start, snapshot.end);
  }

  function updateActionAvailability() {
    const button = byId('submit-intent');
    const reason = byId('intent-disabled-reason');
    const disabled = state.loading || state.stale || !state.runId || !state.csrf;
    button.disabled = disabled;
    button.title = state.stale ? 'Reconnect to authoritative data before submitting an intent' : (disabled ? 'Intent submission is unavailable until authoritative data is ready' : '');
    if (state.loading) reason.textContent = 'Intent submission is disabled while the authoritative projection is loading.';
    else if (state.stale) reason.textContent = 'Intent submission is disabled because displayed data may be stale. Retry the connection first.';
    else if (!state.runId || !state.csrf) reason.textContent = 'Intent submission requires an authenticated run view.';
    else reason.textContent = '';
    reason.hidden = !disabled;
    button.setAttribute('aria-describedby', disabled ? 'intent-disabled-reason' : 'intent-help');
  }

  function setBusy(busy, message = 'Loading authoritative data…') {
    state.loading = busy;
    byId('main').setAttribute('aria-busy', String(busy));
    const loading = byId('loading-status'); loading.hidden = !busy; loading.textContent = busy ? message : '';
    byId('refresh').disabled = busy;
    byId('refresh').title = busy ? 'Authoritative data is already loading' : '';
    byId('refresh').setAttribute('aria-describedby', busy ? 'loading-status' : 'refresh-help');
    byId('retry-connection').disabled = busy;
    updateActionAvailability();
  }

  async function request(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', ...options });
    const type = response.headers.get('content-type') || '';
    const value = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = value && typeof value === 'object' && typeof value.message === 'string' ? value.message : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return value;
  }

  async function bootstrap(token) {
    if (!token) return;
    const value = await request('/api/v1/session/bootstrap', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: 1, token }),
    });
    state.csrf = value.csrfToken;
  }

  async function session() {
    const value = await request('/api/v1/session');
    state.csrf = value.csrfToken;
    byId('driver-status').textContent = value.driverStatus;
  }

  function parseRoute() {
    if (location.pathname === '/' || location.pathname === '/runs') return { page: 'runs' };
    const attempt = /^\/runs\/([a-z][a-z0-9_]{2,63})\/attempts\/([a-z][a-z0-9_]{2,63})$/.exec(location.pathname);
    if (attempt) return { page: 'attemptDetail', runId: attempt[1], attemptId: attempt[2] };
    const overview = /^\/runs\/([a-z][a-z0-9_]{2,63})$/.exec(location.pathname);
    if (overview) return { page: 'overview', runId: overview[1] };
    const run = /^\/runs\/([a-z][a-z0-9_]{2,63})\/(overview|tree|attempts|compare|metrics|timeline|resources|promotion|report|contract)$/.exec(location.pathname);
    return run ? { page: run[2], runId: run[1] } : { page: 'notFound' };
  }

  function setBreadcrumbs(parts) {
    const nav = byId('breadcrumbs'); const list = element('ol');
    parts.forEach((part, index) => {
      const item = element('li');
      if (part.href && index < parts.length - 1) { const link = element('a', part.label); link.href = part.href; item.append(link); }
      else { item.textContent = part.label; if (index === parts.length - 1) item.setAttribute('aria-current', 'page'); }
      list.append(item);
    });
    nav.replaceChildren(list);
  }

  function configureRunNav(runId, page) {
    const nav = byId('run-navigation'); nav.hidden = false; nav.replaceChildren();
    ROUTES.forEach(([slug, label]) => {
      const link = element('a', label); link.href = slug === 'overview' ? `/runs/${runId}` : `/runs/${runId}/${slug}`;
      if (page === slug || (page === 'attemptDetail' && slug === 'attempts')) link.setAttribute('aria-current', 'page');
      nav.append(link);
    });
  }

  function setSummary(entries) {
    const cards = byId('summary-cards'); cards.replaceChildren();
    entries.forEach(([label, value]) => {
      const card = element('div', undefined, 'card');
      card.append(element('dt', label), element('dd', value === undefined || value === null ? 'Not available' : value));
      cards.append(card);
    });
  }

  function simple(value) {
    if (value === null) return 'None';
    if (value === undefined) return 'Not available';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return JSON.stringify(value);
  }

  function objectRecord(value, depth = 0) {
    const record = element('dl', undefined, 'record');
    Object.entries(value).forEach(([key, item]) => {
      record.append(element('dt', key.replace(/([A-Z])/g, ' $1')));
      const definition = element('dd');
      if (item && typeof item === 'object' && !Array.isArray(item) && depth < 2) definition.append(objectRecord(item, depth + 1));
      else definition.append(element('pre', simple(item), 'code-value'));
      record.append(definition);
    });
    return record;
  }

  function table(values, captionText, links) {
    if (!Array.isArray(values) || values.length === 0) return element('p', `No ${captionText.toLowerCase()} recorded.`, 'empty');
    const sourceKeys = [...new Set(values.flatMap((item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.keys(item) : ['value']))];
    const rowHeaderKey = ROW_IDENTITIES.find((key) => sourceKeys.includes(key)) || sourceKeys.find((key) => key !== 'version') || sourceKeys[0];
    const keys = [rowHeaderKey, ...sourceKeys.filter((key) => key !== rowHeaderKey)];
    const wrapper = element('div', undefined, 'table-scroll table-wrap'); wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', `${captionText}, horizontally scrollable when needed`);
    const tableNode = element('table'); tableNode.append(element('caption', captionText));
    const head = element('thead'); const headRow = element('tr'); keys.forEach((key) => { const heading = element('th', key.replace(/([A-Z])/g, ' $1')); heading.setAttribute('scope', 'col'); headRow.append(heading); }); head.append(headRow); tableNode.append(head);
    const body = element('tbody');
    values.forEach((item) => {
      const row = element('tr');
      keys.forEach((key, index) => {
        const cell = element(index === 0 ? 'th' : 'td'); if (index === 0) cell.setAttribute('scope', 'row');
        const raw = item && typeof item === 'object' && !Array.isArray(item) ? item[key] : item;
        const href = links ? links(item, key) : '';
        if (href) { const link = element('a', simple(raw)); link.href = href; cell.append(link); }
        else cell.append(element('pre', simple(raw), 'code-value'));
        row.append(cell);
      });
      body.append(row);
    });
    tableNode.append(body); wrapper.append(tableNode); return wrapper;
  }

  function renderData(data, page) {
    const root = byId('detail-content'); root.replaceChildren();
    const preferred = page === 'attemptDetail' ? ['attempt', 'workerClaim', 'candidate', 'certificates', 'effects', 'observations'] : Object.keys(data || {});
    preferred.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(data || {}, key)) return;
      const value = data[key]; const heading = element('h3', key.replace(/([A-Z])/g, ' $1')); root.append(heading);
      if (Array.isArray(value)) {
        const linkFactory = key === 'attempts' && state.runId ? (item, field) => field === 'attemptId' && item && item.attemptId ? `/runs/${state.runId}/attempts/${item.attemptId}` : '' : undefined;
        root.append(table(value, key, linkFactory));
      } else if (value && typeof value === 'object') root.append(objectRecord(value));
      else root.append(element('p', simple(value)));
    });
    if (!data || preferred.every((key) => !Object.prototype.hasOwnProperty.call(data, key))) root.append(element('p', 'No details recorded.', 'empty'));
  }

  function renderMetrics(data) {
    const certificates = Array.isArray(data.certificates) ? data.certificates : [];
    const section = byId('visualization'); const figure = byId('metric-figure'); const empty = byId('visualization-empty'); const bars = byId('metric-bars');
    section.hidden = false; bars.replaceChildren();
    if (certificates.length === 0) { figure.hidden = true; empty.hidden = false; empty.textContent = 'No canonical metric values are available for visualization.'; return; }
    figure.hidden = false; empty.hidden = true;
    const values = certificates.map((certificate) => { try { return BigInt(certificate.aggregateUnits || '0'); } catch { return 0n; } });
    const maximum = values.reduce((max, value) => (value < 0n ? -value : value) > max ? (value < 0n ? -value : value) : max, 1n);
    certificates.forEach((certificate, index) => {
      const absolute = values[index] < 0n ? -values[index] : values[index]; const width = 20 + Number((absolute * 80n) / maximum);
      const bar = element('div', `${certificate.role}: ${certificate.aggregateUnits}`, 'metric-bar'); bar.style.width = `${width}%`; bars.append(bar);
    });
  }

  function endpoint(route) {
    const base = `/api/v1/runs/${route.runId}`;
    return {
      overview: base, tree: `${base}/tree`, attempts: `${base}/attempts`, attemptDetail: `${base}/attempts/${route.attemptId}`,
      compare: `${base}/comparisons`, metrics: `${base}/metrics`, timeline: `${base}/events?after=0&limit=200`, resources: `${base}/resources`,
      promotion: `${base}/promotions`, report: `${base}/report`, contract: `${base}/contract`,
    }[route.page];
  }

  function updateIntentFields() {
    const isGate = byId('intent-kind').value === 'answerGate';
    byId('gate-answer').hidden = !isGate; byId('gate-answer-kind').disabled = !isGate; byId('gate-answer-value').disabled = !isGate;
  }

  function configureIntents() {
    const section = byId('actions'); section.hidden = false; const select = byId('intent-kind');
    if (select.options.length === 0) INTENTS.forEach(([value, label]) => { const option = element('option', label); option.value = value; select.append(option); });
    updateIntentFields(); updateActionAvailability();
  }

  function setConnection(message, stale) {
    state.stale = stale; const status = byId('connection-status'); status.textContent = message; status.dataset.state = stale ? 'stale' : 'current';
    byId('retry-connection').hidden = !stale; updateActionAvailability();
  }

  async function renderRuns() {
    state.eventSource?.close(); state.eventSource = null; state.page = 'runs'; state.runId = ''; state.stale = false;
    byId('run-navigation').hidden = true; byId('actions').hidden = true; byId('connection').hidden = true; byId('visualization').hidden = true;
    byId('page-title').textContent = 'Runs'; byId('page-kicker').textContent = 'Durable repository authorities'; setBreadcrumbs([{ label: 'Runs' }]);
    const response = await request('/api/v1/runs?limit=100'); const runs = response.runs || [];
    setSummary([['Run count', runs.length], ['Driver mode', 'Detached read and inbox only'], ['Product state', 'B1 real Fabric execution blocked']]);
    byId('detail-content').replaceChildren(table(runs, 'Durable runs', (item, key) => key === 'runId' ? `/runs/${item.runId}` : ''));
  }

  async function renderRun(route) {
    state.page = route.page; state.runId = route.runId; configureRunNav(route.runId, route.page); configureIntents(); byId('connection').hidden = false; byId('visualization').hidden = true;
    const label = route.page === 'attemptDetail' ? 'Attempt detail' : (ROUTES.find(([slug]) => slug === route.page) || [route.page, route.page])[1];
    const title = route.page === 'overview' && route.runId === 'run_fixture' ? 'Guided fixture run' : label;
    byId('page-title').textContent = title; byId('page-kicker').textContent = route.runId;
    setBreadcrumbs([{ label: 'Runs', href: '/runs' }, { label: route.runId, href: `/runs/${route.runId}` }, { label: title }]);
    const response = await request(endpoint(route)); state.revision = response.revision ?? response.projection?.revision ?? state.revision; state.cursor = response.cursor ?? response.page?.nextSequence ?? state.cursor;
    const data = route.page === 'timeline'
      ? { summary: response.projection?.data?.summary || {}, events: response.page?.events || [], cursor: response.cursor, floor: response.floor, resetRequired: response.kind === 'reset' }
      : (response.data || response.projection?.data || response);
    const summary = data.summary || response.summary || data;
    setSummary([
      ['Run ID', route.runId], ['State', summary.state || data.state || 'See details'],
      ['Outcome', summary.outcome || data.outcome || 'Pending'], ['Revision', response.revision ?? response.projection?.revision ?? state.revision],
      ['Sequence', response.cursor ?? response.page?.nextSequence ?? state.cursor], ['Trust', summary.trust || data.trust || 'See evidence'],
    ]);
    renderData(data, route.page);
    if (route.page === 'tree') {
      const collections = Object.values(data).filter(Array.isArray);
      if (collections.length > 0 && collections.every((items) => items.length === 0)) byId('detail-content').prepend(element('p', 'No lineage is available for this run.', 'empty'));
    }
    if (route.page === 'metrics') renderMetrics(data); connectEvents();
  }

  function connectEvents() {
    if (!state.runId || !window.EventSource) { setConnection('Live events are unavailable. Data may be stale. Use Retry to request an authoritative refresh.', true); return; }
    if (state.eventSource) return;
    setConnection('Connecting to durable event stream. Data may be stale until catch-up completes.', true);
    const stream = new EventSource(`/api/v1/stream?runId=${state.runId}&cursor=${state.cursor}`); state.eventSource = stream;
    stream.addEventListener('open', () => { setConnection('Connected to durable event stream', false); announce('Live durable event connection restored.'); });
    stream.addEventListener('arbor-event', (event) => {
      try {
        const value = JSON.parse(event.data); state.cursor = value.event.sequence; state.revision = value.projection?.revision ?? state.revision;
        setConnection(`Event ${value.event.sequence}: ${value.event.type}`, false); announce(`Durable run data updated at event ${value.event.sequence}.`);
      } catch { setConnection('Received an unreadable event envelope. Data may be stale. Use Retry.', true); }
    });
    stream.addEventListener('reset', (event) => {
      try {
        const value = JSON.parse(event.data); state.cursor = value.cursor; state.revision = value.projection?.revision ?? state.revision;
        announce(`Authoritative projection reset at durable cursor ${value.cursor}.`);
        void render({ announcement: `Projection reset at durable cursor ${value.cursor}. Focus was preserved.` });
      } catch { setConnection('Projection reset was unreadable. Data may be stale. Use Retry.', true); }
    });
    stream.addEventListener('caught-up', () => { setConnection(`Caught up at durable cursor ${state.cursor}`, false); });
    stream.addEventListener('stream-limit', () => { setConnection('The bounded stream ended. Data may be stale. Use Retry to reconnect.', true); });
    stream.addEventListener('arbor-error', () => { setConnection('The stream closed after a validated server error. Data may be stale. Use Retry.', true); });
    stream.addEventListener('error', () => { setConnection('Disconnected. Data may be stale. Use Retry to reconnect and refresh authoritative state.', true); });
  }

  function intentBody() {
    const kind = byId('intent-kind').value; const target = byId('intent-target').value.trim(); const reason = byId('intent-reason').value.trim();
    const body = { version: 1, kind, expectedRevision: state.revision };
    if ((kind === 'pause' || kind === 'cancel') && reason) body.reason = reason;
    if (kind === 'answerGate') {
      const answerKind = byId('gate-answer-kind').value; const answerValue = byId('gate-answer-value').value.trim();
      if (!target) throw new Error('A gate ID is required'); const answer = { version: 1, kind: answerKind, gateId: target };
      if (answerKind === 'confirm') { if (answerValue !== 'true' && answerValue !== 'false') throw new Error('A confirmation answer must be true or false'); answer.value = answerValue === 'true'; }
      else if (answerKind === 'singleChoice') answer.optionId = answerValue;
      else if (answerKind === 'multiChoice') answer.optionIds = answerValue.split(',').map((value) => value.trim()).filter(Boolean);
      else answer.value = answerValue;
      body.answer = answer;
    }
    if (kind === 'pinHypothesis' || kind === 'pruneHypothesis') body.hypothesisId = target;
    if (kind === 'pruneHypothesis') body.reason = reason;
    if (kind === 'retryAttempt') body.attemptId = target;
    if (kind === 'requestPromotion') body.candidateId = target;
    if (kind === 'requestRollback') body.promotionId = target;
    return body;
  }

  async function submitIntent(event) {
    event.preventDefault(); clearNotice();
    try {
      if (!state.runId || !state.csrf) throw new Error('An authenticated run session is required');
      const value = await request(`/api/v1/runs/${state.runId}/intents`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-arbor-csrf': state.csrf, 'idempotency-key': `web_${crypto.randomUUID()}` }, body: JSON.stringify(intentBody()),
      });
      state.revision = value.revision;
      if (value.state === 'REJECTED_STALE') {
        await render();
        showNotice(`Revision mismatch rejected intent ${value.intentId}. Authoritative data was refreshed; no effect was executed.`, true);
      } else showNotice(`Intent ${value.intentId} durably recorded as ${value.state}. No effect was executed by the Web server.`);
    } catch (error) { showNotice(error instanceof Error ? error.message : 'Intent submission failed', true); }
  }

  async function render(options = {}) {
    const focus = captureFocus(); setBusy(true); clearNotice();
    try {
      const route = parseRoute();
      if (route.page === 'notFound') {
        state.eventSource?.close(); state.eventSource = null; state.runId = ''; state.stale = false; byId('actions').hidden = true; byId('connection').hidden = true; byId('visualization').hidden = true;
        byId('page-title').textContent = 'Not found'; setSummary([['Route', 'Not found']]); renderData({ message: 'The requested Arbor view does not exist.' }, route.page);
      } else if (route.page === 'runs') await renderRuns(); else await renderRun(route);
      if (options.announcement) announce(options.announcement);
    } catch (error) {
      state.stale = Boolean(state.runId); updateActionAvailability(); showNotice(error instanceof Error ? error.message : 'Unable to load Arbor', true);
      if (state.runId) setConnection('Refresh failed. Data may be stale. Use Retry to try again.', true);
      throw error;
    } finally { setBusy(false); restoreFocus(focus); }
  }

  function setDrawer(open, restore = true) {
    if (!mobile.matches) open = false;
    state.drawerOpen = open; document.body.classList.toggle('drawer-open', open); const sidebar = byId('sidebar'); const toggle = byId('menu-toggle'); const overlay = byId('drawer-overlay');
    toggle.setAttribute('aria-expanded', String(open)); overlay.hidden = !open;
    if (mobile.matches) {
      sidebar.inert = !open; sidebar.setAttribute('aria-hidden', String(!open)); sidebar.setAttribute('role', open ? 'dialog' : 'navigation');
      if (open) {
        sidebar.setAttribute('aria-modal', 'true'); state.drawerReturnFocus = document.activeElement;
        requestAnimationFrame(() => { if (state.drawerOpen) byId('drawer-close').focus({ preventScroll: true }); });
      }
      else { sidebar.removeAttribute('aria-modal'); if (restore && state.drawerReturnFocus instanceof HTMLElement) state.drawerReturnFocus.focus({ preventScroll: true }); }
    } else { sidebar.inert = false; sidebar.removeAttribute('aria-hidden'); sidebar.setAttribute('role', 'navigation'); sidebar.removeAttribute('aria-modal'); overlay.hidden = true; }
  }

  function syncDrawer() { setDrawer(false, false); }

  byId('refresh').addEventListener('click', () => { void render({ announcement: 'Authoritative data refreshed.' }).catch(() => undefined); });
  byId('retry-connection').addEventListener('click', () => { state.eventSource?.close(); state.eventSource = null; void render({ announcement: 'Authoritative data refreshed and live reconnection requested.' }).catch(() => undefined); });
  byId('intent-kind').addEventListener('change', updateIntentFields);
  byId('intent-form').addEventListener('submit', (event) => { void submitIntent(event); });
  byId('menu-toggle').addEventListener('click', () => setDrawer(!state.drawerOpen));
  byId('drawer-close').addEventListener('click', () => setDrawer(false));
  byId('drawer-overlay').addEventListener('click', () => setDrawer(false));
  byId('sidebar').addEventListener('click', (event) => { if (mobile.matches && event.target instanceof Element && event.target.closest('a')) setDrawer(false, false); });
  mobile.addEventListener('change', syncDrawer);
  document.addEventListener('keydown', (event) => {
    if (!state.drawerOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); setDrawer(false); return; }
    if (event.key !== 'Tab') return;
    const controls = [...byId('sidebar').querySelectorAll('a[href], button:not([disabled])')].filter((node) => !node.hidden);
    if (controls.length === 0) return; const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener('pagehide', () => state.eventSource?.close());

  syncDrawer(); setBusy(true, bootstrapToken ? 'Establishing a local authenticated session' : 'Loading authoritative data…');
  void (async () => {
    try {
      await bootstrap(bootstrapToken); await session();
      if (bootstrapToken && (location.pathname === '/' || location.pathname === '/runs')) {
        const response = await request('/api/v1/runs?limit=100');
        if (response.runs?.length === 1) history.replaceState(null, '', `/runs/${response.runs[0].runId}`);
      }
      await render();
    }
    catch (error) { setBusy(false); showNotice(error instanceof Error ? error.message : 'Unable to load Arbor', true); }
  })();
})();
