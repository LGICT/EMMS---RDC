// ============ Dashboard, Tasks, Activity, Categories, Reports, Help ============
const STATUS_COLORS = { Active: '#4caf50', 'Pending Approval': '#f5b120', Superseded: '#f57c33', Archived: '#8b6fd6', Approved: '#1d4ed8', Draft: '#94a3b8', Returned: '#a855f7', Rejected: '#dc2626' };

PAGES.dashboard = ({ el }) => {
  const u = me(); const today = new Date();
  const visible = DB.memos.filter(m => m.status !== 'Draft');
  const cnt = s => DB.memos.filter(m => m.status === s).length;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const relMonth = DB.memos.filter(m => m.releasedAt && new Date(m.releasedAt) >= monthStart && new Date(m.releasedAt) <= today).length;
  const myPendingAppr = tasksFor(u.id).filter(t => t.kind === 'APPROVAL').length;
  const tasks = tasksFor(u.id);
  const recent = visible.slice().sort((a, b) => (b.releasedAt || b.updatedAt).localeCompare(a.releasedAt || a.updatedAt)).slice(0, 5);
  const segs = ['Active', 'Pending Approval', 'Superseded', 'Archived'].map(s => ({ label: s, value: cnt(s), color: STATUS_COLORS[s] }));
  const total = segs.reduce((a, s) => a + s.value, 0);
  // ack compliance by division
  const divs = [...new Set(DB.departments.map(d => d.division))];
  const released = DB.memos.filter(m => m.releasedAt && m.requireAck && new Date(m.releasedAt) <= today);
  const divRate = divs.map(dv => { let tot = 0, ack = 0; released.forEach(m => recipientsOf(m).forEach(id => { if (deptById(userById(id).deptId).division === dv) { tot++; if (m.acks[id]) ack++; } })); return { label: dv, value: tot ? Math.round(ack / tot * 100) : 0 }; });
  // released per day last 27 days
  const days = []; for (let i = 26; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const relPerDay = days.map(d => DB.memos.filter(m => m.releasedAt && new Date(m.releasedAt).toDateString() === d.toDateString()).length);
  const recentAcc = (DB.recent || []).map(memoById).filter(Boolean).slice(0, 5);
  const taskBadge = { APPROVAL: ['For Approval', 'b-blue'], RELEASE: ['For Release', 'b-green'], ACKNOWLEDGE: ['For Acknowledgement', 'b-gray'], 'EDIT DRAFT': ['Draft', 'b-purple'], REVISION: ['For Revision', 'b-orange'] };
  el.innerHTML = `
  <div class="card card-pad mb row" style="gap:16px"><div class="doc-ic" style="border-radius:10px;background:var(--primary);color:#fff;width:46px;height:46px;flex-basis:46px">${icon('memo')}</div><div style="flex:1"><h2 style="font-size:18px">Welcome back, ${esc(u.name.split(' ')[0])}!</h2><div class="t2" style="margin-top:3px">Here's what's happening with your memos today.</div></div><span class="t2">Today is ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]}, ${fmtLong(today.toISOString())}</span><span class="green" style="color:var(--primary)">${icon('calendar')}</span></div>
  <div class="grid g4 mb">
    ${statCard('blue', 'memo', 'Active Memos', cnt('Active').toLocaleString(), `View all active memos <span class="spacer"></span>${icon('arrowr')}`, "location.hash='#/memos?tab=Active'")}
    ${statCard('orange', 'hourglass', 'Pending Approval', cnt('Pending Approval'), `${myPendingAppr} for your action <span class="spacer"></span>${icon('arrowr')}`, "location.hash='#/approvals'")}
    ${statCard('green', 'send', 'Released This Month', relMonth, `View released memos <span class="spacer"></span>${icon('arrowr')}`, "location.hash='#/memos?tab=Active'")}
    ${statCard('purple', 'archive', 'Archived Memos', cnt('Archived').toLocaleString(), `View archived memos <span class="spacer"></span>${icon('arrowr')}`, "location.hash='#/memos?tab=Archived'")}
  </div>
  <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr) minmax(0,1.3fr)">
    <div class="card card-pad"><div class="card-h"><h3>My Tasks</h3><a href="#/tasks">View All</a></div>
      ${tasks.slice(0, 4).map(t => `<div style="padding:10px 0;border-bottom:1px solid var(--border-2);cursor:pointer" onclick="location.hash='${t.link}'"><div class="row"><span class="badge ${taskBadge[t.kind]?.[1] || 'b-gray'}" style="text-transform:none">${taskBadge[t.kind]?.[0] || t.kind}</span><span class="small bold">${esc(t.title)}</span></div><div class="xs t2" style="margin-top:4px">${esc(t.memo.no)} | ${esc(t.memo.subject)}</div><div class="xs ${daysLeft(t.due).over ? 'red' : 't2'}" style="margin-top:2px">Due: ${fmtDate(t.due)} (${daysLeft(t.due).t})</div></div>`).join('') || '<div class="empty">No pending tasks 🎉</div>'}
      <a class="small row" style="margin-top:12px" href="#/tasks">More tasks <span class="spacer"></span>${icon('arrowr')}</a></div>
    <div class="card card-pad"><div class="card-h"><h3>Recent Memos</h3><a href="#/memos">View All</a></div>
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Memo No.</th><th>Title</th><th>Status</th><th>Date</th></tr></thead><tbody>${recent.map(m => `<tr style="cursor:pointer" onclick="location.hash='#/memo/${m.id}'"><td>${esc(m.no)}</td><td>${esc(m.subject)}<div class="sub">${esc(catById(m.categoryId).name)}</div></td><td>${badge(memoStatus(m))}</td><td style="white-space:nowrap">${fmtDate(m.releasedAt || m.updatedAt)}</td></tr>`).join('')}</tbody></table></div>
      <a class="small row" style="margin-top:12px" href="#/memos">View all memos <span class="spacer"></span>${icon('arrowr')}</a></div>
    <div class="card card-pad"><div class="card-h"><h3>Memo Status Distribution</h3></div><div class="row" style="gap:18px;flex-wrap:wrap">${donut(segs, { size: 170, thick: 28, center: total.toLocaleString(), sub: 'Total Memos' })}${legendList(segs, total)}</div>
      <a class="small row" style="margin-top:12px" href="#/reports/overview">View full report <span class="spacer"></span>${icon('arrowr')}</a></div>
  </div>
  <div class="grid mt" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr) minmax(0,1.3fr)">
    <div class="card card-pad"><div class="card-h"><h3>Acknowledgement Compliance</h3><a href="#/reports/acknowledgement">View Report</a></div>${hbars(divRate.map(d => ({ ...d, display: d.value + '%' })), { max: 100 })}</div>
    <div class="card card-pad"><div class="card-h"><h3>Memos Released (Last 4 Weeks)</h3><a href="#/reports/activity">View Report</a></div>${lineChart(days.map(d => MONTHS[d.getMonth()] + ' ' + d.getDate()), [{ label: 'Released', data: relPerDay, color: '#1d4ed8' }], { fill: true, h: 200 })}</div>
    <div class="card card-pad"><div class="card-h"><h3>Quick Actions</h3></div><div class="qa">
      ${[['plus', 'bg-blue', 'Create Memo', 'Start a new memorandum', '#/create'], ['upload', 'bg-green', 'Upload Memo', 'Upload existing memo', '#/create?upload=1'], ['search', 'bg-purple', 'Search Repository', 'Find memos quickly', '#/memos'], ['reports', 'bg-orange', 'Generate Report', 'Create and export reports', '#/reports/overview'], ['users', 'bg-teal', 'View Approval Queue', 'See all pending items', '#/approvals'], ['template', 'bg-blue', 'Memo Templates', 'Manage memo templates', '#/admin/templates']].map(([i, c, t, s, h]) => `<div class="qa-i" onclick="location.hash='${h}'"><div class="ic ${c}">${icon(i)}</div><div><b>${t}</b><span>${s}</span></div></div>`).join('')}</div></div>
  </div>
  <div class="card card-pad mt"><div class="card-h"><h3>Recently Accessed Memos</h3><a href="#/memos">View All</a></div><div class="grid g5">${recentAcc.map(m => `<div class="mini-card" onclick="location.hash='#/memo/${m.id}'"><span class="pdf-ic">${icon('memo')}</span><div style="flex:1;min-width:0"><div class="small">${esc(m.no)}</div><div class="small bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.subject)}</div><div class="row" style="margin-top:6px">${badge(memoStatus(m))}<span class="spacer"></span><span class="xs t2">${fmtDate(m.releasedAt || m.updatedAt)}</span></div></div></div>`).join('') || '<div class="t2 small">Memos you open will appear here.</div>'}</div></div>
  <div class="footer-note row" style="justify-content:center">${icon('shieldc')} ${esc(DB.settings.footerNote)}</div>`;
  return { title: 'Dashboard', sub: 'Overview of memo management activities' };
};

// ---------- My Tasks ----------
const TF = { q: '', kind: '', status: '', priority: '', tab: 'all' };
PAGES.tasks = ({ el }) => {
  const u = me(); const all = tasksFor(u.id);
  const q = TF.q.toLowerCase();
  const f = all.filter(t => (!q || `${t.title} ${t.memo.no} ${t.memo.subject}`.toLowerCase().includes(q)) && (!TF.kind || t.kind === TF.kind) && (!TF.status || t.status === TF.status) && (!TF.priority || t.priority === TF.priority));
  const done = completedTasksThisMonth(u.id);
  const tabs = { all: f, todo: f.filter(t => t.status !== 'In Progress'), progress: f.filter(t => t.status === 'In Progress') };
  const icCol = { APPROVAL: 'bg-red', RELEASE: 'bg-orange', ACKNOWLEDGE: 'bg-blue', 'EDIT DRAFT': 'bg-purple', REVISION: 'bg-orange' };
  const icN = { APPROVAL: 'hourglass', RELEASE: 'send', ACKNOWLEDGE: 'memo', 'EDIT DRAFT': 'edit', REVISION: 'reset' };
  const kindB = { APPROVAL: 'b-green', RELEASE: 'b-blue', ACKNOWLEDGE: 'b-teal', 'EDIT DRAFT': 'b-purple', REVISION: 'b-orange' };
  const t = dataTable({ id: 'tasks', rows: tabs[TF.tab], defaultSort: 'due', columns: [
    { key: 'title', label: 'Task', render: x => `<div class="row" style="align-items:flex-start"><span class="qa-i" style="padding:0;border:0"><span class="ic ${icCol[x.kind]}">${icon(icN[x.kind])}</span></span><div><b class="small">${esc(x.title)}</b><div class="sub">${esc(x.desc)}</div></div></div>` },
    { key: 'memo', label: 'Memo Details', render: x => `${memoLink(x.memo)}<div class="sub">${esc(x.memo.subject)}</div>`, sortVal: x => x.memo.no },
    { key: 'kind', label: 'Task Type', render: x => badge(x.kind, kindB[x.kind]) },
    { key: 'from', label: 'From', render: x => { const f = userById(x.from); return `${f.id === u.id ? 'You' : esc(f.name)}<div class="sub">${esc(f.id === u.id ? deptById(u.deptId).name : f.title)}</div>`; }, sortVal: x => userById(x.from).name },
    { key: 'due', label: 'Due Date', render: x => { const dl = daysLeft(x.due); return `${fmtDate(x.due)}<div class="sub ${dl.over ? 'red' : ''}">(${dl.over ? 'Overdue' : dl.t})</div>`; } },
    { key: 'priority', label: 'Priority', render: x => badge(x.priority) },
    { key: 'status', label: 'Status', render: x => badge(x.status) },
    { label: 'Actions', render: x => `<a class="btn sm" href="${x.link}">${x.action}</a>` }] });
  el.innerHTML = `<div class="grid g4 mb">${statCard('blue', 'tasks', 'Total Tasks', all.length, 'All tasks assigned to you')}${statCard('orange', 'hourglass', 'Overdue', `<span class="red">${all.filter(x => x.status === 'Overdue').length}</span>`, 'Require immediate action')}${statCard('purple', 'calendar', 'Due Today', all.filter(x => daysLeft(x.due).today).length, 'Tasks due today')}${statCard('green', 'checkc', 'Completed This Month', done, 'Actions you completed')}</div>
  <div class="card"><div class="filters"><div class="field search"><input class="inp" id="t-q" placeholder="Search by title, memo no., etc." value="${esc(TF.q)}">${icon('search')}</div>
    <div class="field"><label>Task Type</label><select class="inp" id="t-kind">${selectOpts(['APPROVAL', 'RELEASE', 'ACKNOWLEDGE', 'EDIT DRAFT', 'REVISION'], TF.kind, 'All Task Types')}</select></div>
    <div class="field"><label>Status</label><select class="inp" id="t-status">${selectOpts(['To Do', 'In Progress', 'Overdue'], TF.status, 'All Statuses')}</select></div>
    <div class="field"><label>Priority</label><select class="inp" id="t-pri">${selectOpts(['High', 'Medium', 'Low'], TF.priority, 'All Priorities')}</select></div>
    <button class="btn" id="t-reset">${icon('reset')} Reset</button></div>
    <div class="tabs">${[['all', 'All'], ['todo', 'To Do'], ['progress', 'In Progress']].map(([k, l]) => `<div class="tab ${TF.tab === k ? 'active' : ''}" data-t="${k}">${l} (${tabs[k].length})</div>`).join('')}</div>${t.html}</div>`;
  t.mount(el, rerender);
  $$('[data-t]', el).forEach(x => x.onclick = () => { TF.tab = x.dataset.t; rerender(); });
  let tm; $('#t-q', el).oninput = e => { clearTimeout(tm); tm = setTimeout(() => { TF.q = e.target.value; rerender(); const n = $('#t-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); };
  $('#t-kind', el).onchange = e => { TF.kind = e.target.value; rerender(); }; $('#t-status', el).onchange = e => { TF.status = e.target.value; rerender(); }; $('#t-pri', el).onchange = e => { TF.priority = e.target.value; rerender(); };
  $('#t-reset', el).onclick = () => { Object.assign(TF, { q: '', kind: '', status: '', priority: '' }); rerender(); };
  return { title: 'My Tasks', crumbs: [['Home', '#/dashboard'], ['My Tasks']] };
};

// ---------- My Activity ----------
PAGES.activity = ({ el }) => {
  const u = DB.currentUserId;
  const rows = DB.audit.filter(a => a.userId === u);
  const t = dataTable({ id: 'myact', rows, defaultSort: 'date', defaultDir: 'desc', columns: [{ key: 'date', label: 'Date & Time', render: a => fmtDT(a.date) }, { key: 'module', label: 'Module' }, { key: 'action', label: 'Activity', render: a => `<b>${esc(a.action)}</b>` }, { key: 'details', label: 'Details' }] });
  const created = DB.memos.filter(m => m.createdBy === u).length, approved = DB.memos.filter(m => m.approvals.some(a => a.userId === u && a.status === 'Approved')).length, released = DB.memos.filter(m => m.releasedBy === u).length, acked = DB.memos.filter(m => m.acks[u]).length;
  el.innerHTML = `<div class="grid g4 mb">${statCard('blue', 'memo', 'Memos Created', created, 'All time')}${statCard('green', 'checkc', 'Approvals Given', approved, 'All time')}${statCard('orange', 'send', 'Memos Released', released, 'All time')}${statCard('purple', 'pie', 'Acknowledged', acked, 'All time')}</div><div class="card"><div class="card-pad"><h3>My Activity Log</h3><div class="t2 small" style="margin-top:4px">Everything you have done in the system.</div></div>${t.html}</div>`;
  t.mount(el, rerender);
  return { title: 'My Activity', crumbs: [['Home', '#/dashboard'], ['My Activity']] };
};

// ---------- Categories ----------
let CAT_Q = '';
PAGES.categories = ({ el }) => {
  const stats = c => { const ms = DB.memos.filter(m => m.categoryId === c.id && m.status !== 'Draft'); return { total: ms.length, active: ms.filter(m => m.status === 'Active').length, last: ms.sort((a, b) => (b.releasedAt || b.updatedAt).localeCompare(a.releasedAt || a.updatedAt))[0] }; };
  const rows = DB.categories.filter(c => !CAT_Q || (c.name + ' ' + c.description).toLowerCase().includes(CAT_Q.toLowerCase())).map(c => ({ ...c, ...stats(c) }));
  const most = rows.slice().sort((a, b) => b.total - a.total)[0];
  const lastUpd = DB.categories.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const manage = can('categories.manage');
  const t = dataTable({ id: 'cats', rows, columns: [
    { key: 'name', label: 'Category', render: c => `<span class="row">${catIcon(c)} <b class="small">${esc(c.name)}</b></span>` },
    { key: 'description', label: 'Description', render: c => `<span class="small">${esc(c.description)}</span>`, sort: false },
    { key: 'total', label: 'Total Memos' }, { key: 'active', label: 'Active Memos' },
    { key: 'updatedAt', label: 'Last Updated', render: c => `${fmtDate(c.updatedAt)}<div class="sub">By: ${c.updatedBy === DB.currentUserId ? 'You' : esc(userById(c.updatedBy).name)}</div>` },
    { key: 'status', label: 'Status', render: c => badge(c.status) },
    { label: 'Actions', render: c => `<span class="row" style="gap:2px"><button class="icon-btn" title="View memos" data-view="${c.id}">${icon('eye')}</button>${manage ? `<button class="icon-btn" data-edit="${c.id}">${icon('edit')}</button><button class="icon-btn" data-cmenu="${c.id}">${icon('dots')}</button>` : ''}</span>` }] });
  el.innerHTML = `${manage ? `<div class="row mb" style="justify-content:flex-end"><button class="btn primary" id="add-cat">${icon('plus')} Add Category</button></div>` : ''}
  <div class="grid g4 mb">${statCard('blue', 'folder', 'Total Categories', DB.categories.length, DB.categories.filter(c => c.status === 'Active').length + ' active categories')}${statCard('green', 'memo', 'Memos in Categories', DB.memos.filter(m => m.status !== 'Draft').length.toLocaleString(), 'Across all categories')}${statCard('orange', 'users', 'Most Used Category', `<span style="font-size:20px">${esc(most?.name || '—')}</span>`, (most?.total || 0) + ' memos')}${statCard('purple', 'calendar', 'Last Updated', `<span style="font-size:20px">${fmtDate(lastUpd.updatedAt)}</span>`, esc(lastUpd.name))}</div>
  <div class="card"><div class="filters"><div class="field search" style="flex:0 1 320px"><input class="inp" id="c-q" placeholder="Search categories..." value="${esc(CAT_Q)}">${icon('search')}</div><span class="spacer"></span><button class="btn" id="c-reset">${icon('reset')} Reset</button></div>${t.html}</div>`;
  t.mount(el, rerender);
  let tm; $('#c-q', el).oninput = e => { clearTimeout(tm); tm = setTimeout(() => { CAT_Q = e.target.value; rerender(); const n = $('#c-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); };
  $('#c-reset', el).onclick = () => { CAT_Q = ''; rerender(); };
  $$('[data-view]', el).forEach(b => b.onclick = () => { MF.cat = b.dataset.view; MF.tab = 'all'; location.hash = '#/memos'; });
  const edit = (c) => formModal({ title: c ? 'Edit Category' : 'Add Category', fields: [
    { name: 'name', label: 'Category Name', required: true, value: c?.name }, { name: 'description', label: 'Description', type: 'textarea', rows: 3, value: c?.description },
    { name: 'icon', label: 'Icon', type: 'select', options: ['users', 'shieldc', 'cog2', 'coin', 'monitor', 'building', 'scale', 'cart', 'bars', 'shield', 'send', 'sparkles', 'folder', 'memo'], value: c?.icon || 'folder' },
    { name: 'color', label: 'Color', type: 'color', value: c?.color || '#1d4ed8' }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], value: c?.status || 'Active' }],
    onSave: v => { if (DB.categories.some(x => x.name.toLowerCase() === v.name.toLowerCase() && x.id !== c?.id)) { toast('A category with this name already exists.', true); return false; } if (c) Object.assign(c, v, { updatedAt: iso(NOW()), updatedBy: DB.currentUserId }); else DB.categories.push({ id: uid('c'), ...v, createdAt: iso(NOW()), updatedAt: iso(NOW()), updatedBy: DB.currentUserId }); audit('Categories', c ? 'Category Updated' : 'Category Created', `Category '${v.name}' ${c ? 'updated' : 'created'}.`); saveDB(); toast('Category saved.'); rerender(); } });
  const ab = $('#add-cat', el); if (ab) ab.onclick = () => edit();
  $$('[data-edit]', el).forEach(b => b.onclick = () => edit(DB.categories.find(c => c.id === b.dataset.edit)));
  $$('[data-cmenu]', el).forEach(b => b.onclick = () => { const c = DB.categories.find(x => x.id === b.dataset.cmenu); const n = DB.memos.filter(m => m.categoryId === c.id).length; popMenu(b, [{ label: c.status === 'Active' ? 'Deactivate' : 'Activate', icon: 'refresh', onClick: () => { c.status = c.status === 'Active' ? 'Inactive' : 'Active'; c.updatedAt = iso(NOW()); c.updatedBy = DB.currentUserId; audit('Categories', 'Category Status Changed', `Category '${c.name}' set to ${c.status}.`); saveDB(); rerender(); } }, { label: 'Delete', icon: 'trash', danger: true, onClick: async () => { if (n) { toast(`Cannot delete – ${n} memo(s) use this category. Deactivate it instead.`, true); return; } if (await confirmBox('Delete category', `Delete <b>${esc(c.name)}</b>?`, 'Delete', true)) { DB.categories = DB.categories.filter(x => x.id !== c.id); audit('Categories', 'Category Deleted', `Category '${c.name}' deleted.`); saveDB(); rerender(); } } }]); });
  return { title: 'Categories', crumbs: [['Home', '#/dashboard'], ['Categories']] };
};

// ---------- Reports ----------
const REPORT_TABS = [['overview', 'Overview'], ['activity', 'Memo Activity'], ['approval', 'Approval Performance'], ['category', 'Category Breakdown'], ['turnaround', 'Turnaround Time'], ['sla', 'SLA Compliance'], ['acknowledgement', 'Acknowledgement Compliance']];
const RF = (() => { const d = new Date(); return { from: toInputDate(new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString()), to: toInputDate(d.toISOString()), dept: '', cat: '' }; })();
function reportData() {
  const from = new Date(RF.from + 'T00:00'), to = new Date(RF.to + 'T23:59');
  const memos = DB.memos.filter(m => m.status !== 'Draft' && (!RF.dept || m.deptId === RF.dept) && (!RF.cat || m.categoryId === RF.cat) && new Date(m.createdAt) >= from && new Date(m.createdAt) <= to);
  return { from, to, memos };
}
const daysBetween = (a, b) => (new Date(b) - new Date(a)) / DAY;
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
function approvalDecisions(memos) { const out = []; memos.forEach(m => m.approvals.forEach(a => { if (a.date && a.receivedAt && ['Approved', 'Returned', 'Rejected'].includes(a.status)) out.push({ m, a, hrs: daysBetween(a.receivedAt, a.date), onTime: new Date(a.date) <= new Date(a.due) }); })); return out; }
function weeks(from, to) { const out = []; let s = new Date(from); while (s <= to) { const e = new Date(s.getTime() + 7 * DAY - 1); out.push([new Date(s), e > to ? to : e]); s = new Date(s.getTime() + 7 * DAY); } return out; }

PAGES.reports = ({ el, parts }) => {
  const tab = parts[1] || 'overview';
  const { from, to, memos } = reportData();
  const dec = approvalDecisions(memos);
  const approvedM = memos.filter(m => ['Approved', 'Active', 'Superseded', 'Archived'].includes(m.status));
  const tat = approvedM.map(m => { const s = m.history.find(h => h.action === 'Submitted for Approval'); const e = m.approvals.at(-1)?.date; return s && e ? daysBetween(s.date, e) : null; }).filter(x => x != null);
  const overdueNow = DB.memos.filter(m => m.status === 'Pending Approval' && new Date(m.approvals[m.currentLevel].due) < NOW());
  let body = '', exportFn = null;
  const card = (t, inner, extra = '') => `<div class="card card-pad"><div class="card-h"><h3>${t}</h3>${extra}</div>${inner}</div>`;

  if (tab === 'overview') {
    const wk = weeks(from, to);
    const created = wk.map(([a, b]) => memos.filter(m => new Date(m.createdAt) >= a && new Date(m.createdAt) <= b).length);
    const appr = wk.map(([a, b]) => memos.filter(m => m.approvedAt || m.approvals.at(-1)?.status === 'Approved').filter(m => { const d = new Date(m.approvals.at(-1).date); return d >= a && d <= b; }).length);
    const st = ['Active', 'Pending Approval', 'Approved', 'Superseded', 'Archived', 'Returned', 'Rejected'].map(s => ({ label: s, value: memos.filter(m => m.status === s).length, color: STATUS_COLORS[s] })).filter(s => s.value);
    const byCat = DB.categories.map(c => ({ label: c.name, value: memos.filter(m => m.categoryId === c.id).length, color: c.color, icon: catIcon(c, 22) })).filter(x => x.value).sort((a, b) => b.value - a.value);
    body = `<div class="grid g3">${card('Memo Trend', lineChart(wk.map(([a]) => MONTHS[a.getMonth()] + ' ' + a.getDate()), [{ label: 'Created', data: created, color: '#1d4ed8' }, { label: 'Approved', data: appr, color: '#16a34a' }], { h: 240 }) + `<div class="row small" style="justify-content:space-around;margin-top:8px"><span style="color:var(--primary)">Total Created: <b>${created.reduce((a, b) => a + b, 0)}</b></span><span class="green">Total Approved: <b>${appr.reduce((a, b) => a + b, 0)}</b></span></div>`)}
      ${card('Memos by Status', `<div class="row" style="gap:16px;flex-wrap:wrap">${donut(st, { size: 160, center: String(memos.length), sub: 'Total' })}${legendList(st)}</div>`)}
      ${card('Memos by Category', hbars(byCat.slice(0, 8), { showPct: true }))}</div>
      <div class="card mt"><div class="card-pad" style="padding-bottom:8px"><h3>Recent Reports</h3></div><table class="tbl"><thead><tr><th>Report Name</th><th>Description</th><th>Generated By</th><th>Generated On</th><th>Date Range</th><th>Actions</th></tr></thead><tbody>${DB.reports.slice(0, 8).map(r => `<tr><td>${icon('memo')} ${esc(r.name)}</td><td class="small">${esc(r.description)}</td><td>${esc(userById(r.by).name)}</td><td>${fmtDT(r.date)}</td><td>${esc(r.range)}</td><td><a class="icon-btn" href="#/reports/${r.tab}">${icon('eye')}</a></td></tr>`).join('')}</tbody></table></div>`;
    exportFn = () => exportCSV('report-overview.csv', ['Memo No', 'Title', 'Category', 'Department', 'Status', 'Created', 'Released'], memos.map(m => [m.no, m.subject, catById(m.categoryId).name, deptById(m.deptId).name, m.status, fmtDate(m.createdAt), fmtDate(m.releasedAt)]));
  }
  if (tab === 'activity') {
    const nDays = Math.min(60, Math.ceil(daysBetween(from, to)) + 1); const ds = []; for (let i = nDays - 1; i >= 0; i--) { const d = new Date(to); d.setDate(d.getDate() - i); ds.push(d); }
    const same = (a, d) => a && new Date(a).toDateString() === d.toDateString();
    const ev = []; DB.memos.forEach(m => m.history.forEach(h => { const d = new Date(h.date); if (d >= from && d <= to && (!RF.dept || m.deptId === RF.dept) && (!RF.cat || m.categoryId === RF.cat)) ev.push({ ...h, m }); }));
    const evCount = a => ev.filter(e => e.action === a).length;
    body = `<div class="grid g5 mb">${[['Created', 'blue', 'plus'], ['Submitted for Approval', 'orange', 'send'], ['Approved', 'green', 'checkc'], ['Released', 'teal', 'send'], ['Acknowledged', 'purple', 'pie']].map(([a, c, i]) => statCard(c, i, a, evCount(a), 'in selected period')).join('')}</div>
      ${card('Daily Activity', lineChart(ds.map(d => MONTHS[d.getMonth()] + ' ' + d.getDate()), [{ label: 'Created', data: ds.map(d => ev.filter(e => e.action === 'Created' && same(e.date, d)).length), color: '#1d4ed8' }, { label: 'Approved', data: ds.map(d => ev.filter(e => e.action === 'Approved' && same(e.date, d)).length), color: '#16a34a' }, { label: 'Released', data: ds.map(d => ev.filter(e => e.action === 'Released' && same(e.date, d)).length), color: '#f59e0b' }], { h: 240, w: 1000 }))}
      <div class="card mt" id="act-t"></div>`;
    const t = dataTable({ id: 'rep-act', rows: ev, defaultSort: 'date', defaultDir: 'desc', columns: [{ key: 'date', label: 'Date & Time', render: e => fmtDT(e.date) }, { key: 'no', label: 'Memo No.', render: e => memoLink(e.m), sortVal: e => e.m.no }, { key: 'subj', label: 'Title', render: e => esc(e.m.subject), sortVal: e => e.m.subject }, { key: 'action', label: 'Activity', render: e => `<b>${esc(e.action)}</b>` }, { key: 'user', label: 'By', render: e => esc(userById(e.userId).name), sortVal: e => userById(e.userId).name }, { key: 'comment', label: 'Remarks', render: e => `<span class="small t2">${esc(e.comment || '')}</span>` }] });
    setTimeout(() => { const c = $('#act-t'); if (c) { c.innerHTML = t.html; t.mount(c, rerender); } });
    exportFn = () => exportCSV('report-memo-activity.csv', ['Date', 'Memo No', 'Title', 'Activity', 'By', 'Remarks'], ev.map(e => [fmtDT(e.date), e.m.no, e.m.subject, e.action, userById(e.userId).name, e.comment]));
  }
  if (tab === 'approval') {
    const byU = {}; memos.forEach(m => m.approvals.forEach(a => { if (a.status === 'Waiting') return; const r = byU[a.userId] = byU[a.userId] || { u: userById(a.userId), assigned: 0, approved: 0, returned: 0, rejected: 0, pending: 0, times: [], onTime: 0, decided: 0 }; r.assigned++; if (a.status === 'Approved') r.approved++; if (a.status === 'Returned') r.returned++; if (a.status === 'Rejected') r.rejected++; if (a.status === 'Pending') r.pending++; if (a.date) { r.times.push(daysBetween(a.receivedAt, a.date)); r.decided++; if (new Date(a.date) <= new Date(a.due)) r.onTime++; } }));
    const rows = Object.values(byU).map(r => ({ ...r, avg: avg(r.times), rate: r.decided ? r.onTime / r.decided : 0 }));
    body = `<div class="grid g4 mb">${statCard('blue', 'tasks', 'Total Approval Actions', dec.length, 'Decisions made')}${statCard('green', 'checkc', 'Approval Rate', pct(dec.filter(d => d.a.status === 'Approved').length, dec.length), 'Approved vs. all decisions')}${statCard('orange', 'clock', 'Avg. Response Time', avg(dec.map(d => d.hrs)).toFixed(1) + ' days', 'From receipt to decision')}${statCard('purple', 'shieldc', 'On-time Decisions', pct(dec.filter(d => d.onTime).length, dec.length), 'Within SLA')}</div>
      <div class="grid g2 mb">${card('Average Response Time by Approver (days)', hbars(rows.sort((a, b) => b.avg - a.avg).slice(0, 10).map(r => ({ label: r.u.name, value: +r.avg.toFixed(1), display: r.avg.toFixed(1) + 'd' })), { color: '#f59e0b' }))}${card('Decisions by Approver', vbars(rows.slice(0, 8).map(r => r.u.name.split(' ')[0]), [{ label: 'Approved', data: rows.slice(0, 8).map(r => r.approved), color: '#16a34a' }, { label: 'Returned', data: rows.slice(0, 8).map(r => r.returned), color: '#f59e0b' }, { label: 'Rejected', data: rows.slice(0, 8).map(r => r.rejected), color: '#dc2626' }]))}</div>
      <div class="card"><table class="tbl"><thead><tr><th>Approver</th><th>Role / Title</th><th>Assigned</th><th>Approved</th><th>Returned</th><th>Rejected</th><th>Pending</th><th>Avg. Response</th><th>Within SLA</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="row">${avatar(r.u, 'sm')} ${esc(r.u.name)}</span></td><td class="small">${esc(r.u.title)}</td><td>${r.assigned}</td><td>${r.approved}</td><td>${r.returned}</td><td>${r.rejected}</td><td>${r.pending}</td><td>${r.avg.toFixed(1)} days</td><td><div class="row" style="min-width:120px"><div class="prog"><div style="width:${r.rate * 100}%;background:${r.rate > .85 ? 'var(--green)' : r.rate > .6 ? 'var(--orange)' : 'var(--red)'}"></div></div><span class="xs">${pct(r.onTime, r.decided, 0)}</span></div></td></tr>`).join('') || '<tr><td colspan="9" class="empty">No data</td></tr>'}</tbody></table></div>`;
    exportFn = () => exportCSV('report-approval-performance.csv', ['Approver', 'Title', 'Assigned', 'Approved', 'Returned', 'Rejected', 'Pending', 'Avg Response (days)', 'Within SLA %'], rows.map(r => [r.u.name, r.u.title, r.assigned, r.approved, r.returned, r.rejected, r.pending, r.avg.toFixed(2), (r.rate * 100).toFixed(1)]));
  }
  if (tab === 'category') {
    const rows = DB.categories.map(c => { const ms = memos.filter(m => m.categoryId === c.id); return { c, total: ms.length, active: ms.filter(m => m.status === 'Active').length, pending: ms.filter(m => m.status === 'Pending Approval').length, sup: ms.filter(m => m.status === 'Superseded').length, arch: ms.filter(m => m.status === 'Archived').length }; }).sort((a, b) => b.total - a.total);
    const segs = rows.filter(r => r.total).map(r => ({ label: r.c.name, value: r.total, color: r.c.color }));
    body = `<div class="grid g2 mb">${card('Distribution', `<div class="row" style="gap:16px;flex-wrap:wrap">${donut(segs, { size: 180, center: String(memos.length), sub: 'Memos' })}${legendList(segs)}</div>`)}${card('Memos per Category', hbars(rows.filter(r => r.total).map(r => ({ label: r.c.name, value: r.total, color: r.c.color, icon: catIcon(r.c, 22) })), { showPct: true }))}</div>
      <div class="card"><table class="tbl"><thead><tr><th>Category</th><th>Total</th><th>Active</th><th>Pending</th><th>Superseded</th><th>Archived</th><th>Share</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="row">${catIcon(r.c, 26)} ${esc(r.c.name)}</span></td><td><b>${r.total}</b></td><td>${r.active}</td><td>${r.pending}</td><td>${r.sup}</td><td>${r.arch}</td><td>${pct(r.total, memos.length)}</td></tr>`).join('')}</tbody></table></div>`;
    exportFn = () => exportCSV('report-category-breakdown.csv', ['Category', 'Total', 'Active', 'Pending', 'Superseded', 'Archived'], rows.map(r => [r.c.name, r.total, r.active, r.pending, r.sup, r.arch]));
  }
  if (tab === 'turnaround') {
    const rel = memos.filter(m => m.releasedAt);
    const per = DB.departments.map(d => { const ms = rel.filter(m => m.deptId === d.id); const ap = ms.map(m => { const s = m.history.find(h => h.action === 'Submitted for Approval'); const e = m.approvals.at(-1)?.date; return s && e ? daysBetween(s.date, e) : null; }).filter(x => x != null); return { d, n: ms.length, create2rel: avg(ms.map(m => daysBetween(m.createdAt, m.releasedAt))), approval: avg(ap) }; }).filter(r => r.n);
    const stage = [0, 1, 2, 3, 4].map(l => avg(dec.filter(x => x.a.level === l + 1).map(x => x.hrs)));
    body = `<div class="grid g4 mb">${statCard('blue', 'clock', 'Avg. Approval Turnaround', avg(tat).toFixed(1) + ' days', 'Submission → final approval')}${statCard('green', 'send', 'Avg. Creation to Release', avg(rel.map(m => daysBetween(m.createdAt, m.releasedAt))).toFixed(1) + ' days', 'End-to-end cycle time')}${statCard('orange', 'hourglass', 'Fastest Approval', (tat.length ? Math.min(...tat) : 0).toFixed(1) + ' days', 'Best case')}${statCard('red', 'hourglass', 'Slowest Approval', (tat.length ? Math.max(...tat) : 0).toFixed(1) + ' days', 'Worst case')}</div>
      <div class="grid g2 mb">${card('Avg. Turnaround by Department (days)', vbars(per.map(r => r.d.code), [{ label: 'Approval', data: per.map(r => +r.approval.toFixed(1)), color: '#1d4ed8' }, { label: 'Creation → Release', data: per.map(r => +r.create2rel.toFixed(1)), color: '#16a34a' }]))}${card('Avg. Time per Approval Level (days)', hbars(stage.map((v, i) => ({ label: 'Level ' + (i + 1), value: +v.toFixed(2), display: v.toFixed(1) + 'd' })).filter(x => x.value), { color: '#7c5cd6' }))}</div>
      <div class="card"><table class="tbl"><thead><tr><th>Department</th><th>Memos Released</th><th>Avg. Approval Time</th><th>Avg. Creation → Release</th></tr></thead><tbody>${per.map(r => `<tr><td>${esc(r.d.name)}</td><td>${r.n}</td><td>${r.approval.toFixed(1)} days</td><td>${r.create2rel.toFixed(1)} days</td></tr>`).join('')}</tbody></table></div>`;
    exportFn = () => exportCSV('report-turnaround.csv', ['Department', 'Released', 'Avg Approval Days', 'Avg Creation to Release Days'], per.map(r => [r.d.name, r.n, r.approval.toFixed(2), r.create2rel.toFixed(2)]));
  }
  if (tab === 'sla') {
    const on = dec.filter(d => d.onTime).length, br = dec.length - on;
    const byLevel = [1, 2, 3, 4, 5].map(l => { const x = dec.filter(d => d.a.level === l); return { label: 'Level ' + l, value: x.length ? Math.round(x.filter(d => d.onTime).length / x.length * 100) : 0, n: x.length }; }).filter(x => x.n);
    body = `<div class="grid g4 mb">${statCard('green', 'shieldc', 'SLA Compliance', pct(on, dec.length), 'Decisions within SLA')}${statCard('blue', 'checkc', 'Within SLA', on, 'Decisions')}${statCard('orange', 'clock', 'Breached SLA', br, 'Decisions')}${statCard('red', 'hourglass', 'Currently Overdue', overdueNow.length, 'Pending approvals past due')}</div>
      <div class="grid g2 mb">${card('Compliance', `<div class="row" style="gap:16px">${donut([{ label: 'Within SLA', value: on, color: '#16a34a' }, { label: 'Breached', value: br, color: '#dc2626' }], { size: 170, center: pct(on, dec.length, 0), sub: 'Compliance' })}${legendList([{ label: 'Within SLA', value: on, color: '#16a34a' }, { label: 'Breached', value: br, color: '#dc2626' }])}</div>`)}${card('Compliance by Approval Level', hbars(byLevel.map(x => ({ ...x, display: x.value + '%' })), { max: 100, color: '#16a34a' }))}</div>
      <div class="card"><div class="card-pad" style="padding-bottom:8px"><h3>Currently Overdue Approvals</h3></div><table class="tbl"><thead><tr><th>Memo No.</th><th>Title</th><th>Approver</th><th>Level</th><th>Due Date</th><th>Overdue By</th><th>Escalation To</th></tr></thead><tbody>${overdueNow.map(m => { const a = m.approvals[m.currentLevel]; return `<tr><td>${memoLink(m)}</td><td>${esc(m.subject)}</td><td>${esc(userById(a.userId).name)}</td><td>${a.level}</td><td>${fmtDT(a.due)}</td><td class="red">${daysBetween(a.due, NOW()).toFixed(1)} days</td><td>${esc(userById(wfById(m.workflowId)?.escalateTo).name)}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">No overdue approvals 🎉</td></tr>'}</tbody></table></div>`;
    exportFn = () => exportCSV('report-sla.csv', ['Memo No', 'Title', 'Level', 'Approver', 'Received', 'Due', 'Decided', 'Within SLA'], dec.map(d => [d.m.no, d.m.subject, d.a.level, userById(d.a.userId).name, fmtDT(d.a.receivedAt), fmtDT(d.a.due), fmtDT(d.a.date), d.onTime ? 'Yes' : 'No']));
  }
  if (tab === 'acknowledgement') {
    const rel = memos.filter(m => m.releasedAt && m.requireAck && new Date(m.releasedAt) <= NOW());
    const per = DB.departments.map(d => { let tot = 0, ack = 0, over = 0; rel.forEach(m => recipientsOf(m).forEach(id => { if (userById(id).deptId === d.id) { tot++; if (m.acks[id]) ack++; else if (ackDueDate(m) < NOW()) over++; } })); return { d, tot, ack, over, rate: tot ? ack / tot : 0 }; }).filter(r => r.tot);
    const T = per.reduce((a, r) => ({ tot: a.tot + r.tot, ack: a.ack + r.ack, over: a.over + r.over }), { tot: 0, ack: 0, over: 0 });
    body = `<div class="grid g4 mb">${statCard('blue', 'users', 'Total Acknowledgements Required', T.tot.toLocaleString(), 'Across ' + rel.length + ' memos')}${statCard('green', 'checkc', 'Acknowledged', T.ack.toLocaleString(), pct(T.ack, T.tot) + ' compliance')}${statCard('orange', 'clock', 'Pending', (T.tot - T.ack - T.over).toLocaleString(), 'Within due date')}${statCard('red', 'hourglass', 'Overdue', T.over.toLocaleString(), 'Past due date')}</div>
      <div class="grid g2 mb">${card('Compliance by Department', hbars(per.sort((a, b) => b.rate - a.rate).map(r => ({ label: r.d.name, value: Math.round(r.rate * 100), display: Math.round(r.rate * 100) + '%', color: r.rate > .9 ? '#16a34a' : r.rate > .75 ? '#f59e0b' : '#dc2626' })), { max: 100 }))}
      ${card('Lowest Compliance Memos', `<table class="tbl compact"><thead><tr><th>Memo</th><th>Released</th><th>Rate</th></tr></thead><tbody>${rel.map(m => ({ m, s: ackStats(m) })).sort((a, b) => a.s.rate - b.s.rate).slice(0, 8).map(({ m, s }) => `<tr><td>${memoLink(m)}<div class="sub">${esc(m.subject)}</div></td><td>${fmtDate(m.releasedAt)}</td><td><div class="row" style="min-width:110px"><div class="prog"><div style="width:${s.rate * 100}%;background:var(--green)"></div></div><span class="xs">${pct(s.ack, s.total, 0)}</span></div></td></tr>`).join('')}</tbody></table>`)}</div>
      <div class="card"><table class="tbl"><thead><tr><th>Department</th><th>Required</th><th>Acknowledged</th><th>Overdue</th><th>Compliance</th></tr></thead><tbody>${per.map(r => `<tr><td>${esc(r.d.name)}</td><td>${r.tot}</td><td>${r.ack}</td><td class="${r.over ? 'red' : ''}">${r.over}</td><td><b>${pct(r.ack, r.tot)}</b></td></tr>`).join('')}</tbody></table></div>`;
    exportFn = () => exportCSV('report-acknowledgement.csv', ['Department', 'Required', 'Acknowledged', 'Overdue', 'Compliance %'], per.map(r => [r.d.name, r.tot, r.ack, r.over, (r.rate * 100).toFixed(1)]));
  }

  el.innerHTML = `<div class="row mb" style="justify-content:flex-end"><button class="btn" id="save-rep">${icon('save')} Save to Recent Reports</button><button class="btn primary" id="exp-rep">${icon('download')} Export Report (CSV)</button><button class="btn" onclick="window.print()">${icon('printer')} Print</button></div>
  <div class="grid g4 mb">${statCard('blue', 'memo', 'Total Memos', memos.length.toLocaleString(), 'In selected period')}${statCard('green', 'checkc', 'Approved Memos', approvedM.length.toLocaleString(), pct(approvedM.length, memos.length) + ' of total memos')}${statCard('orange', 'clock', 'Average Turnaround Time', avg(tat).toFixed(1) + ' days', 'Submission to approval')}${statCard('purple', 'calendar', 'Overdue Approvals', overdueNow.length, 'Currently past due')}</div>
  <div class="card mb"><div class="tabs">${REPORT_TABS.map(([k, l]) => `<a class="tab ${tab === k ? 'active' : ''}" href="#/reports/${k}" style="text-decoration:none">${l}</a>`).join('')}</div>
  <div class="filters"><div class="field" style="flex:0 1 170px"><label>From</label><input type="date" class="inp" id="r-from" value="${RF.from}"></div><div class="field" style="flex:0 1 170px"><label>To</label><input type="date" class="inp" id="r-to" value="${RF.to}"></div>
  <div class="field"><label>Department</label><select class="inp" id="r-dept">${selectOpts(DB.departments.map(d => [d.id, d.name]), RF.dept, 'All Departments')}</select></div><div class="field"><label>Category</label><select class="inp" id="r-cat">${selectOpts(DB.categories.map(c => [c.id, c.name]), RF.cat, 'All Categories')}</select></div>
  <div class="row">${[['This Month', 0], ['Last 3 Months', 2], ['This Year', 'y']].map(([l, v]) => `<button class="btn sm" data-rng="${v}">${l}</button>`).join('')}</div><button class="btn" id="r-reset">${icon('reset')} Reset</button></div></div>
  ${body}`;
  ['from', 'to', 'dept', 'cat'].forEach(k => $('#r-' + k, el).onchange = e => { RF[k] = e.target.value; rerender(); });
  $$('[data-rng]', el).forEach(b => b.onclick = () => { const d = new Date(); const v = b.dataset.rng; RF.from = toInputDate((v === 'y' ? new Date(d.getFullYear(), 0, 1) : new Date(d.getFullYear(), d.getMonth() - +v, 1)).toISOString()); RF.to = toInputDate(d.toISOString()); rerender(); });
  $('#r-reset', el).onclick = () => { const d = new Date(); Object.assign(RF, { from: toInputDate(new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString()), to: toInputDate(d.toISOString()), dept: '', cat: '' }); rerender(); };
  $('#exp-rep', el).onclick = () => exportFn && exportFn();
  $('#save-rep', el).onclick = () => { const name = REPORT_TABS.find(x => x[0] === tab)[1] + ' Report'; DB.reports.unshift({ id: uid('r'), name, description: `${name} for ${fmtDate(RF.from)} – ${fmtDate(RF.to)}`, by: DB.currentUserId, date: iso(NOW()), range: `${fmtDate(RF.from)} – ${fmtDate(RF.to)}`, tab }); audit('Reports', 'Report Generated', name + ' generated.'); saveDB(); toast('Report saved to Recent Reports.'); };
  const label = REPORT_TABS.find(x => x[0] === tab)?.[1] || 'Overview';
  return { title: 'Reports', crumbs: [['Home', '#/dashboard'], ['Reports', '#/reports/overview'], [label]] };
};

// ---------- Help ----------
PAGES.help = ({ el }) => {
  const faqs = [
    ['How do I create a memo?', 'Go to Memos → All Memos → Create Memo (or Dashboard → Quick Actions). Fill in the memo information, recipients and content, then click "Next: Review Memo". Review it, then Submit for Approval.'],
    ['How does the approval workflow work?', 'Each memo follows an approval workflow (set in Administration → Workflow Configuration). The memo moves level by level. Each approver can Approve, Return for Revision, Reject or Delegate. Once the final approver approves, the author can release the memo.'],
    ['How do I release a memo?', 'After full approval, the memo appears in Memos → My Releases → Ready for Release. Open it, confirm the release date, recipients and acknowledgement settings, then click Release Now (or Schedule Release).'],
    ['How do I acknowledge a memo?', 'Released memos that require acknowledgement appear under Memos → My Acknowledgements and in My Tasks. Click Acknowledge and confirm.'],
    ['How do I revise an active memo?', 'Open the memo and click "Create Revision". A new draft is created with the next version number. When the revision is released, the original is automatically marked as Superseded.'],
    ['How can I test the workflow as different people?', 'Click your name (top right) → "Switch User (demo)". Log in as the approver shown on the memo, approve it, then switch back to release it.'],
    ['Where is my data stored?', 'In this prototype, all data is stored in this web browser on this computer. Use Administration → Backup & Recovery to download a backup file or restore one.'],
  ];
  el.innerHTML = `<div class="grid g-main-side"><div class="card card-pad"><h3 class="mb">Frequently Asked Questions</h3>${faqs.map(([q, a]) => `<details style="border-bottom:1px solid var(--border-2);padding:12px 0"><summary style="cursor:pointer;font-weight:600">${esc(q)}</summary><p class="t2" style="margin:10px 0 0;line-height:1.6">${esc(a)}</p></details>`).join('')}</div>
  <div><div class="card card-pad mb"><h3 class="mb">Memo Lifecycle</h3><div class="tl">${[['Draft', 'Author prepares the memo'], ['Submitted', 'Routed to the approval workflow'], ['Approval', 'Approved level by level (with SLA)'], ['Approved', 'Ready for release'], ['Released (Active)', 'Recipients notified & acknowledge'], ['Superseded / Archived', 'Replaced by a revision or archived']].map(([a, b], i) => `<div class="tl-i"><div class="dotc cur">${i + 1}</div><div><b>${a}</b><div class="small t2">${b}</div></div></div>`).join('')}</div></div>
  <div class="card card-pad"><h3 class="mb">Contact Support</h3><div class="kv"><span class="k">Email</span><span>:</span><span>ictsupport@leonio.com</span><span class="k">Local</span><span>:</span><span>ICT Helpdesk</span><span class="k">Hours</span><span>:</span><span>Mon–Fri, 8:00 AM – 5:00 PM</span></div></div></div></div>`;
  return { title: 'Help & Support', crumbs: [['Home', '#/dashboard'], ['Help & Support']] };
};
