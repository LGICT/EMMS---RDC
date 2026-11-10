// ============ UI helpers & components ============
const PAGES = {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(d) { if (!d) return '—'; const x = new Date(d.length === 10 ? d + 'T00:00' : d); if (isNaN(x)) return '—'; return `${MONTHS[x.getMonth()]} ${String(x.getDate()).padStart(2, '0')}, ${x.getFullYear()}`; }
function fmtLong(d) { if (!d) return '—'; const x = new Date(d.length === 10 ? d + 'T00:00' : d); return `${MONTHS_L[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; }
function fmtTime(d) { const x = new Date(d); let h = x.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')} ${ap}`; }
function fmtDT(d) { return d ? fmtDate(d) + ' ' + fmtTime(d) : '—'; }
function fmtSize(b) { if (!b) return '—'; if (b < 1024) return b + ' B'; if (b < 1048576) return Math.round(b / 1024) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function toInputDate(d) { if (!d) return ''; const x = new Date(d.length === 10 ? d + 'T00:00' : d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
function toInputDT(d) { const x = new Date(d); return toInputDate(x.toISOString()) + 'T' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); }
function daysLeft(d) { const diff = Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY); if (diff < 0) return { t: diff === -1 ? 'Yesterday' : Math.abs(diff) + ' days overdue', over: true }; if (diff === 0) return { t: 'Due today', over: false, today: true }; return { t: diff + (diff === 1 ? ' day left' : ' days left'), over: false }; }
const plural = (n, w) => `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`;
const pct = (a, b, d = 1) => b ? (a / b * 100).toFixed(d) + '%' : '0%';

const STATUS_BADGE = { 'Active': 'b-green', 'Approved': 'b-green', 'Acknowledged': 'b-green', 'Completed': 'b-green', 'Pending Approval': 'b-orange', 'Pending': 'b-orange', 'Superseded': 'b-red', 'Overdue': 'b-red', 'Rejected': 'b-red', 'Locked': 'b-red', 'Archived': 'b-gray', 'Inactive': 'b-gray', 'Waiting': 'b-gray', 'Draft': 'b-blue', 'To Do': 'b-blue', 'Returned': 'b-purple', 'In Progress': 'b-purple', 'Scheduled': 'b-teal', 'Expired': 'b-gray', 'High': 'b-red', 'Urgent': 'b-red', 'Medium': 'b-orange', 'Normal': 'b-blue', 'Low': 'b-green' };
function badge(s, cls) { return `<span class="badge ${cls || STATUS_BADGE[s] || 'b-gray'}">${esc(s)}</span>`; }
function memoStatus(m) { if (m.status === 'Active' && m.releasedAt && new Date(m.releasedAt) > NOW()) return 'Scheduled'; if (m.status === 'Active' && m.expiryDate && new Date(m.expiryDate + 'T23:59') < NOW()) return 'Expired'; return m.status; }

const AV_COLORS = ['#1d4ed8', '#7c5cd6', '#16a34a', '#f97316', '#0e8fa6', '#db2777', '#dc2626', '#0f766e', '#9333ea', '#ca8a04'];
function initials(n) { return n.replace(/^Atty\.\s*/, '').split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(0, 2).join('') || '?'; }
function avatar(u, cls = '') { if (typeof u === 'string') u = userById(u); const h = [...(u.id || u.name)].reduce((a, c) => a + c.charCodeAt(0), 0); return `<span class="av ${cls}" style="background:${AV_COLORS[h % AV_COLORS.length]}">${esc(initials(u.name))}</span>`; }
function catIcon(c, size = 34) { return `<span class="cat-ic" style="background:${c.color};width:${size}px;height:${size}px">${icon(c.icon)}</span>`; }

// ---------- toast ----------
function toast(msg, err) { let w = $('.toasts'); if (!w) { w = document.createElement('div'); w.className = 'toasts'; document.body.appendChild(w); } const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.innerHTML = icon(err ? 'xc' : 'checkc') + esc(msg); w.appendChild(t); setTimeout(() => t.remove(), 3600); }

// ---------- modal ----------
function modal({ title, body, foot, wide, onMount }) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-x>${icon('x')}</button></div><div class="modal-b">${body}</div>${foot !== false ? `<div class="modal-f">${foot || '<button class="btn" data-x>Close</button>'}</div>` : ''}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  $$('[data-x]', bg).forEach(b => b.onclick = close);
  onMount && onMount(bg, close);
  const f = $('input,select,textarea', bg); f && setTimeout(() => f.focus(), 30);
  return { el: bg, close };
}
function confirmBox(title, text, okLabel = 'Confirm', danger) {
  return new Promise(res => {
    modal({ title, body: `<div>${text}</div>`, foot: `<button class="btn" data-x>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(okLabel)}</button>`, onMount: (el, close) => { $('#cf-ok', el).onclick = () => { close(); res(true); }; $$('[data-x]', el).forEach(b => b.addEventListener('click', () => res(false))); } });
  });
}
// Form modal: fields = [{name,label,type,options,value,required,full}]
function formModal({ title, fields, okLabel = 'Save', wide, onSave }) {
  const body = `<div class="grid ${wide ? 'g2' : ''}" style="gap:14px">${fields.map(f => {
    const v = f.value ?? '';
    let input;
    if (f.type === 'select') input = `<select class="inp" name="${f.name}">${f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea class="inp" name="${f.name}" rows="${f.rows || 4}">${esc(v)}</textarea>`;
    else if (f.type === 'checkbox') input = `<label class="check"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.text || '')}</label>`;
    else if (f.type === 'html') input = f.html;
    else input = `<input class="inp" type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}>`;
    return `<div class="field" style="${f.full ? 'grid-column:1/-1' : ''}"><label>${esc(f.label)} ${f.required ? '<span class="req">*</span>' : ''}</label>${input}${f.hint ? `<div class="xs muted">${esc(f.hint)}</div>` : ''}</div>`;
  }).join('')}</div>`;
  modal({ title, wide, body, foot: `<button class="btn" data-x>Cancel</button><button class="btn primary" id="fm-ok">${esc(okLabel)}</button>`, onMount: (el, close) => {
    $('#fm-ok', el).onclick = () => {
      const vals = {};
      for (const f of fields) { if (f.type === 'html') continue; const i = $(`[name="${f.name}"]`, el); vals[f.name] = f.type === 'checkbox' ? i.checked : f.type === 'number' ? +i.value : i.value.trim(); if (f.required && !vals[f.name] && vals[f.name] !== 0) { i.focus(); i.style.borderColor = 'var(--red)'; toast(f.label + ' is required.', true); return; } }
      if (onSave(vals, el) !== false) close();
    };
  } });
}

// ---------- popover menu ----------
function popMenu(anchor, items) {
  $$('.pop.menu').forEach(p => p.remove());
  const r = anchor.getBoundingClientRect();
  const p = document.createElement('div'); p.className = 'pop menu';
  p.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `<div class="mi ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon ? icon(it.icon) : ''}${esc(it.label)}</div>`).join('');
  document.body.appendChild(p);
  const w = p.offsetWidth; let left = r.right - w; if (left < 8) left = r.left;
  let top = r.bottom + 4 + window.scrollY; if (r.bottom + p.offsetHeight > window.innerHeight - 10) top = r.top - p.offsetHeight - 4 + window.scrollY;
  p.style.left = left + 'px'; p.style.top = top + 'px';
  p.onclick = e => { const mi = e.target.closest('.mi'); if (!mi) return; p.remove(); items[+mi.dataset.i].onClick(); };
  setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('mousedown', h); } }), 0);
}

// ---------- table with sort + pagination ----------
// cfg: {id, rows, columns:[{key,label,render,sort}], pageSize, empty, onRow}
const TableState = {};
function dataTable(cfg) {
  const st = TableState[cfg.id] = TableState[cfg.id] || { page: 1, sort: cfg.defaultSort || null, dir: cfg.defaultDir || 'asc', size: cfg.pageSize || 10 };
  if (cfg.resetPage) st.page = 1;
  let rows = [...cfg.rows];
  if (st.sort) { const col = cfg.columns.find(c => c.key === st.sort); const f = col?.sortVal || (r => r[st.sort]); rows.sort((a, b) => { const x = f(a) ?? '', y = f(b) ?? ''; return (x > y ? 1 : x < y ? -1 : 0) * (st.dir === 'asc' ? 1 : -1); }); }
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / st.size)); if (st.page > pages) st.page = pages;
  const slice = rows.slice((st.page - 1) * st.size, st.page * st.size);
  const from = total ? (st.page - 1) * st.size + 1 : 0, to = Math.min(total, st.page * st.size);
  const head = cfg.columns.map(c => `<th class="${c.sort !== false && c.key ? 'sort' : ''}" data-k="${c.key || ''}" style="${c.width ? 'width:' + c.width : ''}">${esc(c.label || '')}${c.sort !== false && c.key ? ` <span class="muted">${st.sort === c.key ? (st.dir === 'asc' ? '↑' : '↓') : '↕'}</span>` : ''}</th>`).join('');
  const body = slice.length ? slice.map((r, i) => `<tr data-r="${i}">${cfg.columns.map(c => `<td>${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cfg.columns.length}" class="empty">${cfg.empty || 'No records found.'}</td></tr>`;
  let pg = '';
  const btn = (p, l = p) => `<button data-p="${p}" class="${p === st.page ? 'on' : ''}">${l}</button>`;
  if (pages > 1 || true) {
    let nums = []; for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - st.page) <= 1) nums.push(p); else if (nums.at(-1) !== '…') nums.push('…');
    pg = `<button data-p="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''}>${icon('left')}</button>${nums.map(n => n === '…' ? '<span class="muted">…</span>' : btn(n)).join('')}<button data-p="${st.page + 1}" ${st.page === pages ? 'disabled' : ''}>${icon('right')}</button>`;
  }
  const html = `<div class="tbl-wrap"><table class="tbl ${cfg.compact ? 'compact' : ''}" id="tbl-${cfg.id}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
  ${cfg.noFoot ? '' : `<div class="tbl-foot"><div>Showing ${from} to ${to} of ${total.toLocaleString()} results</div><div class="pager" id="pg-${cfg.id}"><select class="inp" style="width:auto;padding:6px 8px" data-size>${[5, 10, 25, 50].map(n => `<option ${n === st.size ? 'selected' : ''} value="${n}">${n} per page</option>`).join('')}</select>${pg}</div></div>`}`;
  const mount = (container, rerender) => {
    $$(`#tbl-${cfg.id} th.sort`, container).forEach(th => th.onclick = () => { const k = th.dataset.k; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = 'asc'; } rerender(); });
    $$(`#pg-${cfg.id} button`, container).forEach(b => b.onclick = () => { st.page = +b.dataset.p; rerender(); });
    const sz = $(`#pg-${cfg.id} [data-size]`, container); if (sz) sz.onchange = () => { st.size = +sz.value; st.page = 1; rerender(); };
    if (cfg.onRow) $$(`#tbl-${cfg.id} tbody tr[data-r]`, container).forEach(tr => tr.addEventListener('click', e => { if (e.target.closest('button,a,input,select')) return; cfg.onRow(slice[+tr.dataset.r]); }));
    cfg.mount && cfg.mount(container, slice);
  };
  return { html, mount, rows: slice };
}

// ---------- CSV export ----------
function exportCSV(filename, headers, rows) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(q).join(','), ...rows.map(r => r.map(q).join(','))].join('\r\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv' }), filename);
  audit('Export', 'Data Exported', `Exported ${filename} (${rows.length} rows).`); saveDB();
}
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ---------- charts (SVG) ----------
function donut(segments, { size = 170, thick = 26, center = '', sub = '' } = {}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1; const r = (size - thick) / 2, c = size / 2, C = 2 * Math.PI * r;
  let off = 0;
  const arcs = segments.filter(s => s.value > 0).map(s => { const len = s.value / total * C; const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thick}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"><title>${esc(s.label)}: ${s.value}</title></circle>`; off += len; return el; }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#eef1f6" stroke-width="${thick}"/>${arcs}<text x="${c}" y="${c - 2}" text-anchor="middle" font-size="${size / 8.5}" font-weight="700" fill="#0f1b3d">${esc(center)}</text><text x="${c}" y="${c + size / 10}" text-anchor="middle" font-size="${size / 15}" fill="#4b5675">${esc(sub)}</text></svg>`;
}
function legendList(segments, total) { total = total ?? segments.reduce((a, s) => a + s.value, 0); return `<div class="legend" style="flex:1">${segments.map(s => `<div class="li"><span class="sw" style="background:${s.color}"></span><span style="flex:1">${esc(s.label)}</span><b>${s.value.toLocaleString()}</b><span class="t2" style="width:58px;text-align:right">(${pct(s.value, total)})</span></div>`).join('')}</div>`; }
function lineChart(labels, series, { h = 220, w = 560, fill = false, yMax } = {}) {
  const pad = { l: 34, r: 12, t: 14, b: 44 }; const max = yMax || Math.max(5, ...series.flatMap(s => s.data)) * 1.15; const nice = Math.ceil(max / 5) * 5;
  const x = i => pad.l + (labels.length < 2 ? 0 : i * (w - pad.l - pad.r) / (labels.length - 1)); const y = v => pad.t + (h - pad.t - pad.b) * (1 - v / nice);
  let g = ''; for (let k = 0; k <= 4; k++) { const v = nice / 4 * k; g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eef1f6"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#8a93ad">${Math.round(v)}</text>`; }
  const step = Math.ceil(labels.length / 16);
  const xl = labels.map((l, i) => i % step === 0 ? `<text x="${x(i)}" y="${h - pad.b + 14}" font-size="10" fill="#4b5675" text-anchor="end" transform="rotate(-40 ${x(i)} ${h - pad.b + 14})">${esc(l)}</text>` : '').join('');
  const lines = series.map(s => { const pts = s.data.map((v, i) => `${x(i)},${y(v)}`).join(' '); const area = fill ? `<polygon points="${x(0)},${y(0)} ${pts} ${x(s.data.length - 1)},${y(0)}" fill="${s.color}" opacity=".08"/>` : ''; return area + `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2"/>` + s.data.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(labels[i])}: ${v}</title></circle>`).join(''); }).join('');
  const leg = series.length > 1 ? `<div class="row" style="justify-content:center;gap:18px;font-size:12px">${series.map(s => `<span class="row" style="gap:6px"><span style="width:14px;height:3px;background:${s.color};display:inline-block"></span>${esc(s.label)}</span>`).join('')}</div>` : '';
  return leg + `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">${g}${lines}${xl}</svg>`;
}
function hbars(items, { color = '#1d4ed8', max, suffix = '', showPct } = {}) {
  const m = max || Math.max(1, ...items.map(i => i.value)); const tot = items.reduce((a, i) => a + i.value, 0);
  return `<div class="legend">${items.map(i => `<div class="li"><span style="width:170px;flex:0 0 170px" class="row">${i.icon || ''}<span class="small">${esc(i.label)}</span></span><div class="prog"><div style="width:${(i.value / m * 100).toFixed(1)}%;background:${i.color || color}"></div></div><span class="small bold" style="width:${showPct ? 92 : 50}px;text-align:right">${typeof i.display !== 'undefined' ? i.display : i.value.toLocaleString() + suffix}${showPct ? ` <span class="t2">(${pct(i.value, tot)})</span>` : ''}</span></div>`).join('')}</div>`;
}
function vbars(labels, series, { h = 220, w = 560 } = {}) {
  const pad = { l: 34, r: 10, t: 10, b: 40 }; const max = Math.max(5, ...series.flatMap(s => s.data)) * 1.15; const nice = Math.ceil(max / 5) * 5;
  const gw = (w - pad.l - pad.r) / labels.length; const bw = Math.min(26, gw * 0.7 / series.length); const y = v => pad.t + (h - pad.t - pad.b) * (1 - v / nice);
  let g = ''; for (let k = 0; k <= 4; k++) { const v = nice / 4 * k; g += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#eef1f6"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#8a93ad">${Math.round(v)}</text>`; }
  const bars = labels.map((l, i) => { const cx = pad.l + gw * i + gw / 2; const start = cx - bw * series.length / 2; return series.map((s, k) => `<rect x="${start + k * bw}" y="${y(s.data[i])}" width="${bw - 2}" height="${y(0) - y(s.data[i])}" rx="2" fill="${s.color}"><title>${esc(l)} – ${esc(s.label)}: ${s.data[i]}</title></rect>`).join('') + `<text x="${cx}" y="${h - pad.b + 16}" font-size="10" fill="#4b5675" text-anchor="middle">${esc(l.length > 12 ? l.slice(0, 11) + '…' : l)}</text>`; }).join('');
  const leg = series.length > 1 ? `<div class="row" style="justify-content:center;gap:18px;font-size:12px">${series.map(s => `<span class="row" style="gap:6px"><span style="width:10px;height:10px;background:${s.color};display:inline-block;border-radius:2px"></span>${esc(s.label)}</span>`).join('')}</div>` : '';
  return leg + `<svg viewBox="0 0 ${w} ${h}" width="100%">${g}${bars}</svg>`;
}
function gauge(p, color = '#1d4ed8', size = 90, label = '') {
  const r = size / 2 - 7, c = size / 2, C = 2 * Math.PI * r; const len = Math.max(0, Math.min(1, p)) * C;
  return `<svg width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#e8ecf4" stroke-width="7"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${len} ${C}" transform="rotate(-90 ${c} ${c})"/><text x="${c}" y="${c + 2}" text-anchor="middle" font-size="${size / 5}" font-weight="700" fill="#0f1b3d">${Math.round(p * 100)}%</text><text x="${c}" y="${c + size / 6}" text-anchor="middle" font-size="${size / 10}" fill="#4b5675">${esc(label)}</text></svg>`;
}

// ---------- memo document rendering ----------
function memoDocHTML(m, { compact } = {}) {
  const from = deptById(m.deptId).name; const author = userById(m.createdBy);
  const atts = (m.attachments || []).map(a => `${esc(a.name)} (${fmtSize(a.size)})`).join(', ') || '—';
  return `<div class="memo-doc" style="${compact ? 'padding:20px 24px;font-size:12px' : ''}">
    <div class="mh">${brandLogo(false, compact ? 30 : 44)}<div class="ttl"><b style="${compact ? 'font-size:16px' : ''}">MEMORANDUM</b>${esc(m.no)}</div><div style="width:${compact ? 90 : 150}px"></div></div>
    <table class="meta">
      <tr><td>TO</td><td>:</td><td>${esc((m.to || []).map(recipientLabel).join(', ') || '—')}</td></tr>
      ${(m.cc || []).length ? `<tr><td>CC</td><td>:</td><td>${esc(m.cc.map(recipientLabel).join(', '))}</td></tr>` : ''}
      <tr><td>FROM</td><td>:</td><td>${esc(from)}</td></tr>
      <tr><td>SUBJECT</td><td>:</td><td><b>${esc(m.subject || '')}</b></td></tr>
      <tr><td>DATE</td><td>:</td><td>${fmtLong(m.releasedAt || m.releaseDate || m.updatedAt || new Date().toISOString())}</td></tr>
      <tr><td>EFFECTIVE DATE</td><td>:</td><td>${fmtLong(m.effectiveDate)}</td></tr>
      ${m.reference ? `<tr><td>REFERENCE</td><td>:</td><td>${esc(m.reference)}</td></tr>` : ''}
      ${(m.attachments || []).length ? `<tr><td>ATTACHMENTS</td><td>:</td><td>${atts}</td></tr>` : ''}
    </table>
    <div class="body">${m.content || ''}
      <div class="sig"><div class="line"></div><b>${esc(author.name)}</b><br>${esc(author.title || '')}</div>
    </div>
    <div class="foot">This is a system generated memo. No signature is required.</div>
  </div>`;
}
function printMemo(m) {
  const w = window.open('', '_blank');
  if (!w) { toast('Please allow pop-ups to print / download PDF.', true); return; }
  const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
  w.document.write(`<html><head><title>${esc(m.no)} – ${esc(m.subject)}</title><style>${css} body{background:#fff} .memo-doc{max-width:800px;margin:0 auto}</style></head><body>${memoDocHTML(m)}<script>setTimeout(()=>{window.print()},300)<\/script></body></html>`);
  w.document.close();
  audit('Memo', 'Memo Printed', `${m.no} printed / downloaded.`); saveDB();
}
async function openAttachment(a, download) {
  if (a.demo) { toast('This is sample data – no actual file is stored for this attachment.'); return; }
  const blob = await FileStore.get(a.id); if (!blob) { toast('File not found in storage.', true); return; }
  if (download) downloadBlob(blob, a.name); else { const u = URL.createObjectURL(blob); window.open(u, '_blank'); }
}
function fileIcon(name) { const ext = (name.split('.').pop() || '').toLowerCase(); const col = { pdf: '#e0473e', xlsx: '#16a34a', xls: '#16a34a', csv: '#16a34a', docx: '#1d4ed8', doc: '#1d4ed8', pptx: '#f97316', png: '#7c5cd6', jpg: '#7c5cd6', jpeg: '#7c5cd6' }[ext] || '#64748b'; return `<span style="color:${col};display:inline-flex">${icon('memo')}</span>`; }

// generic page header
function pageHead(title, sub, actions = '') { return `<div class="card card-pad mb" style="display:flex;align-items:center;gap:16px"><div style="flex:1"><h2 style="font-size:20px">${esc(title)}</h2>${sub ? `<div class="t2" style="margin-top:4px">${esc(sub)}</div>` : ''}</div>${actions}</div>`; }
function statCard(color, ic, label, value, hint, onclick) { return `<div class="stat c-${color}" ${onclick ? `style="cursor:pointer" onclick="${onclick}"` : ''}><div class="ic bg-${color}">${icon(ic)}</div><div style="flex:1;min-width:0"><div class="lbl">${esc(label)}</div><div class="val">${value}</div><div class="hint">${hint || ''}</div></div></div>`; }
function selectOpts(list, val, allLabel) { return (allLabel ? `<option value="">${esc(allLabel)}</option>` : '') + list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); }
