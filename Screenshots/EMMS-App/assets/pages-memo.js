// ============ Memo pages ============
const memoLink = (m) => `<a href="#/memo/${m.id}">${esc(m.no)}</a>`;
const pdfCell = (m) => `<span class="row" style="gap:10px"><span class="pdf-ic" style="width:20px">${icon('memo')}</span>${memoLink(m)}</span>`;
function memoRowMenu(btn, m) {
  const items = [{ label: 'View Details', icon: 'eye', onClick: () => location.hash = '#/memo/' + m.id }];
  if (['Draft', 'Returned', 'Rejected'].includes(m.status) && m.createdBy === DB.currentUserId) items.push({ label: 'Edit', icon: 'edit', onClick: () => location.hash = '#/edit/' + m.id });
  items.push({ label: 'Print / Download PDF', icon: 'printer', onClick: () => printMemo(m) });
  items.push({ label: 'Copy Link', icon: 'link', onClick: () => copyLink(m) });
  if (m.status === 'Active' && can('memo.create')) items.push({ label: 'Create Revision', icon: 'copy', onClick: () => { const c = MemoActions.revise(m); toast('Revision draft ' + c.no + ' created.'); location.hash = '#/edit/' + c.id; } });
  if (can('memo.archive') && ['Active', 'Superseded'].includes(m.status)) items.push('-', { label: 'Archive', icon: 'archive', onClick: async () => { if (await confirmBox('Archive memo', `Archive <b>${esc(m.no)}</b>? It will be moved to the archive.`, 'Archive')) { MemoActions.setStatus(m, 'Archived'); toast('Memo archived.'); rerender(); } } });
  if (can('memo.archive') && m.status === 'Archived') items.push('-', { label: 'Restore to Active', icon: 'refresh', onClick: () => { MemoActions.setStatus(m, 'Active'); toast('Memo restored.'); rerender(); } });
  if (m.status === 'Draft' && m.createdBy === DB.currentUserId) items.push('-', { label: 'Delete Draft', icon: 'trash', danger: true, onClick: async () => { if (await confirmBox('Delete draft', `Delete draft <b>${esc(m.subject)}</b>? This cannot be undone.`, 'Delete', true)) { MemoActions.remove(m); toast('Draft deleted.'); rerender(); } } });
  popMenu(btn, items);
}
function copyLink(m) { const url = location.href.split('#')[0] + '#/memo/' + m.id; navigator.clipboard?.writeText(url).then(() => toast('Link copied to clipboard.'), () => toast(url)); }
function trackRecent(m) { DB.recent = [m.id, ...(DB.recent || []).filter(x => x !== m.id)].slice(0, 8); m.views = (m.views || 0) + 1; saveDB(); }

// ---------- All Memos ----------
const MF = { q: '', status: '', cat: '', dept: '', from: '', to: '', tab: 'all', view: 'table', adv: false, priority: '', author: '', type: '' };
function filterMemos(list, f) {
  const q = (f.q || '').toLowerCase();
  return list.filter(m => {
    if (q && !(`${m.no} ${m.subject} ${m.keywords || ''} ${catById(m.categoryId).name} ${deptById(m.deptId).name} ${(m.content || '').replace(/<[^>]+>/g, ' ')}`.toLowerCase().includes(q))) return false;
    if (f.status && memoStatus(m) !== f.status && m.status !== f.status) return false;
    if (f.cat && m.categoryId !== f.cat) return false;
    if (f.dept && m.deptId !== f.dept) return false;
    if (f.priority && m.priority !== f.priority) return false;
    if (f.author && m.createdBy !== f.author) return false;
    if (f.type && m.type !== f.type) return false;
    const d = (m.releasedAt || m.createdAt).slice(0, 10);
    if (f.from && d < f.from) return false; if (f.to && d > f.to) return false;
    return true;
  });
}
const MEMO_TABS = [['all', 'All Memos', m => !['Draft'].includes(m.status) || m.createdBy === DB.currentUserId], ['Active', 'Active', m => m.status === 'Active'], ['Pending Approval', 'Pending Approval', m => m.status === 'Pending Approval'], ['Draft', 'Draft', m => m.status === 'Draft' && m.createdBy === DB.currentUserId], ['Superseded', 'Superseded', m => m.status === 'Superseded'], ['Archived', 'Archived', m => m.status === 'Archived']];

function memoFilterBar(f, opts = {}) {
  return `<div class="filters">
    <div class="field search"><input class="inp" id="f-q" placeholder="Search by keyword, title, memo no., etc." value="${esc(f.q)}">${icon('search')}</div>
    ${opts.noStatus ? '' : `<div class="field"><label>Status</label><select class="inp" id="f-status">${selectOpts(['Active', 'Pending Approval', 'Approved', 'Draft', 'Returned', 'Rejected', 'Scheduled', 'Superseded', 'Archived', 'Expired'], f.status, 'All Statuses')}</select></div>`}
    <div class="field"><label>Category</label><select class="inp" id="f-cat">${selectOpts(DB.categories.map(c => [c.id, c.name]), f.cat, 'All Categories')}</select></div>
    <div class="field"><label>Department</label><select class="inp" id="f-dept">${selectOpts(DB.departments.map(d => [d.id, d.name]), f.dept, 'All Departments')}</select></div>
    <div class="field" style="flex:0 1 150px"><label>From</label><input type="date" class="inp" id="f-from" value="${f.from}"></div>
    <div class="field" style="flex:0 1 150px"><label>To</label><input type="date" class="inp" id="f-to" value="${f.to}"></div>
    ${opts.noAdv ? '' : `<button class="btn" id="f-adv">${icon('filter')} Filters</button>`}
    <button class="btn" id="f-reset">${icon('reset')} Reset</button>
    ${f.adv ? `<div style="flex-basis:100%;display:flex;gap:12px;flex-wrap:wrap">
      <div class="field" style="flex:1 1 160px"><label>Priority</label><select class="inp" id="f-priority">${selectOpts(DB.settings.priorities, f.priority, 'All Priorities')}</select></div>
      <div class="field" style="flex:1 1 160px"><label>Memo Type</label><select class="inp" id="f-type">${selectOpts(DB.settings.memoTypes, f.type, 'All Types')}</select></div>
      <div class="field" style="flex:1 1 200px"><label>Author</label><select class="inp" id="f-author">${selectOpts(DB.users.map(u => [u.id, u.name]), f.author, 'All Authors')}</select></div>
    </div>` : ''}
  </div>`;
}
function wireFilterBar(f, root) {
  const bind = (id, key, ev = 'change') => { const e = $('#' + id, root); if (e) e.addEventListener(ev, () => { f[key] = e.value; Object.values(TableState).forEach(s => s.page = 1); rerender(); }); };
  const q = $('#f-q', root); let tmr; q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { f.q = q.value; Object.values(TableState).forEach(s => s.page = 1); rerender(); const n = $('#f-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); });
  bind('f-status', 'status'); bind('f-cat', 'cat'); bind('f-dept', 'dept'); bind('f-from', 'from'); bind('f-to', 'to'); bind('f-priority', 'priority'); bind('f-type', 'type'); bind('f-author', 'author');
  const a = $('#f-adv', root); if (a) a.onclick = () => { f.adv = !f.adv; rerender(); };
  $('#f-reset', root).onclick = () => { Object.assign(f, { q: '', status: '', cat: '', dept: '', from: '', to: '', priority: '', type: '', author: '' }); rerender(); };
}
function memoColumns(extra = {}) {
  return [
    { key: 'no', label: 'Memo No.', render: pdfCell },
    { key: 'subject', label: 'Title', render: m => esc(m.subject) },
    { key: 'cat', label: 'Category', render: m => esc(catById(m.categoryId).name), sortVal: m => catById(m.categoryId).name },
    { key: 'dept', label: 'Department', render: m => esc(deptById(m.deptId).name), sortVal: m => deptById(m.deptId).name },
    { key: 'status', label: 'Status', render: m => badge(memoStatus(m)) },
    { key: 'effectiveDate', label: 'Effective Date', render: m => m.releasedAt ? fmtDate(m.effectiveDate) : '-' },
    { key: 'issued', label: 'Date Issued', render: m => fmtDate(m.releasedAt || m.createdAt), sortVal: m => m.releasedAt || m.createdAt },
    { label: 'Actions', render: m => `<span class="row" style="gap:2px"><button class="icon-btn" title="View" onclick="location.hash='#/memo/${m.id}'">${icon('eye')}</button><button class="icon-btn" data-menu="${m.id}">${icon('dots')}</button></span>` },
  ];
}
function wireMenus(root) { $$('[data-menu]', root).forEach(b => b.onclick = e => { e.stopPropagation(); memoRowMenu(b, memoById(b.dataset.menu)); }); }
function memoCard(m) { const c = catById(m.categoryId); return `<div class="mini-card" onclick="location.hash='#/memo/${m.id}'" style="flex-direction:column;gap:8px"><div class="row">${catIcon(c, 30)}<div style="flex:1;min-width:0"><div class="small"><a>${esc(m.no)}</a></div><div class="xs t2">${esc(c.name)}</div></div>${badge(memoStatus(m))}</div><b style="font-size:14px">${esc(m.subject)}</b><div class="xs t2" style="height:34px;overflow:hidden">${esc((m.content || '').replace(/<[^>]+>/g, ' ').slice(0, 120))}…</div><div class="row xs t2">${icon('calendar')} ${fmtDate(m.releasedAt || m.createdAt)}<span class="spacer"></span>${esc(deptById(m.deptId).code)}</div></div>`; }

PAGES.memos = ({ el, query }) => {
  if (query.tab) { MF.tab = query.tab; }
  const base = DB.memos.filter(MEMO_TABS[0][2]);
  const filtered = filterMemos(base, MF);
  const tabDef = MEMO_TABS.find(t => t[0] === MF.tab) || MEMO_TABS[0];
  const rows = filtered.filter(tabDef[2]);
  const t = dataTable({ id: 'memos', rows, columns: memoColumns(), defaultSort: 'issued', defaultDir: 'desc', onRow: m => location.hash = '#/memo/' + m.id });
  el.innerHTML = `<div class="card">
    <div class="card-pad row" style="padding-bottom:0"><div style="flex:1"><h2 style="font-size:20px">All Memos</h2><div class="t2" style="margin-top:4px">View and manage all company memoranda in the system.</div></div>
      ${can('memo.create') ? `<button class="btn primary lg" id="new-memo">${icon('plus')} Create Memo ${icon('chevron')}</button>` : ''}</div>
    ${memoFilterBar(MF)}
    <div class="tabs">${MEMO_TABS.map(([k, l, fn]) => `<div class="tab ${MF.tab === k ? 'active' : ''}" data-tab="${k}">${l} (${filtered.filter(fn).length})</div>`).join('')}</div>
    <div class="row" style="padding:14px 20px"><span class="t2">${rows.length.toLocaleString()} memo(s) found</span><span class="spacer"></span>
      <button class="btn" id="export">${icon('download')} Export</button>
      <button class="btn ${MF.view === 'table' ? 'primary' : ''}" data-view="table" title="Table view">${icon('rows')}</button>
      <button class="btn ${MF.view === 'grid' ? 'primary' : ''}" data-view="grid" title="Repository view">${icon('grid')}</button></div>
    <div id="memo-list">${MF.view === 'grid' ? `<div class="repo-grid">${rows.slice(0, 60).map(memoCard).join('') || '<div class="empty">No memos found.</div>'}</div>${rows.length > 60 ? '<div class="small t2" style="padding:0 20px 16px">Showing first 60 – refine your search to see more.</div>' : ''}` : t.html}</div>
  </div>`;
  t.mount(el, rerender); wireMenus(el); wireFilterBar(MF, el);
  $$('[data-tab]', el).forEach(x => x.onclick = () => { MF.tab = x.dataset.tab; TableState.memos.page = 1; if (query.tab) location.hash = '#/memos'; else rerender(); });
  $$('[data-view]', el).forEach(x => x.onclick = () => { MF.view = x.dataset.view; rerender(); });
  $('#export', el).onclick = () => exportCSV('memos.csv', ['Memo No', 'Title', 'Category', 'Department', 'Status', 'Priority', 'Effective Date', 'Date Issued', 'Author'], rows.map(m => [m.no, m.subject, catById(m.categoryId).name, deptById(m.deptId).name, memoStatus(m), m.priority, m.effectiveDate, fmtDate(m.releasedAt || m.createdAt), userById(m.createdBy).name]));
  const nb = $('#new-memo', el); if (nb) nb.onclick = () => popMenu(nb, [{ label: 'Blank Memo', icon: 'plus', onClick: () => location.hash = '#/create' }, '-', ...DB.templates.filter(t => t.status === 'Active').map(t => ({ label: 'From template: ' + t.name, icon: 'template', onClick: () => location.hash = '#/create?template=' + t.id }))]);
  return { title: 'All Memos', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['All Memos']] };
};
PAGES.search = ({ el, query }) => { MF.q = query.q || ''; MF.tab = 'all'; if (TableState.memos) TableState.memos.page = 1; location.replace('#/memos'); return { title: 'Search' }; };

// ---------- Create / Edit ----------
let DRAFT = null; // working copy of memo in editor
function blankMemo() {
  const u = me();
  return { subject: '', purpose: '', type: 'Memorandum', categoryId: '', deptId: u.deptId, priority: DB.settings.defaultPriority, to: ['all'], cc: [], reference: '', effectiveDate: toInputDate(new Date(Date.now() + DAY).toISOString()), expiryDate: '', releaseDate: toInputDT(new Date(Date.now() + DAY).setHours(9, 0, 0, 0)), content: '', attachments: [], workflowId: DB.workflows[0].id, initialApprover: DB.workflows[0].steps[0].userId, requireAck: true, ackDueDays: DB.settings.defaultAckDays, notify: true, notifyWho: 'All Recipients', urgent: false, confidentiality: 'Internal Use', keywords: '', setExpiry: false };
}
function recipientPicker(id, list) {
  const opts = [['all', 'All Employees'], ...DB.departments.map(d => ['dept:' + d.id, d.name]), ...DB.users.filter(u => u.status !== 'Inactive').map(u => ['user:' + u.id, u.name + ' (' + u.title + ')'])].filter(o => !list.includes(o[0]));
  return `<div class="chips" id="${id}">${list.map(t => `<span class="chip">${esc(recipientLabel(t))}<button data-rm="${esc(t)}">×</button></span>`).join('')}<select data-add><option value="">+ Add recipient…</option><optgroup label="Everyone">${opts.filter(o => o[0] === 'all').map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</optgroup><optgroup label="Departments">${opts.filter(o => o[0].startsWith('dept:')).map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</optgroup><optgroup label="Individuals">${opts.filter(o => o[0].startsWith('user:')).map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</optgroup></select></div>`;
}
function editorHTML(content) {
  return `<div class="editor"><div class="ed-tools">
    <select data-block><option value="p">Paragraph</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="h4">Heading 3</option></select>
    <button data-cmd="bold" title="Bold"><b>B</b></button><button data-cmd="italic" title="Italic"><i>I</i></button><button data-cmd="underline" title="Underline"><u>U</u></button><button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button><span class="sep"></span>
    <button data-cmd="justifyLeft" title="Align left">⯇</button><button data-cmd="justifyCenter" title="Center">≡</button><button data-cmd="justifyRight" title="Align right">⯈</button><span class="sep"></span>
    <button data-cmd="insertOrderedList" title="Numbered list">1.</button><button data-cmd="insertUnorderedList" title="Bullet list">•</button><button data-cmd="indent" title="Indent">⇥</button><button data-cmd="outdent" title="Outdent">⇤</button><span class="sep"></span>
    <button data-cmd="createLink" title="Insert link">${icon('link')}</button><button data-cmd="insertTable" title="Insert table">${icon('table')}</button><button data-cmd="removeFormat" title="Clear formatting">✕</button>
  </div><div class="ed-area" contenteditable="true" id="ed-area">${content || ''}</div></div>`;
}
function wireEditor(root) {
  const area = $('#ed-area', root);
  $$('.ed-tools [data-cmd]', root).forEach(b => b.onmousedown = e => {
    e.preventDefault(); const c = b.dataset.cmd;
    if (c === 'createLink') { const u = prompt('Link URL:'); if (u) document.execCommand('createLink', false, u); }
    else if (c === 'insertTable') { const r = +prompt('Rows?', '3') || 3, cl = +prompt('Columns?', '3') || 3; document.execCommand('insertHTML', false, `<table border="1" style="border-collapse:collapse;width:100%">${Array.from({ length: r }, () => '<tr>' + Array.from({ length: cl }, () => '<td style="padding:6px">&nbsp;</td>').join('') + '</tr>').join('')}</table><p></p>`); }
    else document.execCommand(c, false, null);
    area.focus();
  });
  $('.ed-tools [data-block]', root).onchange = e => { area.focus(); document.execCommand('formatBlock', false, e.target.value); };
}
function readForm(root) {
  const v = id => $('#' + id, root)?.value;
  Object.assign(DRAFT, {
    type: v('m-type'), categoryId: v('m-cat'), priority: v('m-priority'), subject: v('m-subject').trim(), purpose: v('m-purpose').trim(),
    reference: v('m-ref').trim(), effectiveDate: v('m-eff'), content: $('#ed-area', root).innerHTML, workflowId: v('m-wf'), initialApprover: v('m-appr'),
    releaseDate: v('m-rel'), setExpiry: $('#m-setexp', root).checked, expiryDate: $('#m-setexp', root).checked ? v('m-exp') : '', requireAck: $('#m-ack', root).checked, ackDueDays: +v('m-ackdays') || 5,
    notify: $('#m-notify', root).checked, notifyWho: v('m-notifywho'), urgent: $('#m-urgent', root).checked, confidentiality: v('m-conf'), keywords: v('m-kw').trim(), deptId: v('m-dept'),
  });
  if (DRAFT.urgent) DRAFT.priority = 'Urgent';
}
function validateDraft(full) {
  const errs = [];
  if (!DRAFT.subject) errs.push('Subject / Title');
  if (full) { if (!DRAFT.categoryId) errs.push('Category'); if (!DRAFT.to.length) errs.push('For (recipients)'); if (!DRAFT.effectiveDate) errs.push('Effectivity Date'); if (!DRAFT.content.replace(/<[^>]+>|&nbsp;/g, '').trim()) errs.push('Memo Content'); }
  if (errs.length) { toast('Please complete: ' + errs.join(', '), true); return false; }
  return true;
}
function persistDraft() { const data = { ...DRAFT }; delete data.setExpiry; delete data._fresh; const m = MemoActions.saveDraft(data); DRAFT.id = m.id; DRAFT.no = m.no; return m; }

function memoForm({ el, parts, query }, mode) {
  if (mode === 'create' && (!DRAFT || DRAFT._fresh !== location.hash)) {
    DRAFT = blankMemo(); DRAFT._fresh = location.hash;
    if (query.template) { const t = DB.templates.find(x => x.id === query.template); if (t) { DRAFT.content = t.content; DRAFT.type = t.type; DRAFT.categoryId = t.categoryId; } }
  }
  if (mode === 'edit') {
    const m = memoById(parts[1]);
    if (!m) return PAGES.notfound({ el });
    if (!DRAFT || DRAFT.id !== m.id) { DRAFT = { ...blankMemo(), ...JSON.parse(JSON.stringify(m)) }; DRAFT.setExpiry = !!m.expiryDate; DRAFT.releaseDate = m.releaseDate ? toInputDT(m.releaseDate) : DRAFT.releaseDate; DRAFT.initialApprover = m.approvals?.[0]?.userId || wfById(m.workflowId)?.steps[0].userId; }
  }
  const d = DRAFT; const u = me(); const wf = wfById(d.workflowId) || DB.workflows[0];
  const approvers = DB.users.filter(x => x.status === 'Active' && roleById(x.roleId).perms.includes('memo.approve') && x.id !== u.id);
  const ret = d.id ? memoById(d.id) : null;
  el.innerHTML = `
  ${ret && (ret.status === 'Returned' || ret.status === 'Rejected') ? `<div class="info mb" style="background:#fff6e5;border-color:#f8d79b">${icon('info')}<div><b>${ret.status === 'Returned' ? 'Returned for revision' : 'Rejected'}</b> by ${esc(userById(ret.approvals[ret.currentLevel]?.userId).name)}: “${esc(ret.approvals[ret.currentLevel]?.comment || 'No comment')}” — update the memo and submit again.</div></div>` : ''}
  <div class="grid g-main-side">
   <div class="card card-pad">
    <h3 class="mb">Memo Information</h3>
    <div class="grid g3">
      <div class="field"><label>Memo Type <span class="req">*</span></label><select class="inp" id="m-type">${selectOpts(DB.settings.memoTypes, d.type)}</select></div>
      <div class="field"><label>Category <span class="req">*</span></label><select class="inp" id="m-cat">${selectOpts(DB.categories.filter(c => c.status === 'Active').map(c => [c.id, c.name]), d.categoryId, 'Select category')}</select></div>
      <div class="field"><label>Priority</label><select class="inp" id="m-priority">${selectOpts(DB.settings.priorities, d.priority)}</select></div>
    </div>
    <div class="field mt"><label>Subject / Title <span class="req">*</span></label><input class="inp" id="m-subject" value="${esc(d.subject)}" placeholder="e.g. Implementation of Multi-Factor Authentication (MFA)"></div>
    <div class="field mt"><label>Purpose / Objective</label><textarea class="inp" id="m-purpose" rows="3">${esc(d.purpose)}</textarea></div>
    <div class="grid g2 mt">
      <div class="field"><label>For <span class="req">*</span></label>${recipientPicker('to-pick', d.to)}</div>
      <div class="field"><label>Cc (Optional)</label>${recipientPicker('cc-pick', d.cc)}</div>
      <div class="field"><label>Issuing Department</label><select class="inp" id="m-dept">${selectOpts(DB.departments.map(x => [x.id, x.name]), d.deptId)}</select></div>
      <div class="field"><label>Reference (Optional)</label><input class="inp" id="m-ref" value="${esc(d.reference)}" placeholder="e.g. LGC-ICT-MM-2026-015"></div>
      <div class="field"><label>Effectivity Date <span class="req">*</span></label><input type="date" class="inp" id="m-eff" value="${esc(toInputDate(d.effectiveDate))}"></div>
      <div class="field"><label>Keywords / Tags</label><input class="inp" id="m-kw" value="${esc(d.keywords)}" placeholder="Comma separated, e.g. Security, MFA"></div>
    </div>
    <div class="field mt"><label>Attachments (Optional)</label>
      <div class="dropzone" id="dz">${icon('cloud')} Drag and drop files here or <a>click to browse</a><div class="xs">${esc(DB.settings.allowedFiles)} (Max. ${DB.settings.maxUploadMB}MB per file)</div></div>
      <input type="file" id="file-in" multiple hidden>
      <div id="att-list">${d.attachments.map((a, i) => `<div class="file-row">${fileIcon(a.name)}<span style="flex:1">${esc(a.name)} <span class="xs t2">${fmtSize(a.size)}</span></span><button class="icon-btn" data-rmatt="${i}">${icon('trash')}</button></div>`).join('')}</div>
    </div>
    <div class="field mt"><label>Memo Content <span class="req">*</span> <span class="row" style="display:inline-flex;float:right;gap:6px">${DB.templates.length ? `<select class="inp" id="tpl" style="width:auto;padding:4px 8px;font-size:12.5px"><option value="">Insert template…</option>${DB.templates.filter(t => t.status === 'Active').map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>` : ''}<button class="btn sm" id="ai-draft" title="Generate a starting draft from the subject and purpose">${icon('sparkles')} Draft from purpose</button></span></label>${editorHTML(d.content)}</div>
    <div class="row mt"><label class="check"><input type="checkbox" id="m-urgent" ${d.urgent ? 'checked' : ''}> Mark as Urgent</label><span class="spacer"></span>
      <button class="btn" onclick="history.back()">Cancel</button><button class="btn" id="save-draft">${icon('save')} Save as Draft</button><button class="btn primary" id="next">Next: Review Memo ${icon('arrowr')}</button></div>
   </div>
   <div>
    <div class="card card-pad mb"><h3 class="mb">Workflow</h3>
      <div class="field"><label>Approval Workflow <span class="req">*</span></label><select class="inp" id="m-wf">${selectOpts(DB.workflows.filter(w => w.status === 'Active').map(w => [w.id, w.name]), d.workflowId)}</select></div>
      <div class="field mt"><label>Initial Approver <span class="req">*</span></label><select class="inp" id="m-appr">${selectOpts(approvers.map(a => [a.id, `${a.name} (${a.title})`]), d.initialApprover)}</select></div>
      <div class="info mt">${icon('info')}<div>The memo will be routed to: ${wf.steps.map((s, i) => `<b>${esc(i === 0 ? userById(d.initialApprover || s.userId).name : userById(s.userId).name)}</b> <span class="t2">(${esc(s.label)})</span>`).join(' → ')}</div></div>
    </div>
    <div class="card card-pad mb"><h3 class="mb">Publishing Options</h3>
      <div class="field"><label>Release Date <span class="req">*</span></label><input type="datetime-local" class="inp" id="m-rel" value="${esc(d.releaseDate)}"></div>
      <label class="check mt"><input type="checkbox" id="m-setexp" ${d.setExpiry ? 'checked' : ''}> Set Expiry Date</label>
      <input type="date" class="inp" id="m-exp" style="margin-top:8px" value="${esc(toInputDate(d.expiryDate))}" ${d.setExpiry ? '' : 'disabled'}>
      <label class="check mt"><input type="checkbox" id="m-ack" ${d.requireAck ? 'checked' : ''}> Require Acknowledgement</label>
      <div class="field" style="margin-top:8px"><label>Acknowledgement Due (days)</label><input type="number" min="1" class="inp" id="m-ackdays" value="${d.ackDueDays}"></div>
      <label class="check mt"><input type="checkbox" id="m-notify" ${d.notify ? 'checked' : ''}> Send Email Notification</label>
      <div class="field" style="margin-top:8px"><label>Notify</label><select class="inp" id="m-notifywho">${selectOpts(['All Recipients', 'Department Heads Only', 'None'], d.notifyWho)}</select></div>
      <div class="field mt"><label>Confidentiality</label><select class="inp" id="m-conf">${selectOpts(DB.settings.confidentiality, d.confidentiality)}</select></div>
    </div>
    <div class="card card-pad"><h3 class="mb">Created By</h3><div class="row">${avatar(ret ? userById(ret.createdBy) : u, 'lg')}<div><b>${esc((ret ? userById(ret.createdBy) : u).name)}</b><div class="small t2">${esc(deptById((ret ? userById(ret.createdBy) : u).deptId).name)}</div><div class="small t2">${fmtDT(ret ? ret.createdAt : new Date())}</div></div></div>${ret ? `<div class="small t2 mt">Memo No: <b>${esc(ret.no)}</b> · Version ${esc(ret.version)}</div>` : ''}</div>
   </div>
  </div>`;
  wireEditor(el);
  const pick = (id, key) => { const box = $('#' + id, el); $$('[data-rm]', box).forEach(b => b.onclick = () => { readForm(el); DRAFT[key] = DRAFT[key].filter(x => x !== b.dataset.rm); rerender(); }); $('[data-add]', box).onchange = e => { if (!e.target.value) return; readForm(el); if (e.target.value === 'all') DRAFT[key] = ['all']; else DRAFT[key] = [...DRAFT[key].filter(x => x !== 'all' || key === 'cc'), e.target.value]; rerender(); }; };
  pick('to-pick', 'to'); pick('cc-pick', 'cc');
  $('#m-setexp', el).onchange = e => { $('#m-exp', el).disabled = !e.target.checked; };
  $('#m-wf', el).onchange = e => { readForm(el); DRAFT.initialApprover = wfById(e.target.value).steps[0].userId; rerender(); };
  $('#m-appr', el).onchange = () => { readForm(el); rerender(); };
  const tpl = $('#tpl', el); if (tpl) tpl.onchange = () => { const t = DB.templates.find(x => x.id === tpl.value); if (t) { const a = $('#ed-area', el); if (!a.innerText.trim() || confirm('Replace current content with the template?')) a.innerHTML = t.content; } tpl.value = ''; };
  $('#ai-draft', el).onclick = () => {
    readForm(el); if (!DRAFT.subject) { toast('Enter a Subject first.', true); return; }
    const cat = catById(DRAFT.categoryId).name; const dept = deptById(DRAFT.deptId).name;
    $('#ed-area', el).innerHTML = `<p>Please be informed that effective ${fmtLong(DRAFT.effectiveDate)}, the <b>${esc(DRAFT.subject)}</b> shall be implemented${cat !== '—' ? ' under the ' + esc(cat) + ' guidelines' : ''}.</p>${DRAFT.purpose ? `<p>${esc(DRAFT.purpose)}</p>` : ''}<p>Key points:</p><ol><li>[Key point 1]</li><li>[Key point 2]</li><li>[Key point 3]</li></ol><p>All concerned are expected to comply accordingly. For questions or clarifications, please contact the ${esc(dept)}.</p><p>Thank you.</p>`;
    toast('Starter draft inserted – edit the bracketed parts.');
  };
  // attachments
  const dz = $('#dz', el), fi = $('#file-in', el);
  const addFiles = async (files) => {
    readForm(el);
    for (const f of files) {
      if (f.size > DB.settings.maxUploadMB * 1048576) { toast(`${f.name} exceeds ${DB.settings.maxUploadMB}MB.`, true); continue; }
      const id = uid('att'); await FileStore.put(id, f); DRAFT.attachments.push({ id, name: f.name, size: f.size, type: f.type });
    }
    rerender();
  };
  dz.onclick = () => fi.click(); fi.onchange = () => addFiles([...fi.files]);
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag'); }; dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove('drag'); addFiles([...e.dataTransfer.files]); };
  $$('[data-rmatt]', el).forEach(b => b.onclick = () => { readForm(el); DRAFT.attachments.splice(+b.dataset.rmatt, 1); rerender(); });
  $('#save-draft', el).onclick = () => { readForm(el); if (!validateDraft(false)) return; const m = persistDraft(); toast('Draft saved: ' + m.no); location.hash = '#/edit/' + m.id; };
  $('#next', el).onclick = () => { readForm(el); if (!validateDraft(true)) return; const m = persistDraft(); location.hash = '#/review/' + m.id; };
  const title = mode === 'create' ? 'Create Memo' : 'Edit Memo';
  return { title, crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], [title]] };
}
PAGES.create = (ctx) => { if (!can('memo.create')) { ctx.el.innerHTML = '<div class="card card-pad empty">You do not have permission to create memos.</div>'; return { title: 'Create Memo' }; } return memoForm(ctx, 'create'); };
PAGES.edit = (ctx) => memoForm(ctx, 'edit');

function workflowPreview(m, { pendingFirst } = {}) {
  const wf = wfById(m.workflowId) || DB.workflows[0];
  const steps = m.approvals?.length && m.status !== 'Draft' && m.status !== 'Returned' && m.status !== 'Rejected' ? m.approvals.map(a => ({ label: a.label, userId: a.userId, status: a.status, date: a.date, due: a.due })) : wf.steps.map((s, i) => ({ label: s.label, userId: i === 0 ? (m.initialApprover || s.userId) : s.userId, status: i === 0 && pendingFirst ? 'Pending' : 'Waiting', due: i === 0 && pendingFirst ? pendingFirst : null }));
  return `<div class="tl"><div class="tl-i"><div class="dotc done">${icon('check')}</div><div style="flex:1"><div class="row"><b>${esc(userLabel(m.createdBy))}</b><span class="spacer"></span><span class="xs t2">${fmtDT(m.createdAt)}</span></div><div class="small t2">Creator</div></div></div>
    ${steps.map((s, i) => `<div class="tl-i"><div class="dotc ${s.status === 'Approved' ? 'done' : s.status === 'Pending' ? 'cur' : s.status === 'Rejected' ? 'bad' : s.status === 'Returned' ? 'warn' : ''}">${s.status === 'Approved' ? icon('check') : i + 2}</div><div style="flex:1"><div class="row"><b>${esc(userLabel(s.userId))}</b>${s.status !== 'Waiting' ? ' ' + badge(s.status) : ''}<span class="spacer"></span><span class="xs t2">${s.date ? fmtDT(s.date) : s.due ? 'Due: ' + fmtDate(s.due) : ''}</span></div><div class="small t2">${esc(s.label)}</div></div></div>`).join('')}</div>`;
}
function recipientsSummary(m) {
  const all = (m.to || []).includes('all'); const depts = (m.to || []).filter(t => t.startsWith('dept:')).length; const ind = (m.to || []).filter(t => t.startsWith('user:')).length;
  return `<div class="grid g3" style="text-align:center;border:1px solid var(--border);border-radius:8px;padding:14px 6px"><div><div class="row" style="justify-content:center">${icon('users')}<b style="font-size:20px">${recipientsOf(m).length}</b></div><div class="small t2">${all ? 'All Employees' : 'Total Recipients'}</div></div><div><div class="row" style="justify-content:center">${icon('building')}<b style="font-size:20px">${depts}</b></div><div class="small t2">Departments</div></div><div><div class="row" style="justify-content:center">${icon('user')}<b style="font-size:20px">${ind}</b></div><div class="small t2">Individuals</div></div></div>`;
}

// ---------- Review ----------
PAGES.review = ({ el, parts }) => {
  const m = memoById(parts[1]); if (!m) return PAGES.notfound({ el });
  const init = DRAFT && DRAFT.id === m.id ? DRAFT.initialApprover : null; m.initialApprover = init || m.initialApprover;
  el.innerHTML = `<div class="grid g-main-side"><div>
    <div class="info mb">${icon('info')}<div>Please review the memo details and content below. If everything looks correct, you may submit it for approval.</div></div>
    <div class="card" style="overflow:hidden">${memoDocHTML(m)}</div>
    <div class="row mt"><div class="info" style="flex:1">${icon('info')}<div>Once submitted, you will not be able to edit the memo details and content.</div></div>
      <button class="btn lg" onclick="location.hash='#/edit/${m.id}'">${icon('edit')} Back to Edit</button><button class="btn primary lg" id="go-submit">Submit for Approval ${icon('arrowr')}</button></div>
  </div><div>
    <div class="card card-pad mb"><h3 class="mb">Workflow Preview</h3>${workflowPreview(m)}<div class="info">${icon('info')}<div>The memo will be routed to the next approver after submission.</div></div></div>
    <div class="card card-pad mb"><div class="card-h"><h3>Memo Details</h3><button class="btn sm" onclick="location.hash='#/edit/${m.id}'">${icon('edit')} Edit</button></div>
      <div class="kv"><span class="k">Memo Type</span><span>:</span><span>${esc(m.type)}</span><span class="k">Category</span><span>:</span><span>${esc(catById(m.categoryId).name)}</span><span class="k">Priority</span><span>:</span><span>${esc(m.priority)}</span><span class="k">Target Audience</span><span>:</span><span>${esc(m.to.map(recipientLabel).join(', '))}</span><span class="k">Acknowledgement</span><span>:</span><span>${m.requireAck ? `Required (${m.ackDueDays} days)` : 'Not required'}</span><span class="k">Email Notification</span><span>:</span><span>${m.notify ? esc(m.notifyWho || 'All Recipients') : 'No'}</span><span class="k">Created By</span><span>:</span><span>${esc(userById(m.createdBy).name)}</span><span class="k">Date Created</span><span>:</span><span>${fmtDT(m.createdAt)}</span><span class="k">Last Modified</span><span>:</span><span>${fmtDT(m.updatedAt)}</span></div></div>
    <div class="card card-pad"><h3 class="mb">Recipients Summary</h3>${recipientsSummary(m)}</div>
  </div></div>`;
  $('#go-submit', el).onclick = () => location.hash = '#/submit/' + m.id;
  return { title: 'Review Memo', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['My Drafts', '#/drafts'], ['Review Memo']] };
};

// ---------- Submit for Approval ----------
function flowStepper(cur) {
  const steps = [['Create Memo'], ['Review Memo'], ['Submit for Approval'], ['Approval'], ['Release']];
  return `<div class="hstepper">${steps.map((s, i) => `<div class="hs ${i < cur ? 'done' : i === cur ? 'cur' : ''}" style="${i === steps.length - 1 ? 'flex:0 0 auto' : ''}"><div class="n">${i < cur ? icon('check') : i + 1}</div><div><div class="l">${s[0]}</div><div class="s">${i < cur ? 'Completed' : i === cur ? 'In Progress' : 'Pending'}</div></div>${i < steps.length - 1 ? '<div class="bar"></div>' : ''}</div>`).join('')}</div>`;
}
PAGES.submit = ({ el, parts }) => {
  const m = memoById(parts[1]); if (!m) return PAGES.notfound({ el });
  if (!['Draft', 'Returned', 'Rejected'].includes(m.status)) { el.innerHTML = `<div class="card card-pad empty">This memo has already been submitted. <a href="#/memo/${m.id}">View memo</a></div>`; return { title: 'Submit for Approval' }; }
  const wfId = m.workflowId || DB.workflows[0].id; const wf = wfById(wfId);
  const initial = m.initialApprover || wf.steps[0].userId;
  const approvers = DB.users.filter(x => x.status === 'Active' && roleById(x.roleId).perms.includes('memo.approve') && x.id !== DB.currentUserId);
  const due = toInputDate(new Date(Date.now() + wf.steps[0].slaDays * DAY).toISOString());
  el.innerHTML = `${flowStepper(2)}<div class="grid g-main-side"><div class="card">
    <div class="card-pad" style="border-bottom:1px solid var(--border)"><h3>Approval Submission</h3><div class="t2 mt" style="margin-top:6px">You are about to submit the following memo for approval. Please provide the required information below.</div></div>
    <div class="card-pad"><h3 class="mb">Submission Details</h3><div class="grid g2">
      <div class="field"><label>Submit To Workflow <span class="req">*</span></label><select class="inp" id="s-wf">${selectOpts(DB.workflows.filter(w => w.status === 'Active').map(w => [w.id, w.name]), wfId)}</select></div>
      <div class="field" style="grid-row:span 2"><label>Cover Note / Message to Approvers (Optional)</label><textarea class="inp" id="s-note" rows="5" maxlength="500">${esc(m.coverNote || 'Please review the attached memorandum and provide your approval. Thank you.')}</textarea></div>
      <div class="field"><label>Initial Approver <span class="req">*</span></label><select class="inp" id="s-appr">${selectOpts(approvers.map(a => [a.id, `${a.name} (${a.title})`]), initial)}</select></div>
      <div class="field"><label>Due Date for Initial Approval <span class="req">*</span></label><input type="date" class="inp" id="s-due" value="${due}"></div>
      <div class="field"><label>Notify Me When</label><div class="row wrap" style="gap:14px;padding-top:8px">${['Approved', 'Rejected', 'Returned for Revision', 'All Actions'].map(x => `<label class="check"><input type="checkbox" data-nw="${x}" checked> ${x}</label>`).join('')}</div></div>
      <div class="field"><label>Priority for Approval</label><select class="inp" id="s-pri">${selectOpts(DB.settings.priorities, m.priority)}</select><div class="xs t2">This will help approvers prioritize this memo.</div></div>
    </div>
    <div class="info mt" style="flex-direction:column"><b class="row">${icon('info')} Important Reminders</b><ul style="margin:4px 0 0;padding-left:44px"><li>Once submitted, you will no longer be able to edit the memo.</li><li>The memo will be routed to the selected workflow.</li><li>You will be notified of actions taken on this memo.</li><li>Please ensure all details are correct before submission.</li></ul></div>
    <div class="row mt" style="justify-content:flex-end"><button class="btn lg" onclick="location.hash='#/drafts'">Cancel</button><button class="btn lg" onclick="location.hash='#/review/${m.id}'">${icon('arrowl')} Back to Review</button><button class="btn primary lg" id="do-submit">Submit for Approval ${icon('send')}</button></div>
    </div></div>
    <div><div class="card card-pad mb"><div class="card-h"><h3>Memo Summary</h3><button class="btn sm" onclick="location.hash='#/edit/${m.id}'">${icon('edit')} Edit</button></div>
      <div style="text-align:center;margin-bottom:12px"><b style="font-size:16px">MEMORANDUM</b><div>${esc(m.no)}</div></div>
      <div class="kv"><span class="k">Subject</span><span>:</span><b>${esc(m.subject)}</b><span class="k">To</span><span>:</span><span>${esc(m.to.map(recipientLabel).join(', '))}</span><span class="k">Category</span><span>:</span><span>${esc(catById(m.categoryId).name)}</span><span class="k">Priority</span><span>:</span><span>${esc(m.priority)}</span><span class="k">Effective Date</span><span>:</span><span>${fmtLong(m.effectiveDate)}</span><span class="k">Acknowledgement</span><span>:</span><span>${m.requireAck ? `Required (${m.ackDueDays} days)` : 'Not required'}</span><span class="k">Attachments</span><span>:</span><span>${m.attachments.length} file(s)</span></div>
      <a class="small" style="display:block;margin-top:12px" id="prev">View Full Memo Preview ${icon('ext')}</a></div>
      <div class="card card-pad mb"><h3 class="mb">Workflow Preview</h3><div id="wfp">${workflowPreview({ ...m, workflowId: wfId, initialApprover: initial }, { pendingFirst: due })}</div></div>
      <div class="card card-pad"><h3 class="mb">Recipients Summary</h3>${recipientsSummary(m)}</div></div></div>`;
  const upd = () => { const w = $('#s-wf', el).value; $('#wfp', el).innerHTML = workflowPreview({ ...m, workflowId: w, initialApprover: $('#s-appr', el).value }, { pendingFirst: $('#s-due', el).value }); };
  $('#s-wf', el).onchange = () => { $('#s-appr', el).value = wfById($('#s-wf', el).value).steps[0].userId; upd(); }; $('#s-appr', el).onchange = upd; $('#s-due', el).onchange = upd;
  $('#prev', el).onclick = () => modal({ title: m.no, wide: true, body: memoDocHTML(m) });
  $('#do-submit', el).onclick = () => {
    MemoActions.submit(m, { workflowId: $('#s-wf', el).value, initialApprover: $('#s-appr', el).value, dueDate: $('#s-due', el).value, coverNote: $('#s-note', el).value, priority: $('#s-pri', el).value, notifyOn: $$('[data-nw]:checked', el).map(x => x.dataset.nw) });
    DRAFT = null; toast('Memo submitted for approval.'); location.hash = '#/memo/' + m.id;
  };
  return { title: 'Submit for Approval', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['My Drafts', '#/drafts'], ['Review Memo', '#/review/' + m.id], ['Submit for Approval']] };
};

// ---------- Memo Details ----------
let DETAIL_TAB = 'overview';
function memoHeader(m, extraMeta = '') {
  return `<div class="card card-pad"><div class="row" style="gap:18px;align-items:flex-start;flex-wrap:wrap"><div class="doc-ic">${icon('memo')}</div>
    <div style="min-width:240px"><div class="xs bold t2">MEMO NUMBER</div><div class="row"><h2 style="font-size:21px">${esc(m.no)}</h2>${badge(memoStatus(m))}</div><div class="xs bold t2 mt" style="margin-top:10px">SUBJECT</div><div class="bold" style="font-size:16px">${esc(m.subject)}</div></div>
    <span class="spacer"></span><div class="hdr-meta"><div><div class="lb">Category</div><div class="vv">${esc(catById(m.categoryId).name)}</div></div><div><div class="lb">Issuing Department</div><div class="vv">${esc(deptById(m.deptId).name)}</div></div><div><div class="lb">Memo Type</div><div class="vv">${esc(m.type)}</div></div></div></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
    <div class="hdr-meta"><div><div class="lb">Effective Date</div><div class="vv">${icon('calendar')} ${fmtDate(m.effectiveDate)}</div></div><div><div class="lb">Expiration Date</div><div class="vv">${icon('calendar')} ${fmtDate(m.expiryDate)}</div></div><div><div class="lb">Publish Date</div><div class="vv">${icon('calendar')} ${fmtDT(m.releasedAt)}</div></div><div><div class="lb">Author</div><div class="vv">${icon('user')} ${esc(userById(m.createdBy).name)}</div></div><div><div class="lb">Version</div><div class="vv">${icon('copy')} ${esc(m.version)}</div></div><div><div class="lb">Priority</div><div class="vv">${badge(m.priority)}</div></div>${extraMeta}</div></div>`;
}
function statusStepper(m) {
  const h = (a) => m.history.slice().reverse().find(x => x.action === a);
  const sub = h('Submitted for Approval'); const appr = h('Fully Approved'); const rel = h('Released') || h('Release Scheduled');
  const st = m.status; const firstAppr = m.history.find(x => x.action === 'Approved');
  const steps = [
    ['Draft', m.createdAt, true],
    ['For Review', sub?.date, !!sub && st !== 'Draft'],
    ['For Approval', firstAppr?.date || (st === 'Pending Approval' ? sub?.date : null), ['Approved', 'Active', 'Superseded', 'Archived'].includes(st)],
    ['Approved', appr?.date || m.approvedAt, ['Approved', 'Active', 'Superseded', 'Archived'].includes(st)],
    ['Released', rel?.date, ['Active', 'Superseded', 'Archived'].includes(st)],
  ];
  let curIdx = steps.findIndex(s => !s[2]); if (curIdx < 0) curIdx = steps.length - 1;
  const bad = st === 'Rejected' || st === 'Returned';
  return `<div class="stepper">${steps.map((s, i) => { const done = s[2] && !(i === steps.length - 1 && i === curIdx && false); const cls = bad && i === 2 ? 'bad' : (s[2] ? (i === steps.length - 1 && s[2] ? 'cur' : 'done') : (i === curIdx ? 'cur' : '')); return `<div class="step ${cls}"><div class="dotc">${cls === 'done' ? icon('check') : cls === 'bad' ? icon('x') : cls === 'cur' && s[2] ? icon('check') : i + 1}</div><div class="${cls === 'cur' ? 'bold' : ''}" style="${cls === 'cur' ? 'color:var(--primary)' : ''}">${bad && i === 2 ? st : s[0]}</div><div class="d">${s[1] ? fmtDate(s[1]) : ''}</div></div>`; }).join('')}</div>`;
}
function approvalHistoryTable(m) {
  if (!m.approvals.length) return '<div class="empty">Not yet submitted for approval.</div>';
  return `<table class="tbl compact"><thead><tr><th>Level</th><th>Approver</th><th>Action</th><th>Date & Time</th><th>Comments</th></tr></thead><tbody>${m.approvals.map(a => `<tr><td>${a.level}</td><td>${esc(userLabel(a.userId))}${a.delegatedFrom ? `<div class="xs t2">Delegated from ${esc(userById(a.delegatedFrom).name)}</div>` : ''}</td><td>${badge(a.status)}</td><td>${a.date ? fmtDT(a.date) : a.due && a.status === 'Pending' ? '<span class="xs t2">Due ' + fmtDT(a.due) + '</span>' : '—'}</td><td>${esc(a.comment || '')}</td></tr>`).join('')}</tbody></table>`;
}
function ackSummary(m) {
  const s = ackStats(m);
  return `<div class="row" style="gap:24px">${donut([{ label: 'Acknowledged', value: s.ack, color: '#16a34a' }, { label: 'Pending', value: s.pending, color: '#f59e0b' }, { label: 'Overdue', value: s.overdue, color: '#dc2626' }], { size: 150, thick: 20, center: String(s.total), sub: 'Total Recipients' })}${legendList([{ label: 'Acknowledged', value: s.ack, color: '#16a34a' }, { label: 'Pending', value: s.pending, color: '#f59e0b' }, { label: 'Overdue', value: s.overdue, color: '#dc2626' }], s.total)}</div>`;
}
PAGES.memo = ({ el, parts }) => {
  const m = memoById(parts[1]); if (!m) return PAGES.notfound({ el });
  if (CUR._last !== m.id) { trackRecent(m); CUR._last = m.id; DETAIL_TAB = 'overview'; }
  const u = me(); const isRecipient = recipientsOf(m).includes(u.id); const acked = m.acks[u.id];
  const related = DB.memos.filter(x => x.id !== m.id && x.categoryId === m.categoryId && ['Active', 'Superseded'].includes(x.status)).slice(0, 4);
  const pendingMine = m.status === 'Pending Approval' && m.approvals[m.currentLevel]?.userId === u.id;
  const tabs = [['overview', 'Overview'], ['attachments', `Attachments (${m.attachments.length})`], ['approval', 'Approval History'], ['ack', 'Acknowledgement Status'], ['versions', 'Version History'], ['activity', 'Activity Log'], ['related', 'Related Memos']];
  let tabBody = '';
  if (DETAIL_TAB === 'overview') tabBody = `<div class="grid g2" style="padding:18px;gap:18px"><div class="card card-pad" style="box-shadow:none"><div class="card-h caps"><h3>Memo Content</h3></div>${m.purpose ? `<p class="t2"><b>Purpose:</b> ${esc(m.purpose)}</p>` : ''}<div style="line-height:1.6">${m.content}</div></div><div class="card" style="box-shadow:none;max-height:520px;overflow:auto">${memoDocHTML(m, { compact: true })}<div class="row no-print" style="justify-content:center;padding:10px"><button class="btn sm" id="pv-full">${icon('eye')}</button><button class="btn sm" data-print>${icon('download')}</button><button class="btn sm" id="pv-share">${icon('ext')}</button></div></div></div>
    <div class="grid g2" style="padding:0 18px 18px;gap:18px"><div class="card card-pad" style="box-shadow:none"><div class="card-h caps"><h3>Approval History</h3></div>${approvalHistoryTable(m)}</div><div class="card card-pad" style="box-shadow:none"><div class="card-h caps"><h3>Acknowledgement Summary</h3></div>${m.releasedAt ? ackSummary(m) : '<div class="empty">Available after release.</div>'}</div></div>`;
  if (DETAIL_TAB === 'attachments') tabBody = `<div class="card-pad">${m.attachments.length ? m.attachments.map(a => `<div class="file-row">${fileIcon(a.name)}<div style="flex:1"><div>${esc(a.name)}</div><div class="xs t2">${fmtSize(a.size)}${a.demo ? ' · sample file' : ''}</div></div><button class="icon-btn" data-att="${a.id}" data-dl="0">${icon('eye')}</button><button class="icon-btn" data-att="${a.id}" data-dl="1">${icon('download')}</button></div>`).join('') : '<div class="empty">No attachments.</div>'}</div>`;
  if (DETAIL_TAB === 'approval') tabBody = `<div class="card-pad">${m.coverNote ? `<div class="info mb">${icon('mail')}<div><b>Cover note:</b> ${esc(m.coverNote)}</div></div>` : ''}${approvalHistoryTable(m)}${m.comments?.length ? `<h4 class="mt mb">Comments</h4>${m.comments.map(c => `<div class="file-row">${avatar(c.userId, 'sm')}<div style="flex:1"><b class="small">${esc(userById(c.userId).name)}</b> <span class="xs t2">${fmtDT(c.date)}</span><div class="small">${esc(c.text)}</div></div></div>`).join('')}` : ''}</div>`;
  if (DETAIL_TAB === 'ack') {
    const recips = recipientsOf(m);
    const t = dataTable({ id: 'ackst', rows: recips.map(id => ({ u: userById(id), at: m.acks[id] })), columns: [{ key: 'name', label: 'Recipient', render: r => `<span class="row">${avatar(r.u, 'sm')} ${esc(r.u.name)}</span>`, sortVal: r => r.u.name }, { key: 'dept', label: 'Department', render: r => esc(deptById(r.u.deptId).name), sortVal: r => deptById(r.u.deptId).name }, { key: 'st', label: 'Status', render: r => badge(r.at ? 'Acknowledged' : (ackDueDate(m) < NOW() ? 'Overdue' : 'Pending')), sortVal: r => !!r.at }, { key: 'at', label: 'Date Acknowledged', render: r => r.at ? fmtDT(r.at) : '—' }] });
    tabBody = m.releasedAt ? `<div class="card-pad">${ackSummary(m)}<div class="row mt"><span class="t2">Acknowledgement due: <b>${fmtDT(ackDueDate(m))}</b></span><span class="spacer"></span>${m.createdBy === u.id || can('admin.config') ? `<button class="btn sm" id="remind">${icon('bell')} Send Reminder to Pending</button>` : ''}</div></div>${t.html}` : '<div class="empty">Acknowledgement tracking starts once the memo is released.</div>';
    setTimeout(() => t.mount(el, rerender));
  }
  if (DETAIL_TAB === 'versions') tabBody = `<div class="card-pad">${(m.versions || []).length ? `<table class="tbl"><thead><tr><th>Version</th><th>Date</th><th>Changed By</th><th>Notes</th><th></th></tr></thead><tbody>${m.versions.slice().reverse().map((v, i) => `<tr><td><b>${esc(v.version)}</b> ${i === 0 ? badge('Current', 'b-green') : ''}</td><td>${fmtDT(v.date)}</td><td>${esc(userById(v.by).name)}</td><td>${esc(v.note)}</td><td><button class="btn sm" data-ver="${m.versions.length - 1 - i}">${icon('eye')} View</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No released versions yet.</div>'}${m.supersedes ? `<div class="info mt">${icon('info')}<div>This memo supersedes <a href="#/memo/${m.supersedes}">${esc(memoById(m.supersedes)?.no || '')}</a>.</div></div>` : ''}${m.supersededBy ? `<div class="info mt">${icon('info')}<div>This memo was superseded by <a href="#/memo/${m.supersededBy}">${esc(memoById(m.supersededBy)?.no || '')}</a>.</div></div>` : ''}</div>`;
  if (DETAIL_TAB === 'activity') tabBody = `<div class="card-pad"><div class="tl">${m.history.slice().reverse().map(h => `<div class="tl-i"><div class="dotc ${/Reject/.test(h.action) ? 'bad' : /Return/.test(h.action) ? 'warn' : 'done'}">${icon('check')}</div><div style="flex:1"><div class="row"><b>${esc(h.action)}</b><span class="spacer"></span><span class="xs t2">${fmtDT(h.date)}</span></div><div class="small t2">${esc(userById(h.userId).name)}${h.comment ? ' — ' + esc(h.comment) : ''}</div></div></div>`).join('')}</div></div>`;
  if (DETAIL_TAB === 'related') tabBody = `<div class="repo-grid">${related.map(memoCard).join('') || '<div class="empty">No related memos.</div>'}</div>`;

  const actions = [];
  actions.push(`<button class="btn primary" data-print>${icon('download')} Download PDF</button>`, `<button class="btn" data-print>${icon('printer')} Print</button>`, `<button class="btn" id="share">${icon('share')} Share Memo</button>`);
  if (m.status === 'Active' && m.requireAck && isRecipient) actions.push(acked ? `<button class="btn" disabled>${icon('checkc')} Acknowledged ${fmtDate(acked)}</button>` : `<button class="btn" id="ack" style="border-color:var(--green);color:var(--green)">${icon('checkc')} Acknowledge Memo</button>`);
  if (pendingMine) actions.push(`<button class="btn primary" onclick="location.hash='#/approval/${m.id}'">${icon('checkc')} Review & Approve</button>`);
  if (m.status === 'Approved' && (m.createdBy === u.id || can('memo.release'))) actions.push(`<button class="btn primary" onclick="location.hash='#/release/${m.id}'">${icon('send')} Release Memo</button>`);
  if (['Draft', 'Returned', 'Rejected'].includes(m.status) && m.createdBy === u.id) actions.push(`<button class="btn" onclick="location.hash='#/edit/${m.id}'">${icon('edit')} Edit Memo</button>`, `<button class="btn" onclick="location.hash='#/review/${m.id}'">${icon('send')} Submit</button>`);
  if (m.status === 'Active' && can('memo.create')) actions.push(`<button class="btn" id="revise">${icon('copy')} Create Revision</button>`);
  if (m.status === 'Pending Approval' && m.createdBy === u.id) actions.push(`<button class="btn warn" id="withdraw">${icon('reset')} Withdraw</button>`);
  if (can('memo.archive') && ['Active', 'Superseded'].includes(m.status)) actions.push(`<button class="btn danger" id="archive">${icon('archive')} Archive</button>`);

  el.innerHTML = `<div class="grid g-main-side"><div>${memoHeader(m)}
    <div class="card mt"><div class="tabs">${tabs.map(([k, l]) => `<div class="tab ${DETAIL_TAB === k ? 'active' : ''}" data-dt="${k}">${l}</div>`).join('')}</div>${tabBody}</div></div>
    <div><div class="card card-pad mb"><div class="card-h caps"><h3>Status</h3></div>${statusStepper(m)}${m.status === 'Pending Approval' ? `<div class="info mt">${icon('clock')}<div>Waiting for <b>${esc(userLabel(m.approvals[m.currentLevel].userId))}</b> – level ${m.currentLevel + 1} of ${m.approvals.length}. Due ${fmtDT(m.approvals[m.currentLevel].due)}.</div></div>` : ''}</div>
    <div class="card card-pad mb"><div class="card-h caps"><h3>Actions</h3></div><div class="grid g2" style="gap:10px">${actions.join('')}</div></div>
    <div class="card card-pad mb"><div class="card-h caps"><h3>Memo Information</h3></div><div class="kv"><span class="k">Created By</span><span>:</span><span>${esc(userById(m.createdBy).name)}</span><span class="k">Created On</span><span>:</span><span>${fmtDT(m.createdAt)}</span><span class="k">Last Modified By</span><span>:</span><span>${esc(userById(m.updatedBy || m.createdBy).name)}</span><span class="k">Last Modified On</span><span>:</span><span>${fmtDT(m.updatedAt)}</span><span class="k">Confidentiality</span><span>:</span><span>${esc(m.confidentiality || 'Internal Use')}</span><span class="k">Accessibility</span><span>:</span><span>${esc(m.to.map(recipientLabel).join(', '))}</span>${m.cc?.length ? `<span class="k">Cc</span><span>:</span><span>${esc(m.cc.map(recipientLabel).join(', '))}</span>` : ''}<span class="k">Keywords</span><span>:</span><span>${esc(m.keywords || '—')}</span><span class="k">Reference</span><span>:</span><span>${esc(m.reference || '—')}</span><span class="k">Views</span><span>:</span><span>${m.views || 0}</span></div></div>
    <div class="card card-pad"><div class="card-h caps"><h3>Related Memos</h3><a data-dt="related">View All</a></div>${related.slice(0, 3).map(r => `<div class="file-row" style="cursor:pointer" onclick="location.hash='#/memo/${r.id}'"><div style="flex:1"><div class="small t2">${esc(r.no)}</div><div class="xs t2">${fmtDate(r.releasedAt)}</div></div><div style="flex:1.4" class="small">${esc(r.subject)}</div>${badge(memoStatus(r))}</div>`).join('') || '<div class="empty">None</div>'}</div>
  </div></div>`;
  $$('[data-dt]', el).forEach(t => t.onclick = () => { DETAIL_TAB = t.dataset.dt; rerender(); });
  $$('[data-print]', el).forEach(b => b.onclick = () => printMemo(m));
  $$('[data-att]', el).forEach(b => b.onclick = () => openAttachment(m.attachments.find(a => a.id === b.dataset.att), b.dataset.dl === '1'));
  $$('[data-ver]', el).forEach(b => b.onclick = () => { const v = m.versions[+b.dataset.ver]; modal({ title: `${m.no} – Version ${v.version}`, wide: true, body: memoDocHTML({ ...m, content: v.content, subject: v.subject, releasedAt: v.date }) }); });
  const sh = () => copyLink(m); $('#share', el).onclick = sh; const ps = $('#pv-share', el); if (ps) ps.onclick = sh;
  const pf = $('#pv-full', el); if (pf) pf.onclick = () => modal({ title: m.no, wide: true, body: memoDocHTML(m) });
  const ack = $('#ack', el); if (ack) ack.onclick = () => ackModal(m);
  const rv = $('#revise', el); if (rv) rv.onclick = async () => { if (await confirmBox('Create revision', `Create a new draft revision of <b>${esc(m.no)}</b>? When the revision is released, this memo will be marked as Superseded.`, 'Create Revision')) { const c = MemoActions.revise(m); toast('Revision ' + c.no + ' created.'); location.hash = '#/edit/' + c.id; } };
  const ar = $('#archive', el); if (ar) ar.onclick = async () => { if (await confirmBox('Archive memo', `Archive <b>${esc(m.no)}</b>?`, 'Archive')) { MemoActions.setStatus(m, 'Archived'); toast('Memo archived.'); rerender(); } };
  const wd = $('#withdraw', el); if (wd) wd.onclick = async () => { if (await confirmBox('Withdraw memo', 'Withdraw this memo from approval and return it to drafts?', 'Withdraw')) { m.status = 'Draft'; m.approvals.forEach(a => { if (a.status === 'Pending') a.status = 'Waiting'; }); m.history.push({ date: iso(NOW()), userId: u.id, action: 'Withdrawn', comment: 'Withdrawn by author' }); audit('Memo', 'Withdrawn', m.no + ' withdrawn from approval.'); saveDB(); toast('Memo withdrawn to drafts.'); rerender(); } };
  const rm = $('#remind', el); if (rm) rm.onclick = () => { const p = recipientsOf(m).filter(id => !m.acks[id]); p.forEach(id => notify(id, `Reminder: Please acknowledge "${m.subject}" (${m.no}).`, '#/memo/' + m.id)); audit('Memo', 'Reminder Sent', `Acknowledgement reminder for ${m.no} sent to ${p.length} recipient(s).`); saveDB(); toast(`Reminder sent to ${p.length} recipient(s).`); };
  return { title: 'Memo Details', crumbs: [['Home', '#/dashboard'], ['All Memos', '#/memos'], ['Memo Details']] };
};
function ackModal(m, after) {
  modal({ title: 'Acknowledge Memo', body: `<div><b>${esc(m.no)}</b> – ${esc(m.subject)}</div><label class="check" style="align-items:flex-start"><input type="checkbox" id="ack-c"> <span>I acknowledge that I have received, read and understood this memorandum, and I agree to comply with its contents.</span></label>`, foot: `<button class="btn" data-x>Cancel</button><button class="btn primary" id="ack-ok">${icon('checkc')} Acknowledge</button>`, onMount: (el, close) => { $('#ack-ok', el).onclick = () => { if (!$('#ack-c', el).checked) { toast('Please tick the confirmation box.', true); return; } MemoActions.acknowledge(m); close(); toast('Memo acknowledged. Thank you!'); after ? after() : rerender(); }; } });
}

// ---------- My Drafts ----------
PAGES.drafts = ({ el }) => {
  const mine = DB.memos.filter(m => m.createdBy === DB.currentUserId && ['Draft', 'Returned', 'Rejected'].includes(m.status));
  const rows = filterMemos(mine, MF);
  const t = dataTable({ id: 'drafts', rows, defaultSort: 'updatedAt', defaultDir: 'desc', columns: [
    { key: 'no', label: 'Memo No.', render: pdfCell }, { key: 'subject', label: 'Title', render: m => `${esc(m.subject)}${m.supersedes ? '<div class="xs t2">Revision of ' + esc(memoById(m.supersedes)?.no || '') + '</div>' : ''}` },
    { key: 'cat', label: 'Category', render: m => esc(catById(m.categoryId).name), sortVal: m => catById(m.categoryId).name },
    { key: 'status', label: 'Status', render: m => badge(m.status) + (m.status !== 'Draft' ? `<div class="xs t2" style="margin-top:4px;max-width:200px">“${esc(m.approvals[m.currentLevel]?.comment || '')}”</div>` : '') },
    { key: 'createdAt', label: 'Date Created', render: m => fmtDT(m.createdAt) }, { key: 'updatedAt', label: 'Last Modified', render: m => fmtDT(m.updatedAt) },
    { label: 'Actions', render: m => `<span class="row" style="gap:6px"><button class="btn sm" onclick="location.hash='#/edit/${m.id}'">${icon('edit')} Edit</button><button class="btn sm primary" onclick="location.hash='#/review/${m.id}'">Submit</button><button class="icon-btn" data-menu="${m.id}">${icon('dots')}</button></span>` }] });
  el.innerHTML = `<div class="grid g4 mb">${statCard('blue', 'memo', 'Total Drafts', mine.filter(m => m.status === 'Draft').length, 'Memos being prepared')}${statCard('purple', 'reset', 'Returned for Revision', mine.filter(m => m.status === 'Returned').length, 'Need your update')}${statCard('red', 'xc', 'Rejected', mine.filter(m => m.status === 'Rejected').length, 'Can be revised & resubmitted')}${statCard('orange', 'hourglass', 'Pending Approval', DB.memos.filter(m => m.createdBy === DB.currentUserId && m.status === 'Pending Approval').length, 'Submitted by you')}</div>
  <div class="card"><div class="card-pad row" style="padding-bottom:0"><div style="flex:1"><h2 style="font-size:20px">My Drafts</h2><div class="t2" style="margin-top:4px">Memos you are preparing, plus memos returned to you for revision.</div></div>${can('memo.create') ? `<a class="btn primary" href="#/create">${icon('plus')} Create Memo</a>` : ''}</div>${memoFilterBar(MF, { noStatus: true, noAdv: true })}${t.html}</div>`;
  t.mount(el, rerender); wireMenus(el); wireFilterBar(MF, el);
  return { title: 'My Drafts', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['My Drafts']] };
};

// ---------- My Approvals ----------
let APPR_TAB = 'pending';
PAGES.approvals = ({ el }) => {
  const uid_ = DB.currentUserId;
  const pending = DB.memos.filter(m => m.status === 'Pending Approval' && m.approvals[m.currentLevel]?.userId === uid_);
  const acted = DB.memos.filter(m => m.approvals.some(a => a.userId === uid_ && ['Approved', 'Returned', 'Rejected'].includes(a.status)));
  const overdue = pending.filter(m => new Date(m.approvals[m.currentLevel].due) < NOW());
  const myA = (m) => m.approvals.find(a => a.userId === uid_ && a.status !== 'Waiting' && a.status !== 'Pending') || {};
  const lists = { pending, overdue, approved: acted.filter(m => myA(m).status === 'Approved'), returned: acted.filter(m => ['Returned', 'Rejected'].includes(myA(m).status)) };
  const rows = filterMemos(lists[APPR_TAB], MF);
  const isPending = APPR_TAB === 'pending' || APPR_TAB === 'overdue';
  const t = dataTable({ id: 'appr', rows, columns: [
    { key: 'no', label: 'Memo No.', render: pdfCell }, { key: 'subject', label: 'Title', render: m => esc(m.subject) },
    { key: 'from', label: 'Submitted By', render: m => `${esc(userById(m.createdBy).name)}<div class="sub">${esc(deptById(m.deptId).name)}</div>`, sortVal: m => userById(m.createdBy).name },
    { key: 'level', label: 'Level', render: m => isPending ? `Level ${m.currentLevel + 1} of ${m.approvals.length}` : `Level ${myA(m).level}`, sort: false },
    { key: 'priority', label: 'Priority', render: m => badge(m.priority) },
    isPending ? { key: 'due', label: 'Due Date', render: m => { const d = m.approvals[m.currentLevel].due; const dl = daysLeft(d); return `${fmtDT(d)}<div class="sub ${dl.over ? 'red' : ''}">(${dl.t})</div>`; }, sortVal: m => m.approvals[m.currentLevel].due } : { key: 'acted', label: 'Action Date', render: m => fmtDT(myA(m).date) + '<div class="sub">' + badge(myA(m).status) + '</div>', sortVal: m => myA(m).date },
    { key: 'status', label: 'Memo Status', render: m => badge(memoStatus(m)) },
    { label: 'Actions', render: m => isPending ? `<a class="btn sm primary" href="#/approval/${m.id}">Review</a>` : `<a class="btn sm" href="#/memo/${m.id}">View</a>` }] });
  el.innerHTML = `<div class="grid g4 mb">${statCard('orange', 'hourglass', 'Pending My Approval', pending.length, 'Awaiting your action')}${statCard('red', 'clock', 'Overdue', overdue.length, 'Past SLA due date')}${statCard('green', 'checkc', 'Approved by Me', lists.approved.length, 'All time')}${statCard('purple', 'reset', 'Returned / Rejected', lists.returned.length, 'All time')}</div>
  <div class="card"><div class="card-pad" style="padding-bottom:0"><h2 style="font-size:20px">My Approvals</h2><div class="t2" style="margin-top:4px">Memos routed to you for review and approval.</div></div>${memoFilterBar(MF, { noStatus: true, noAdv: true })}
  <div class="tabs">${[['pending', 'Pending'], ['overdue', 'Overdue'], ['approved', 'Approved'], ['returned', 'Returned / Rejected']].map(([k, l]) => `<div class="tab ${APPR_TAB === k ? 'active' : ''}" data-t="${k}">${l} (${lists[k].length})</div>`).join('')}</div>${t.html}</div>`;
  t.mount(el, rerender); wireFilterBar(MF, el);
  $$('[data-t]', el).forEach(x => x.onclick = () => { APPR_TAB = x.dataset.t; rerender(); });
  return { title: 'My Approvals', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['My Approvals']] };
};

// ---------- Approval Details ----------
let APPR_DETAIL_TAB = 'preview';
PAGES.approval = ({ el, parts }) => {
  const m = memoById(parts[1]); if (!m) return PAGES.notfound({ el });
  const a = m.approvals[m.currentLevel]; const mine = m.status === 'Pending Approval' && a?.userId === DB.currentUserId;
  const wf = wfById(m.workflowId) || DB.workflows[0];
  let sla = '';
  if (m.status === 'Pending Approval') {
    const total = new Date(a.due) - new Date(a.receivedAt); const left = new Date(a.due) - Date.now(); const used = Math.max(0, Math.min(1, 1 - left / total));
    const abs = Math.abs(left); const dd = Math.floor(abs / DAY), hh = Math.floor(abs % DAY / 3600000), mm = Math.floor(abs % 3600000 / 60000);
    sla = `<div class="card card-pad mb"><div class="card-h caps"><h3>SLA Countdown <span class="t2" style="text-transform:none;font-weight:400">(current stage)</span></h3></div><div class="row"><div style="flex:1"><div class="small">You are on: Approval Level ${m.currentLevel + 1} of ${m.approvals.length}</div><div style="font-size:24px;font-weight:700;color:${left < 0 ? 'var(--red)' : left < DAY ? 'var(--orange)' : 'var(--green)'};margin:10px 0 2px">${left < 0 ? '-' : ''}${dd}d ${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m</div><div class="xs bold t2">${left < 0 ? 'OVERDUE' : 'TIME REMAINING'}</div></div>${gauge(used, left < 0 ? '#dc2626' : '#1d4ed8', 92, 'of SLA')}</div><div class="row small mt"><span>SLA Target: ${a.slaDays} Days</span><span class="spacer"></span><span>Due: <b class="${left < 0 ? 'red' : ''}">${fmtDT(a.due)}</b></span></div></div>`;
  }
  const tabs = [['preview', 'Memo Preview'], ['info', 'Approval Information'], ['history', 'Approval History'], ['comments', `Comments (${m.comments?.length || 0})`], ['attachments', `Attachments (${m.attachments.length})`]];
  let body = '';
  if (APPR_DETAIL_TAB === 'preview') body = `<div style="background:#eef1f6;padding:18px;max-height:640px;overflow:auto"><div class="card" style="max-width:820px;margin:0 auto">${memoDocHTML(m)}</div></div>`;
  if (APPR_DETAIL_TAB === 'info' || APPR_DETAIL_TAB === 'preview') { }
  const infoKV = `<div class="kv"><span class="k">Current Approver</span><span>:</span><span>${a ? esc(userById(a.userId).name) + (a.userId === DB.currentUserId ? ' (You)' : '') : '—'}</span><span class="k">Department</span><span>:</span><span>${a ? esc(deptById(userById(a.userId).deptId).name) : '—'}</span><span class="k">Approval Level</span><span>:</span><span>Level ${m.currentLevel + 1} of ${m.approvals.length}</span><span class="k">SLA for this Level</span><span>:</span><span>${a?.slaDays || '—'} Days</span><span class="k">Date Received</span><span>:</span><span>${fmtDT(a?.receivedAt)}</span><span class="k">Due Date</span><span>:</span><span class="${a && new Date(a.due) < NOW() ? 'red' : ''}">${fmtDT(a?.due)}</span><span class="k">Escalation Rule</span><span>:</span><span>Escalate after due date to next level</span><span class="k">Escalation To</span><span>:</span><span>${esc(userLabel(wf.escalateTo))}</span><span class="k">Workflow</span><span>:</span><span>${esc(wf.name)}</span></div>`;
  if (APPR_DETAIL_TAB === 'info') body = `<div class="card-pad">${m.coverNote ? `<div class="info mb">${icon('mail')}<div><b>Cover note from ${esc(userById(m.createdBy).name)}:</b> ${esc(m.coverNote)}</div></div>` : ''}${infoKV}</div>`;
  if (APPR_DETAIL_TAB === 'history') body = `<div class="card-pad">${approvalHistoryTable(m)}</div>`;
  if (APPR_DETAIL_TAB === 'comments') body = `<div class="card-pad">${(m.comments || []).length ? m.comments.slice().reverse().map(c => `<div class="file-row">${avatar(c.userId, 'sm')}<div style="flex:1"><b class="small">${esc(userLabel(c.userId))}</b> ${c.action ? badge(c.action === 'approve' ? 'Approved' : c.action === 'return' ? 'Returned' : c.action === 'reject' ? 'Rejected' : 'Comment') : ''}<div class="small">${esc(c.text)}</div></div><span class="xs t2">${fmtDT(c.date)}</span></div>`).join('') : '<div class="empty">No comments yet.</div>'}<div class="row mt"><input class="inp" id="new-cmt" placeholder="Add a comment…"><button class="btn primary" id="add-cmt">Post</button></div></div>`;
  if (APPR_DETAIL_TAB === 'attachments') body = `<div class="card-pad">${m.attachments.map(x => `<div class="file-row">${fileIcon(x.name)}<div style="flex:1">${esc(x.name)}<div class="xs t2">${fmtSize(x.size)}</div></div><button class="icon-btn" data-att="${x.id}" data-dl="0">${icon('eye')}</button><button class="icon-btn" data-att="${x.id}" data-dl="1">${icon('download')}</button></div>`).join('') || '<div class="empty">No attachments.</div>'}</div>`;

  const others = DB.users.filter(x => x.status === 'Active' && roleById(x.roleId).perms.includes('memo.approve') && x.id !== DB.currentUserId);
  el.innerHTML = `<div class="grid g-main-side"><div>${memoHeader(m)}
    <div class="card mt"><div class="tabs">${tabs.map(([k, l]) => `<div class="tab ${APPR_DETAIL_TAB === k ? 'active' : ''}" data-t="${k}">${l}</div>`).join('')}</div>${body}</div>
    <div class="grid g2 mt"><div class="card card-pad"><div class="card-h caps"><h3>Approval Workflow</h3></div>${workflowPreview(m)}</div><div class="card card-pad"><div class="card-h caps"><h3>Approval Information</h3></div>${infoKV}</div></div></div>
    <div>${sla}
    ${mine ? `<div class="card card-pad mb"><div class="card-h caps"><h3>Your Action (Approval Level ${m.currentLevel + 1})</h3></div><div class="grid" style="gap:8px">
      ${[['approve', 'checkc', 'Approve', 'I approve this memo and move it to the next level.', 'green'], ['return', 'reset', 'Return for Revision', 'Send back to the author for revision.', 'orange'], ['reject', 'xc', 'Reject', 'Reject this memo. It will be returned to the author.', 'red'], ['delegate', 'users', 'Delegate', 'Delegate this approval to another approver.', 'purple']].map(([k, ic, l, d, c], i) => `<label class="radio-card ${i === 0 ? 'on' : ''}"><input type="radio" name="dec" value="${k}" ${i === 0 ? 'checked' : ''}><span style="color:var(--${c})">${icon(ic)}</span><div><b>${l}</b><div class="xs t2">${d}</div></div></label>`).join('')}
      <div class="field" id="deleg" style="display:none"><label>Delegate to</label><select class="inp" id="deleg-u">${selectOpts(others.map(o => [o.id, `${o.name} (${o.title})`]))}</select></div>
      <div class="field"><label class="lbl-s">Add Comments <span class="t2">(required for Return / Reject)</span></label><textarea class="inp" id="dec-c" maxlength="500" placeholder="Add your comments here..."></textarea></div>
      <button class="btn primary lg" id="dec-go">${icon('checkc')} Approve</button></div></div>` : `<div class="card card-pad mb"><div class="info">${icon('info')}<div>${m.status === 'Pending Approval' ? `This memo is waiting for <b>${esc(userLabel(a.userId))}</b>.` : `This memo is <b>${esc(memoStatus(m))}</b>. No action is required from you.`}</div></div><a class="btn block mt" href="#/memo/${m.id}">View Memo Details</a></div>`}
    <div class="card card-pad"><div class="card-h caps"><h3>Recent Comments</h3></div>${(m.comments || []).slice(-3).reverse().map(c => `<div class="file-row">${avatar(c.userId, 'sm')}<div style="flex:1"><b class="small">${esc(userLabel(c.userId))}</b><div class="small t2">${esc(c.text)}</div></div><span class="xs t2">${fmtDate(c.date)}</span></div>`).join('') || '<div class="empty">No comments yet.</div>'}</div></div></div>`;
  $$('[data-t]', el).forEach(x => x.onclick = () => { APPR_DETAIL_TAB = x.dataset.t; rerender(); });
  $$('[data-att]', el).forEach(b => b.onclick = () => openAttachment(m.attachments.find(x => x.id === b.dataset.att), b.dataset.dl === '1'));
  const ac = $('#add-cmt', el); if (ac) ac.onclick = () => { const v = $('#new-cmt', el).value.trim(); if (!v) return; m.comments.push({ date: iso(NOW()), userId: DB.currentUserId, text: v }); saveDB(); rerender(); };
  if (mine) {
    const go = $('#dec-go', el);
    const labels = { approve: [icon('checkc') + ' Approve', 'btn primary lg'], return: [icon('reset') + ' Return for Revision', 'btn warn lg'], reject: [icon('xc') + ' Reject', 'btn danger lg'], delegate: [icon('users') + ' Delegate', 'btn lg'] };
    $$('[name=dec]', el).forEach(r => r.onchange = () => { $$('.radio-card', el).forEach(c => c.classList.toggle('on', $('input', c).checked)); go.innerHTML = labels[r.value][0]; go.className = labels[r.value][1]; $('#deleg', el).style.display = r.value === 'delegate' ? '' : 'none'; });
    go.onclick = async () => {
      const dec = $('[name=dec]:checked', el).value; const c = $('#dec-c', el).value.trim();
      if ((dec === 'return' || dec === 'reject') && !c) { toast('Please add a comment explaining your decision.', true); $('#dec-c', el).focus(); return; }
      const verb = { approve: 'Approve', return: 'Return for Revision', reject: 'Reject', delegate: 'Delegate' }[dec];
      if (!await confirmBox(verb, `${verb} memo <b>${esc(m.no)}</b>?`, verb, dec === 'reject')) return;
      MemoActions.decide(m, dec, c, $('#deleg-u', el)?.value);
      toast({ approve: m.status === 'Approved' ? 'Memo fully approved – ready for release.' : 'Approved. Memo moved to the next approver.', return: 'Memo returned to the author.', reject: 'Memo rejected.', delegate: 'Approval delegated.' }[dec]);
      location.hash = '#/approvals';
    };
  }
  return { title: 'Approval Details', crumbs: [['Home', '#/dashboard'], ['My Approvals', '#/approvals'], ['Approval Details']] };
};

// ---------- My Releases ----------
let REL_TAB = 'ready';
PAGES.releases = ({ el }) => {
  const u = DB.currentUserId; const canAll = can('admin.config');
  const ready = DB.memos.filter(m => m.status === 'Approved' && (m.createdBy === u || canAll));
  const released = DB.memos.filter(m => m.releasedBy === u && ['Active', 'Superseded', 'Archived'].includes(m.status));
  const scheduled = released.filter(m => memoStatus(m) === 'Scheduled');
  const lists = { ready, scheduled, released: released.filter(m => memoStatus(m) !== 'Scheduled') };
  const rows = filterMemos(lists[REL_TAB], MF);
  const t = dataTable({ id: 'rel', rows, columns: [
    { key: 'no', label: 'Memo No.', render: pdfCell }, { key: 'subject', label: 'Title', render: m => esc(m.subject) },
    { key: 'cat', label: 'Category', render: m => esc(catById(m.categoryId).name), sortVal: m => catById(m.categoryId).name },
    REL_TAB === 'ready' ? { key: 'approvedAt', label: 'Approved On', render: m => fmtDT(m.approvedAt || m.approvals.at(-1)?.date) } : { key: 'releasedAt', label: 'Release Date', render: m => fmtDT(m.releasedAt) },
    REL_TAB === 'ready' ? { key: 'author', label: 'Author', render: m => esc(userById(m.createdBy).name) } : { key: 'ack', label: 'Acknowledgement', render: m => { const s = ackStats(m); return `<div class="row" style="min-width:140px"><div class="prog"><div style="width:${s.rate * 100}%;background:var(--green)"></div></div><span class="xs">${pct(s.ack, s.total, 0)}</span></div>`; }, sort: false },
    { key: 'status', label: 'Status', render: m => badge(memoStatus(m)) },
    { label: 'Actions', render: m => REL_TAB === 'ready' ? `<a class="btn sm primary" href="#/release/${m.id}">${icon('send')} Release</a>` : `<a class="btn sm" href="#/memo/${m.id}">View</a>` }] });
  el.innerHTML = `<div class="grid g4 mb">${statCard('blue', 'send', 'Ready for Release', ready.length, 'Approved memos')}${statCard('teal', 'calendar', 'Scheduled', scheduled.length, 'Release pending')}${statCard('green', 'checkc', 'Released by Me', lists.released.length, 'All time')}${statCard('purple', 'pie', 'Avg. Acknowledgement', lists.released.length ? pct(lists.released.reduce((a, m) => a + ackStats(m).rate, 0), lists.released.length, 1) : '—', 'Across your releases')}</div>
  <div class="card"><div class="card-pad" style="padding-bottom:0"><h2 style="font-size:20px">My Releases</h2><div class="t2" style="margin-top:4px">Release approved memos to recipients and track their distribution.</div></div>${memoFilterBar(MF, { noStatus: true, noAdv: true })}
  <div class="tabs">${[['ready', 'Ready for Release'], ['scheduled', 'Scheduled'], ['released', 'Released']].map(([k, l]) => `<div class="tab ${REL_TAB === k ? 'active' : ''}" data-t="${k}">${l} (${lists[k].length})</div>`).join('')}</div>${t.html}</div>`;
  t.mount(el, rerender); wireFilterBar(MF, el);
  $$('[data-t]', el).forEach(x => x.onclick = () => { REL_TAB = x.dataset.t; rerender(); });
  return { title: 'My Releases', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['My Releases']] };
};

// ---------- Release Memo ----------
PAGES.release = ({ el, parts }) => {
  const m = memoById(parts[1]); if (!m) return PAGES.notfound({ el });
  if (m.status !== 'Approved') { el.innerHTML = `<div class="card card-pad empty">This memo is <b>${esc(memoStatus(m))}</b> and cannot be released. <a href="#/memo/${m.id}">View memo</a></div>`; return { title: 'Release Memo' }; }
  const R = { scope: m.to.includes('all') ? 'all' : 'selected', to: [...m.to] };
  const approvedOn = m.approvedAt || m.approvals.at(-1)?.date;
  const draw = () => {
    const recCount = recipientsOf({ to: R.scope === 'all' ? ['all'] : R.to }).length;
    el.innerHTML = `<div class="grid g-main-side"><div>${memoHeader(m, `<div><div class="lb">Approved On</div><div class="vv">${icon('calendar')} ${fmtDT(approvedOn)}</div></div>`)}
    <div class="card card-pad mt">
      <div class="row mb"><span class="pill-count" style="width:26px;height:26px;border-radius:50%">1</span><h3>Release Information</h3></div>
      <div class="grid g3"><div class="field"><label>Publish / Release Date <span class="req">*</span></label><input type="datetime-local" class="inp" id="r-rel" value="${esc(m.releaseDate && new Date(m.releaseDate) > NOW() ? toInputDT(m.releaseDate) : toInputDT(NOW()))}"></div>
      <div class="field"><label>Effective Date <span class="req">*</span></label><input type="date" class="inp" id="r-eff" value="${toInputDate(m.effectiveDate)}"></div>
      <div class="field"><label>Expiration Date</label><input type="date" class="inp" id="r-exp" value="${toInputDate(m.expiryDate)}"></div></div>
      <div class="field mt"><label>Reference / Remarks (Optional)</label><textarea class="inp" id="r-rem" rows="2" maxlength="500">${esc(m.releaseRemarks || (m.supersedes ? 'This memo supersedes ' + (memoById(m.supersedes)?.no || '') + '.' : ''))}</textarea></div>
      <hr style="border:0;border-top:1px solid var(--border);margin:20px 0">
      <div class="row mb"><span class="pill-count" style="width:26px;height:26px;border-radius:50%">2</span><h3>Recipients & Distribution</h3></div>
      <div class="grid g2"><div class="field"><label>Distribution Scope <span class="req">*</span></label>${[['all', 'All Employees'], ['selected', 'Selected Departments / Users']].map(([k, l]) => `<label class="check" style="margin:4px 0"><input type="radio" name="scope" value="${k}" ${R.scope === k ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="field">${R.scope === 'selected' ? `<label>Recipients</label>${recipientPicker('r-pick', R.to.filter(x => x !== 'all'))}` : ''}<label class="mt" style="margin-top:10px">Distribution List Preview</label><div class="info">${icon('users')}<div><b>${R.scope === 'all' ? 'All Employees' : 'Selected recipients'} (${recCount} recipients)</b><div class="xs t2">Includes all active employees in the selected scope.</div></div></div></div></div>
      <hr style="border:0;border-top:1px solid var(--border);margin:20px 0">
      <div class="row mb"><span class="pill-count" style="width:26px;height:26px;border-radius:50%">3</span><h3>Notification & Acknowledgement</h3></div>
      <div class="grid g3"><div class="field"><label>Notification Channel(s)</label>${['In-System Notification', 'Email Notification', 'Microsoft Teams Notification'].map(x => `<label class="check" style="margin:3px 0"><input type="checkbox" checked> ${x}</label>`).join('')}</div>
      <div class="field"><label>Acknowledgement Required</label><label class="check"><input type="radio" name="ackr" value="1" ${m.requireAck ? 'checked' : ''}> Yes, acknowledgement required</label><label class="check"><input type="radio" name="ackr" value="0" ${m.requireAck ? '' : 'checked'}> No, not required</label><label class="mt" style="margin-top:8px">Acknowledgement Due (Days)</label><input type="number" class="inp" id="r-ackd" min="1" value="${m.ackDueDays || 5}" style="width:110px"></div>
      <div class="field"><label>Reminder Settings</label><label class="check"><input type="checkbox" checked> Send reminder 1 day before due date</label><label class="check"><input type="checkbox" checked> Send overdue reminder every 2 days</label></div></div>
      <hr style="border:0;border-top:1px solid var(--border);margin:20px 0">
      <div class="row mb"><span class="pill-count" style="width:26px;height:26px;border-radius:50%">4</span><h3>Attachments for Release</h3></div>
      ${m.attachments.map(a => `<div class="file-row">${fileIcon(a.name)}<span style="flex:1">${esc(a.name)}</span><span class="xs t2">${fmtSize(a.size)}</span><button class="icon-btn" data-att="${a.id}">${icon('eye')}</button></div>`).join('') || '<div class="t2 small">No attachments.</div>'}
    </div>
    <div class="info mt">${icon('info')}<div>Once released, all recipients will be notified and acknowledgement (if required) will be tracked.</div></div></div>
    <div><div class="card card-pad mb"><h3 class="mb">Release Summary</h3><div class="kv"><span class="k">Memo Number</span><span>:</span><span>${esc(m.no)}</span><span class="k">Subject</span><span>:</span><span>${esc(m.subject)}</span><span class="k">Category</span><span>:</span><span>${esc(catById(m.categoryId).name)}</span><span class="k">Memo Type</span><span>:</span><span>${esc(m.type)}</span><span class="k">Author</span><span>:</span><span>${esc(userById(m.createdBy).name)}</span><span class="k">Approved On</span><span>:</span><span>${fmtDT(approvedOn)}</span><span class="k">Version</span><span>:</span><span>${esc(m.version)}</span></div></div>
    <div class="card card-pad mb"><h3 class="mb">Release Checklist</h3><div class="tl">${[['Memo is fully approved', 'Approved on ' + fmtDT(approvedOn)], ['All required approvers completed', `${m.approvals.length} of ${m.approvals.length} approvers`], ['Memo content is final', 'No pending revisions'], ['Attachments verified', `${m.attachments.length} attachment(s) available`]].map(([a, b]) => `<div class="tl-i" style="padding-bottom:10px"><div class="dotc done">${icon('check')}</div><div><b class="small">${a}</b><div class="xs t2">${b}</div></div></div>`).join('')}</div></div>
    <div class="card card-pad"><h3 class="mb">Actions</h3><div class="grid" style="gap:10px"><button class="btn primary lg" id="rel-now">${icon('send')} Release Now</button><button class="btn lg" id="rel-sch">${icon('calendar')} Schedule Release</button><button class="btn lg" onclick="location.hash='#/memo/${m.id}'">${icon('eye')} Preview Memo</button><button class="btn danger lg" onclick="location.hash='#/releases'">${icon('xc')} Cancel</button></div></div></div></div>`;
    $$('[name=scope]', el).forEach(r => r.onchange = () => { R.scope = r.value; if (R.scope === 'selected' && R.to.includes('all')) R.to = []; draw(); });
    const pk = $('#r-pick', el); if (pk) { $$('[data-rm]', pk).forEach(b => b.onclick = () => { R.to = R.to.filter(x => x !== b.dataset.rm); draw(); }); $('[data-add]', pk).onchange = e => { if (e.target.value && e.target.value !== 'all') R.to.push(e.target.value); draw(); }; }
    $$('[data-att]', el).forEach(b => b.onclick = () => openAttachment(m.attachments.find(x => x.id === b.dataset.att)));
    const go = async (schedule) => {
      const rel = $('#r-rel', el).value; const to = R.scope === 'all' ? ['all'] : R.to;
      if (!to.length) { toast('Select at least one recipient.', true); return; }
      if (schedule && (!rel || new Date(rel) <= NOW())) { toast('Choose a future release date to schedule.', true); return; }
      if (!await confirmBox(schedule ? 'Schedule release' : 'Release memo', schedule ? `Schedule <b>${esc(m.no)}</b> for release on ${fmtDT(rel)}?` : `Release <b>${esc(m.no)}</b> to ${recipientsOf({ to }).length} recipient(s) now?`, schedule ? 'Schedule' : 'Release Now')) return;
      MemoActions.release(m, { to, effectiveDate: $('#r-eff', el).value, expiryDate: $('#r-exp', el).value, releaseRemarks: $('#r-rem', el).value, requireAck: $('[name=ackr]:checked', el).value === '1', ackDueDays: +$('#r-ackd', el).value || 5, releaseDate: schedule ? rel : null });
      toast(schedule ? 'Release scheduled.' : 'Memo released successfully!'); location.hash = '#/memo/' + m.id;
    };
    $('#rel-now', el).onclick = () => go(false); $('#rel-sch', el).onclick = () => go(true);
  };
  draw();
  return { title: 'Release Memo', crumbs: [['Home', '#/dashboard'], ['My Releases', '#/releases'], ['Release Memo']] };
};

// ---------- My Acknowledgements ----------
let ACK_TAB = 'pending';
PAGES.acknowledgements = ({ el }) => {
  const u = DB.currentUserId;
  const all = DB.memos.filter(m => ['Active', 'Superseded', 'Archived'].includes(m.status) && m.requireAck && new Date(m.releasedAt) <= NOW() && recipientsOf(m).includes(u));
  const done = all.filter(m => m.acks[u]); const open = all.filter(m => !m.acks[u] && m.status === 'Active');
  const overdue = open.filter(m => ackDueDate(m) < NOW());
  const lists = { pending: open, acknowledged: done, overdue };
  const rows = filterMemos(lists[ACK_TAB], MF);
  const t = dataTable({ id: 'ack', rows, defaultSort: 'rel', defaultDir: 'desc', columns: [
    { key: 'no', label: 'Memo No.', render: pdfCell }, { key: 'subject', label: 'Title', render: m => esc(m.subject) },
    { key: 'cat', label: 'Category', render: m => esc(catById(m.categoryId).name), sortVal: m => catById(m.categoryId).name },
    { key: 'dept', label: 'Department/BU', render: m => esc(deptById(m.deptId).name), sortVal: m => deptById(m.deptId).name },
    { key: 'rel', label: 'Date Released', render: m => fmtDT(m.releasedAt), sortVal: m => m.releasedAt },
    ACK_TAB === 'acknowledged' ? { key: 'ackat', label: 'Date Acknowledged', render: m => fmtDT(m.acks[u]), sortVal: m => m.acks[u] } : { key: 'due', label: 'Due Date', render: m => { const d = ackDueDate(m); const dl = daysLeft(d); return `${fmtDate(d)}<div class="sub ${dl.over ? 'red' : ''}">(${dl.t})</div>`; }, sortVal: m => ackDueDate(m).toISOString() },
    { key: 'st', label: 'Status', render: m => badge(m.acks[u] ? 'Acknowledged' : ackDueDate(m) < NOW() ? 'Overdue' : 'Pending'), sort: false },
    { label: 'Actions', render: m => m.acks[u] ? `<a class="btn sm" href="#/memo/${m.id}">View</a>` : `<button class="btn sm" data-ack="${m.id}">Acknowledge</button>` }] });
  el.innerHTML = `<div class="card card-pad mb"><h2 style="font-size:20px">My Acknowledgements</h2><div class="t2" style="margin-top:4px">View and manage memoranda that require your acknowledgement.</div></div>
  <div class="grid g4 mb">${statCard('blue', 'memo', 'Total Memos', all.length, 'Total memoranda for acknowledgement')}${statCard('green', 'checkc', 'Acknowledged', done.length, 'Memos you have acknowledged')}${statCard('orange', 'clock', 'For Acknowledgement', open.length, 'Memos pending your acknowledgement')}${statCard('purple', 'pie', 'Acknowledgement Rate', pct(done.length, all.length), 'Based on total memoranda')}</div>
  <div class="card">${memoFilterBar(MF, { noStatus: true, noAdv: true })}<div class="tabs">${[['pending', 'For Acknowledgement'], ['acknowledged', 'Acknowledged'], ['overdue', 'Overdue']].map(([k, l]) => `<div class="tab ${ACK_TAB === k ? 'active' : ''}" data-t="${k}">${l} (${lists[k].length})</div>`).join('')}</div>${t.html}</div>
  ${ACK_TAB !== 'acknowledged' ? `<div class="card mt"><div class="card-pad row" style="padding-bottom:6px"><h3>Recently Acknowledged (Last 5)</h3><span class="spacer"></span><a data-t="acknowledged">View All Acknowledged</a></div><table class="tbl"><thead><tr><th>Memo No.</th><th>Title</th><th>Category</th><th>Date Released</th><th>Date Acknowledged</th></tr></thead><tbody>${done.sort((a, b) => b.acks[u].localeCompare(a.acks[u])).slice(0, 5).map(m => `<tr><td><span class="row" style="gap:8px"><span class="green">${icon('checkc')}</span>${memoLink(m)}</span></td><td>${esc(m.subject)}</td><td>${esc(catById(m.categoryId).name)}</td><td>${fmtDate(m.releasedAt)}</td><td>${fmtDT(m.acks[u])}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">None yet.</td></tr>'}</tbody></table></div>` : ''}`;
  t.mount(el, rerender); wireFilterBar(MF, el);
  $$('[data-t]', el).forEach(x => x.onclick = () => { ACK_TAB = x.dataset.t; rerender(); });
  $$('[data-ack]', el).forEach(b => b.onclick = () => ackModal(memoById(b.dataset.ack)));
  return { title: 'My Acknowledgements', crumbs: [['Home', '#/dashboard'], ['Memos', '#/memos'], ['My Acknowledgements']] };
};
