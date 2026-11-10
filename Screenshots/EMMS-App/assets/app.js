// ============ App shell, navigation & router ============
let CUR = { path: '', parts: [], query: {} };

function navItems() {
  const t = tasksFor(DB.currentUserId).length;
  const appr = DB.memos.filter(m => m.status === 'Pending Approval' && m.approvals[m.currentLevel]?.userId === DB.currentUserId).length;
  const ack = tasksFor(DB.currentUserId).filter(x => x.kind === 'ACKNOWLEDGE').length;
  const items = [
    { k: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/dashboard' },
    { k: 'memos', label: 'Memos', icon: 'memo', children: [
      { k: 'memos', label: 'All Memos', href: '#/memos' }, { k: 'drafts', label: 'My Drafts', href: '#/drafts' },
      { k: 'approvals', label: 'My Approvals', href: '#/approvals', badge: appr }, { k: 'releases', label: 'My Releases', href: '#/releases' },
      { k: 'acknowledgements', label: 'My Acknowledgements', href: '#/acknowledgements', badge: ack }] },
    { k: 'tasks', label: 'My Tasks', icon: 'tasks', href: '#/tasks', badge: t },
    { k: 'activity', label: 'My Activity', icon: 'activity', href: '#/activity' },
    { k: 'categories', label: 'Categories', icon: 'list', href: '#/categories' },
  ];
  if (can('reports.view')) items.push({ k: 'reports', label: 'Reports', icon: 'reports', children: REPORT_TABS.map(([k, l]) => ({ k: 'reports/' + k, label: l, href: '#/reports/' + k })) });
  if (can('admin.users') || can('admin.config') || can('admin.audit')) items.push({ k: 'admin', label: 'Administration', icon: 'settings', children: ADMIN_SECTIONS.map(([k, l]) => ({ k: 'admin/' + k, label: l, href: '#/admin/' + k })) });
  items.push({ k: 'help', label: 'Help & Support', icon: 'help', href: '#/help' });
  return items;
}
const NAV_OPEN = { memos: true };
function activeKey() {
  const p = CUR.parts; const a = p[0] || 'dashboard';
  if (a === 'reports') return 'reports/' + (p[1] || 'overview');
  if (a === 'admin') return 'admin/' + (p[1] || 'overview');
  if (['create', 'edit', 'review', 'submit', 'memo', 'search'].includes(a)) return 'memos';
  if (a === 'approval') return 'approvals'; if (a === 'release') return 'releases';
  return a;
}
function renderSidebar() {
  const ak = activeKey(); const u = me();
  const nav = navItems().map(it => {
    if (it.children) {
      const childActive = it.children.some(c => c.k === ak);
      const open = NAV_OPEN[it.k] || childActive;
      return `<div class="nav-item ${open ? 'open' : ''}" data-tog="${it.k}">${icon(it.icon)}<span>${it.label}</span>${icon('chevron', 'chev')}</div>
        <div class="nav-sub ${open ? 'open' : ''}">${it.children.map(c => `<a class="nav-item ${c.k === ak ? 'active' : ''}" href="${c.href}">${c.label}${c.badge ? `<span class="nbadge">${c.badge}</span>` : ''}</a>`).join('')}</div>`;
    }
    return `<a class="nav-item ${it.k === ak ? 'active' : ''}" href="${it.href}">${icon(it.icon)}<span>${it.label}</span>${it.badge ? `<span class="nbadge">${it.badge}</span>` : ''}</a>`;
  }).join('');
  $('#sidebar').innerHTML = `<div class="brand">${brandLogo(true, 46)}</div>
    <div class="sys-name"><b>${esc(DB.settings.systemName)}</b>${esc(DB.settings.systemFullName).replace(' Management', '<br>Management')}</div>
    <nav class="nav">${nav}</nav>
    <div class="side-user" id="side-user">${avatar(u, 'lg')}<div style="flex:1;min-width:0"><div class="nm">${esc(u.name)}</div><div class="dp">${esc(deptById(u.deptId).name)}</div><div class="xs" style="color:#7ee2a0">● Online</div></div>${icon('chevron')}</div>
    <div class="side-ver">Version 1.0.0</div>`;
  $$('#sidebar [data-tog]').forEach(n => n.onclick = () => { NAV_OPEN[n.dataset.tog] = !n.classList.contains('open'); renderSidebar(); });
  $('#side-user').onclick = (e) => userMenu(e.currentTarget);
}
function renderTopbar(title, crumbs, sub) {
  const u = me(); const unread = DB.notifications.filter(n => n.userId === u.id && !n.read).length; const tc = tasksFor(u.id).length;
  $('#topbar').innerHTML = `<button class="hamb" id="hamb">${icon('menu')}</button>
    <div class="page-title"><h1>${esc(title)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>${crumbs ? `<div class="crumbs">${crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a>${icon('right')}` : `<span>${esc(c[0])}</span>`).join('').replace(/<svg/g, '<svg style="width:13px;height:13px"')}</div>` : ''}</div>
    <div class="top-search"><input id="gsearch" placeholder="Search memos by keyword, title, memo no., etc." value="${esc(CUR.parts[0] === 'search' ? CUR.query.q || '' : '')}">${icon('search')}</div>
    <button class="top-icon" id="bell">${icon('bell')}${unread ? `<span class="dot">${unread}</span>` : ''}</button>
    <a class="top-icon" href="#/tasks" style="text-decoration:none;color:var(--text)">My Tasks <span class="pill-count">${tc}</span></a>
    <button class="top-icon" id="umenu">${avatar(u, 'sm')} ${esc(u.name)} ${icon('chevron')}</button>`;
  $('#hamb').onclick = () => $('#app').classList.toggle('collapsed');
  $('#gsearch').onkeydown = e => { if (e.key === 'Enter') location.hash = '#/search?q=' + encodeURIComponent(e.target.value); };
  $('#bell').onclick = e => notifPanel(e.currentTarget);
  $('#umenu').onclick = e => userMenu(e.currentTarget);
}
function notifPanel(anchor) {
  $$('.pop').forEach(p => p.remove());
  const list = DB.notifications.filter(n => n.userId === DB.currentUserId).slice(0, 15);
  const r = anchor.getBoundingClientRect();
  const p = document.createElement('div'); p.className = 'pop'; p.style.cssText = `width:380px;max-height:460px;overflow:auto;top:${r.bottom + 6}px;left:${Math.max(10, r.right - 380)}px;position:fixed`;
  p.innerHTML = `<div class="row" style="padding:8px 10px"><b>Notifications</b><span class="spacer"></span><a id="mark-all" class="small">Mark all as read</a></div>` + (list.length ? list.map(n => `<div class="notif-i ${n.read ? '' : 'unread'}" data-id="${n.id}">${icon('bell')}<div style="flex:1"><div class="small">${esc(n.text)}</div><div class="xs muted">${fmtDT(n.date)}</div></div></div>`).join('') : '<div class="empty">No notifications</div>');
  document.body.appendChild(p);
  $('#mark-all', p).onclick = () => { DB.notifications.forEach(n => { if (n.userId === DB.currentUserId) n.read = true; }); saveDB(); p.remove(); render(); };
  $$('.notif-i', p).forEach(el => el.onclick = () => { const n = DB.notifications.find(x => x.id === el.dataset.id); n.read = true; saveDB(); p.remove(); location.hash = n.link || '#/dashboard'; render(); });
  setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('mousedown', h); } }), 0);
}
function userMenu(anchor) {
  popMenu(anchor, [
    { label: 'My Profile', icon: 'user', onClick: () => profileModal() },
    { label: 'Switch User (demo)', icon: 'swap', onClick: () => switchUserModal() },
    '-',
    { label: 'Help & Support', icon: 'help', onClick: () => location.hash = '#/help' },
  ]);
}
function profileModal() {
  const u = me();
  modal({ title: 'My Profile', body: `<div class="row" style="gap:16px">${avatar(u, 'lg')}<div><b style="font-size:16px">${esc(u.name)}</b><div class="t2">${esc(u.title)} · ${esc(deptById(u.deptId).name)}</div></div></div>
    <div class="kv"><span class="k">Email</span><span>:</span><span>${esc(u.email)}</span><span class="k">Role</span><span>:</span><span>${esc(roleById(u.roleId).name)}</span><span class="k">Last Login</span><span>:</span><span>${fmtDT(u.lastLogin)}</span><span class="k">Member Since</span><span>:</span><span>${fmtDate(u.createdAt)}</span></div>` });
}
function switchUserModal() {
  const body = `<div class="info">${icon('info')}<div>This is a demo feature so you can test the full workflow. Log in as an approver to approve memos, then switch back to release them.</div></div>
    <div style="max-height:420px;overflow:auto">${DB.users.filter(u => u.status === 'Active').map(u => { const n = tasksFor(u.id).filter(t => t.kind === 'APPROVAL').length; return `<div class="file-row" style="cursor:pointer" data-u="${u.id}">${avatar(u)}<div style="flex:1"><b>${esc(u.name)}</b> ${u.id === DB.currentUserId ? badge('You', 'b-blue') : ''}<div class="small t2">${esc(u.title)} · ${esc(roleById(u.roleId).name)}</div></div>${n ? `<span class="badge b-orange">${n} to approve</span>` : ''}</div>`; }).join('')}</div>`;
  modal({ title: 'Switch User', body, onMount: (el, close) => $$('[data-u]', el).forEach(r => r.onclick = () => { DB.currentUserId = r.dataset.u; const u = me(); u.lastLogin = iso(NOW()); audit('Authentication', 'User Login', `User ${u.name} logged in to the system.`); saveDB(); close(); toast('You are now logged in as ' + u.name); location.hash = '#/dashboard'; render(); }) });
}

// ---------- router ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [path, qs] = h.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path, parts: path.split('/').filter(Boolean), query };
}
function render() {
  CUR = parseHash();
  const name = CUR.parts[0];
  const page = PAGES[name] || PAGES.notfound;
  const el = $('#content');
  $$('.pop').forEach(p => p.remove());
  let hdr = { title: '', crumbs: null };
  try {
    hdr = page({ el, parts: CUR.parts, query: CUR.query }) || hdr;
  } catch (e) { console.error(e); el.innerHTML = `<div class="card card-pad"><h3>Something went wrong</h3><pre class="small">${esc(e.stack || e)}</pre></div>`; }
  renderTopbar(hdr.title, hdr.crumbs, hdr.sub);
  renderSidebar();
  document.title = (hdr.title ? hdr.title + ' · ' : '') + 'EMMS';
}
function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }
window.addEventListener('hashchange', () => { const n = parseHash().parts[0]; if (!['create', 'edit'].includes(n)) DRAFT = null; render(); window.scrollTo(0, 0); });

PAGES.notfound = ({ el }) => { el.innerHTML = `<div class="card card-pad empty"><h3>Page not found</h3><p><a href="#/dashboard">Go to Dashboard</a></p></div>`; return { title: 'Not Found' }; };

document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  if (window.innerWidth < 800) $('#app').classList.add('collapsed');
  render();
});
