// Dashboard front-end (vanilla JS, no build step).

const $ = (id) => document.getElementById(id);
let allQuotations = [];

async function api(path, opts) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts });
  if (res.status === 401) throw { unauthorized: true };
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function fmtInt(n) {
  const v = Number(n);
  return isNaN(v) ? (n ?? '') : v.toLocaleString('vi-VN');
}
function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? ts : d.toLocaleString('vi-VN');
}

function showLoginError() {
  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (!err) return;
  const map = {
    denied: 'Tài khoản không thuộc phạm vi được phép (@pmax.com.vn).',
    auth: 'Đăng nhập thất bại, vui lòng thử lại.',
    config: 'Chưa cấu hình đăng nhập Google (thiếu biến môi trường).',
    nocode: 'Thiếu mã xác thực từ Google.',
  };
  const el = $('login-error');
  el.textContent = map[err] || 'Có lỗi khi đăng nhập.';
  el.classList.remove('hidden');
}

// ---- Rendering ----
function renderStatus(s) {
  $('run-dot').className = 'dot ' + (s.stats.running ? 'busy' : 'on');
  $('run-text').textContent = s.stats.running ? 'Đang quét…' : 'Đang chạy';
  $('mailbox').textContent = s.monitored_mailbox || '';
  $('total-processed').textContent = fmtInt(s.stats.totalProcessed);
  $('total-errors').textContent = fmtInt(s.stats.totalErrors);
  $('last-cycle').textContent = fmtTime(s.stats.lastCycleAt);
  $('last-matched').textContent = fmtInt(s.stats.lastMatched);
  $('test-toggle').checked = !!s.test_mode;
  $('test-text').textContent = s.test_mode ? 'Đang BẬT (an toàn)' : 'ĐÃ TẮT (chạy thật)';
  $('dry-run-sub').textContent = s.test_mode
    ? (s.sheets_dry_run ? 'Ghi Sheet: nháp' : 'Ghi Sheet: thật · Email: chuyển hướng về bạn')
    : 'Gửi email thật cho khách';
}

function renderQuotations(items) {
  const q = ($('search').value || '').toLowerCase().trim();
  const rows = items.filter((it) =>
    !q || (it.customer_name + ' ' + it.product + ' ' + it.customer_email).toLowerCase().includes(q)
  );
  const body = $('q-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Chưa có báo giá nào.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((it) => `
    <tr>
      <td>${fmtTime(it.received_date)}</td>
      <td>${esc(it.customer_name)}</td>
      <td>${esc(it.customer_email)}</td>
      <td>${esc(it.product)}</td>
      <td class="num">${fmtInt(it.quantity)}</td>
      <td class="num">${fmtInt(it.unit_price)}</td>
      <td class="num">${fmtInt(it.total)}</td>
      <td><span class="badge">${esc(it.status || '—')}</span></td>
    </tr>`).join('');
}

function renderLog(data) {
  const body = $('log-body');
  if (!data.items || !data.items.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">Chưa có bản ghi.</td></tr>';
    return;
  }
  body.innerHTML = data.items.map((it) => `
    <tr>
      <td>${fmtTime(it.ts)}</td>
      <td>${esc(it.subject)}</td>
      <td>${esc(it.from)}</td>
    </tr>`).join('');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---- Data loading ----
async function loadAll() {
  const [status, quotations, log] = await Promise.all([
    api('/api/status'),
    api('/api/quotations').catch(() => ({ items: [] })),
    api('/api/process-log').catch(() => ({ items: [] })),
  ]);
  renderStatus(status);
  allQuotations = quotations.items || [];
  renderQuotations(allQuotations);
  renderLog(log);
}

function setMsg(t) {
  $('action-msg').textContent = t || '';
  if (t) setTimeout(() => { if ($('action-msg').textContent === t) $('action-msg').textContent = ''; }, 4000);
}

// ---- Wiring ----
function wire() {
  $('logout').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    location.reload();
  };
  $('refresh').onclick = () => loadAll().catch(handleErr);
  $('search').oninput = () => renderQuotations(allQuotations);

  $('scan-now').onclick = async () => {
    const btn = $('scan-now');
    btn.disabled = true;
    setMsg('Đang quét…');
    try {
      const r = await api('/api/scan-now', { method: 'POST' });
      const res = r.result || {};
      setMsg(res.skipped ? 'Đang có phiên quét khác chạy.' : `Xong: khớp ${res.matched ?? 0}, xử lý ${res.processed ?? 0}.`);
      await loadAll();
    } catch (e) { handleErr(e); } finally { btn.disabled = false; }
  };

  $('test-toggle').onchange = async (e) => {
    const enabled = e.target.checked;
    if (!enabled && !confirm('Tắt chế độ chạy thử? Agent sẽ GỬI EMAIL THẬT cho khách và ghi Sheet thật.')) {
      e.target.checked = true; return;
    }
    try {
      await api('/api/test-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      setMsg(enabled ? 'Đã BẬT chế độ chạy thử.' : 'Đã TẮT — agent chạy thật.');
      await loadAll();
    } catch (err) { handleErr(err); e.target.checked = !enabled; }
  };
}

function handleErr(e) {
  if (e && e.unauthorized) { showLogin(); return; }
  setMsg('Có lỗi: ' + (e.message || e));
}

function showLogin() {
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
  showLoginError();
}
function showApp(user) {
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('user-email').textContent = user.email;
}

// ---- Boot ----
(async function boot() {
  try {
    const me = await api('/api/me');
    showApp(me.user);
    wire();
    await loadAll();
    setInterval(() => loadAll().catch(() => {}), 30000); // auto refresh status
  } catch (e) {
    showLogin();
  }
})();
