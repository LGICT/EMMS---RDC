// ============ Data store, seed data and business rules ============
const DB_KEY = 'emms-db-v1';
const DAY = 86400000;
const NOW = () => new Date();
const iso = (d) => new Date(d).toISOString();
const daysAgo = (n, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.toISOString(); };
const daysFrom = (n, h = 9, m = 0) => daysAgo(-n, h, m);
const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

let DB = null;

// ---------- Permissions & roles ----------
const PERMISSIONS = [
  ['memo.view', 'View memos'], ['memo.create', 'Create / edit memos'], ['memo.approve', 'Approve memos'],
  ['memo.release', 'Release memos'], ['memo.archive', 'Archive / supersede memos'], ['categories.manage', 'Manage categories'],
  ['reports.view', 'View reports'], ['admin.users', 'Manage users & roles'], ['admin.config', 'System configuration'],
  ['admin.audit', 'View audit logs'], ['admin.backup', 'Backup & recovery'],
];

function seedDB() {
  // deterministic pseudo-random
  let s = 42; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const departments = [
    ['ICT', 'ICT Department', 'Corporate Division'], ['HR', 'HR Department', 'Corporate Division'], ['FIN', 'Finance Department', 'Corporate Division'],
    ['OPS', 'Operations Department', 'Corporate Division'], ['ADM', 'Administration Department', 'Corporate Division'], ['LEGAL', 'Legal Department', 'Corporate Division'],
    ['PROC', 'Procurement Department', 'Corporate Division'], ['MKT', 'Marketing Department', 'Corporate Division'], ['HSE', 'HSE Department', 'Corporate Division'],
    ['EXEC', 'Office of the President', 'Corporate Division'], ['MIN', 'Mining BU', 'Mining BU'], ['LAND', 'Land BU', 'Land BU'],
    ['TNK', 'Tankering BU', 'Tankering BU'], ['CCI', 'Shared Services (CCI)', 'Shared Services (CCI)'],
  ].map(([code, name, division]) => ({ id: 'd-' + code.toLowerCase(), code, name, division, head: null, status: 'Active', createdAt: daysAgo(600) }));

  const roles = [
    { id: 'r-admin', name: 'System Administrator', description: 'Full access to all modules and settings.', perms: PERMISSIONS.map(p => p[0]) },
    { id: 'r-exec', name: 'Executive', description: 'Senior approvers and executives.', perms: ['memo.view', 'memo.create', 'memo.approve', 'memo.release', 'memo.archive', 'reports.view'] },
    { id: 'r-manager', name: 'Department Manager', description: 'Creates, approves and releases department memos.', perms: ['memo.view', 'memo.create', 'memo.approve', 'memo.release', 'memo.archive', 'reports.view', 'categories.manage'] },
    { id: 'r-approver', name: 'Approver', description: 'Reviews and approves memos routed to them.', perms: ['memo.view', 'memo.create', 'memo.approve', 'reports.view'] },
    { id: 'r-author', name: 'Memo Author', description: 'Drafts memos and submits them for approval.', perms: ['memo.view', 'memo.create'] },
    { id: 'r-employee', name: 'Employee', description: 'Reads and acknowledges memos.', perms: ['memo.view'] },
  ];

  const U = (id, name, dept, title, role, status = 'Active') => ({ id, name, email: ((p) => p[0] + '.' + p.slice(1).join(''))(name.toLowerCase().replace(/^atty\.\s*/, '').replace(/[^a-z ]/g, '').trim().split(/\s+/)) + '@leonio.com', deptId: 'd-' + dept, title, roleId: role, status, createdAt: daysAgo(200 + Math.floor(rnd() * 400)), lastLogin: daysAgo(Math.floor(rnd() * 4), 8 + Math.floor(rnd() * 9), Math.floor(rnd() * 59)) });
  const users = [
    U('u-juan', 'Juan Dela Cruz', 'ict', 'ICT Manager', 'r-admin'),
    U('u-noe', 'Noe Garcia', 'ict', 'ICT Admin Supervisor', 'r-approver'),
    U('u-bon', 'Bonifacio Caldito', 'ict', 'ICT Manager', 'r-manager'),
    U('u-luis', 'Luis Antonio Leonio', 'exec', 'Chief Financial Officer', 'r-exec'),
    U('u-lawrence', 'Lawrence N. Leonio', 'exec', 'Chief Executive Officer', 'r-exec'),
    U('u-rachelle', 'Rachelle Ann Villanueva', 'exec', 'Chief Operating Officer', 'r-exec'),
    U('u-maria', 'Maria Santos', 'hr', 'HR Manager', 'r-manager'),
    U('u-angela', 'Maria Angela Reyes', 'fin', 'Finance Supervisor', 'r-author'),
    U('u-analiza', 'Ana Liza Cruz', 'adm', 'Admin Supervisor', 'r-manager'),
    U('u-pedro', 'Pedro Reyes', 'ops', 'Operations Manager', 'r-manager'),
    U('u-jessa', 'Jessa Yu', 'fin', 'Finance Manager', 'r-manager'),
    U('u-carlo', 'Atty. Carlo Dimagiba', 'legal', 'Legal Counsel', 'r-manager'),
    U('u-leo', 'Leo Villanueva', 'mkt', 'Marketing Specialist', 'r-author'),
    U('u-rafael', 'Rafael Ignacio', 'ops', 'Operations Head', 'r-approver'),
    U('u-richard', 'Richard Sison', 'tnk', 'Operations Supervisor', 'r-employee', 'Inactive'),
    U('u-grace', 'Grace Tan', 'min', 'Site Administrator', 'r-employee'),
    U('u-mark', 'Mark Villareal', 'land', 'Project Engineer', 'r-employee'),
    U('u-joy', 'Joy Mendoza', 'cci', 'Shared Services Analyst', 'r-employee'),
    U('u-kevin', 'Kevin Lim', 'proc', 'Procurement Officer', 'r-employee'),
    U('u-ella', 'Ella Santiago', 'hse', 'HSE Officer', 'r-employee'),
    U('u-paolo', 'Paolo Ramos', 'ict', 'Systems Developer', 'r-employee'),
    U('u-nina', 'Nina Torres', 'hr', 'HR Specialist', 'r-employee'),
    U('u-ben', 'Ben Aquino', 'tnk', 'Vessel Coordinator', 'r-employee'),
    U('u-liza', 'Liza Bautista', 'min', 'Mine Safety Officer', 'r-employee'),
  ];
  users.find(u => u.id === 'u-juan').lastLogin = iso(NOW());
  users.find(u => u.id === 'u-ben').status = 'Locked';
  const heads = { 'd-ict': 'u-bon', 'd-hr': 'u-maria', 'd-fin': 'u-jessa', 'd-ops': 'u-pedro', 'd-adm': 'u-analiza', 'd-legal': 'u-carlo', 'd-exec': 'u-lawrence', 'd-mkt': 'u-leo' };
  departments.forEach(d => d.head = heads[d.id] || null);

  const catDefs = [
    ['Human Resources', 'Policies and guidelines related to people management and HR operations.', 'users', '#1d4ed8', 'HR'],
    ['Information Security', 'Information security policies, standards and procedures.', 'shieldc', '#16a34a', 'ICT'],
    ['Operations', 'Operational guidelines and procedures for day-to-day operations.', 'cog2', '#7c5cd6', 'OPS'],
    ['Finance', 'Financial policies, procedures and guidelines.', 'coin', '#f59e0b', 'FIN'],
    ['ICT', 'ICT policies, standards, and system procedures.', 'monitor', '#1d4ed8', 'ICT'],
    ['Administration', 'Administrative policies and general administrative matters.', 'building', '#dc2626', 'ADM'],
    ['Legal', 'Legal policies, compliance, and regulatory matters.', 'scale', '#0e8fa6', 'LEGAL'],
    ['Procurement', 'Procurement, purchasing and supplier management policies.', 'cart', '#f59e0b', 'PROC'],
    ['Marketing', 'Marketing, communications and brand guidelines.', 'bars', '#db2777', 'MKT'],
    ['Health, Safety & Environment', 'Health, safety and environment management policies.', 'shield', '#64748b', 'HSE'],
    ['Corporate Announcements', 'Company-wide announcements and advisories.', 'send', '#0e8fa6', 'EXEC'],
    ['Training & Development', 'Learning programs and training guidelines.', 'sparkles', '#7c5cd6', 'HR'],
  ];
  const categories = catDefs.map(([name, description, ic, color], i) => ({ id: 'c-' + (i + 1), name, description, icon: ic, color, status: 'Active', createdAt: daysAgo(500), updatedAt: daysAgo(i + 2), updatedBy: pick(['u-maria', 'u-noe', 'u-pedro', 'u-jessa', 'u-juan']) }));
  const catByName = Object.fromEntries(categories.map(c => [c.name, c]));

  const workflows = [
    { id: 'wf-std', name: 'Standard Approval Workflow', description: 'Initial approver → Department manager → Final approver.', status: 'Active', steps: [{ label: 'Initial Approver', userId: 'u-noe', slaDays: 2 }, { label: 'Approver', userId: 'u-bon', slaDays: 2 }, { label: 'Final Approver', userId: 'u-rachelle', slaDays: 1 }], escalateTo: 'u-luis' },
    { id: 'wf-quick', name: 'Department Head Approval', description: 'Single-level approval by a department head.', status: 'Active', steps: [{ label: 'Final Approver', userId: 'u-bon', slaDays: 2 }], escalateTo: 'u-rachelle' },
    { id: 'wf-exec', name: 'Executive Approval Workflow', description: 'For company-wide policies requiring CFO and CEO approval.', status: 'Active', steps: [{ label: 'Initial Approver', userId: 'u-rafael', slaDays: 2 }, { label: 'Approver', userId: 'u-noe', slaDays: 2 }, { label: 'Approver', userId: 'u-maria', slaDays: 2 }, { label: 'Approver', userId: 'u-luis', slaDays: 2 }, { label: 'Final Approver', userId: 'u-lawrence', slaDays: 1 }], escalateTo: 'u-lawrence' },
  ];

  const memoTypes = ['Memorandum', 'Policy Memorandum', 'Advisory', 'Circular', 'Office Order', 'Announcement'];

  const templates = [
    { id: 't-1', name: 'General Memorandum', type: 'Memorandum', categoryId: 'c-6', description: 'Standard memorandum layout.', content: '<p>Please be informed that ...</p><p>For questions, please contact the [Department].</p><p>Thank you.</p>', status: 'Active', updatedAt: daysAgo(30) },
    { id: 't-2', name: 'Policy Update', type: 'Policy Memorandum', categoryId: 'c-4', description: 'Announce new or revised policies.', content: '<p>This memorandum serves to inform all concerned of the updated [policy name] effective [date].</p><p>Key updates include:</p><ol><li>Update one</li><li>Update two</li></ol><p>All employees are required to comply with these policies.</p><p>Please acknowledge receipt and understanding of this memorandum.</p>', status: 'Active', updatedAt: daysAgo(20) },
    { id: 't-3', name: 'System Advisory', type: 'Advisory', categoryId: 'c-5', description: 'ICT maintenance and system advisories.', content: '<p>Please be advised that [system] will undergo scheduled maintenance on [date] from [time] to [time].</p><p>During this period, the system will not be accessible.</p><p>We apologize for any inconvenience.</p>', status: 'Active', updatedAt: daysAgo(12) },
    { id: 't-4', name: 'Holiday Announcement', type: 'Announcement', categoryId: 'c-11', description: 'Work schedule changes for holidays.', content: '<p>In observance of [holiday], please be informed that work will be suspended on [date].</p><p>Work resumes on [date].</p>', status: 'Active', updatedAt: daysAgo(60) },
  ];

  const notifTemplates = [
    { id: 'n-1', event: 'Memo Submitted for Approval', channel: 'Email & In-System', subject: 'Approval Required: {{memo_no}} – {{subject}}', body: 'Hi {{recipient}},\n\nA memo has been submitted for your approval.\n\nMemo No: {{memo_no}}\nSubject: {{subject}}\nDue: {{due_date}}\n\nPlease review it in EMMS.', status: 'Active', updatedAt: daysAgo(10) },
    { id: 'n-2', event: 'Memo Approved', channel: 'Email & In-System', subject: 'Approved: {{memo_no}}', body: 'Hi {{recipient}},\n\nYour memo {{memo_no}} – {{subject}} has been fully approved and is ready for release.', status: 'Active', updatedAt: daysAgo(10) },
    { id: 'n-3', event: 'Memo Returned for Revision', channel: 'Email & In-System', subject: 'Returned for Revision: {{memo_no}}', body: 'Hi {{recipient}},\n\n{{approver}} returned your memo for revision.\n\nComments: {{comments}}', status: 'Active', updatedAt: daysAgo(14) },
    { id: 'n-4', event: 'Memo Rejected', channel: 'Email & In-System', subject: 'Rejected: {{memo_no}}', body: 'Hi {{recipient}},\n\nYour memo {{memo_no}} was rejected by {{approver}}.\n\nComments: {{comments}}', status: 'Active', updatedAt: daysAgo(14) },
    { id: 'n-5', event: 'Memo Released', channel: 'Email, In-System & Teams', subject: 'New Memo: {{memo_no}} – {{subject}}', body: 'Hi {{recipient}},\n\nA new memorandum has been released.\n\n{{subject}}\nEffective: {{effective_date}}\n\nPlease read and acknowledge by {{ack_due}}.', status: 'Active', updatedAt: daysAgo(5) },
    { id: 'n-6', event: 'Acknowledgement Reminder', channel: 'Email', subject: 'Reminder: Please acknowledge {{memo_no}}', body: 'Hi {{recipient}},\n\nThis is a reminder to acknowledge memo {{memo_no}} – {{subject}} on or before {{ack_due}}.', status: 'Active', updatedAt: daysAgo(5) },
    { id: 'n-7', event: 'Approval Overdue (Escalation)', channel: 'Email', subject: 'Escalation: {{memo_no}} approval overdue', body: 'Hi {{recipient}},\n\nThe approval of memo {{memo_no}} by {{approver}} is overdue and has been escalated to you.', status: 'Active', updatedAt: daysAgo(30) },
  ];

  const settings = {
    orgName: 'Leonio Group', systemName: 'EMMS', systemFullName: 'Enterprise Memo Management System',
    numberFormat: 'LGC-{DEPT}-MM-{YEAR}-{SEQ}', defaultAckDays: 5, defaultSlaDays: 2, defaultPriority: 'Normal',
    retentionYears: 5, autoArchiveExpired: true, sessionTimeout: 30, passwordMinLength: 8, maxUploadMB: 20,
    allowedFiles: 'PDF, DOCX, XLSX, PPTX, JPG, PNG', emailEnabled: true, teamsEnabled: true, timezone: 'Asia/Manila (PHT)',
    footerNote: 'All memos are official company issuances. Ensure accuracy, clarity and compliance.',
    memoTypes, priorities: ['Low', 'Normal', 'High', 'Urgent'], confidentiality: ['Public', 'Internal Use', 'Confidential', 'Restricted'],
  };

  const db = { version: 1, settings, departments, roles, users, categories, workflows, templates, notifTemplates, memos: [], audit: [], notifications: [], reports: [], backups: [], currentUserId: 'u-juan', recent: [], seq: {} };

  // ---- memos ----
  const titles = {
    'Human Resources': ['Revised Leave Policy', 'Work From Home Guidelines', 'Employee Code of Conduct (2026 Update)', 'Overtime Pay Guidelines', 'Performance Appraisal Schedule', 'Employee Referral Program', 'Attendance and Punctuality Policy', 'Flexible Working Hours'],
    'Information Security': ['Password Policy', 'Acceptable Use Policy', 'Data Classification Standard', 'Phishing Awareness Advisory', 'Remote Access Policy'],
    'Operations': ['Equipment Utilization Guidelines', 'Vehicle Use Policy', 'Safety Guidelines for Field Operations', 'Equipment Maintenance Policy', 'Fuel Monitoring Procedure', 'Site Access Protocol'],
    'Finance': ['Budget Guidelines', 'Petty Cash Policy', 'Expense Reimbursement Policy', 'Financial Policy Update', 'Travel Reimbursement Policy', 'Budget Preparation Guidelines', 'Travel and Accommodation Policy'],
    'ICT': ['Implementation of Multi-Factor Authentication (MFA)', 'IT Asset Management Guidelines', 'Email Migration Advisory', 'Scheduled System Maintenance', 'Software Installation Policy'],
    'Administration': ['Office Dress Code', 'Office Supplies Policy', 'Parking Allocation Guidelines', 'Visitor Management Procedure'],
    'Legal': ['Data Privacy Policy', 'Contract Review Policy', 'Conflict of Interest Disclosure'],
    'Procurement': ['Supplier Accreditation Policy', 'Purchase Request Procedure'],
    'Marketing': ['Brand Guidelines 2026', 'Social Media Policy'],
    'Health, Safety & Environment': ['Fire Drill Schedule', 'PPE Compliance Policy', 'Waste Segregation Guidelines'],
    'Corporate Announcements': ['Holiday Schedule – All Saints Day', 'Company Anniversary Celebration', 'Year-End Party Advisory'],
    'Training & Development': ['Leadership Training Program', 'Mandatory Compliance Training'],
  };
  const catDept = { 'Human Resources': 'd-hr', 'Information Security': 'd-ict', 'Operations': 'd-ops', 'Finance': 'd-fin', 'ICT': 'd-ict', 'Administration': 'd-adm', 'Legal': 'd-legal', 'Procurement': 'd-proc', 'Marketing': 'd-mkt', 'Health, Safety & Environment': 'd-hse', 'Corporate Announcements': 'd-exec', 'Training & Development': 'd-hr' };
  const deptAuthor = { 'd-hr': 'u-maria', 'd-ict': 'u-juan', 'd-ops': 'u-pedro', 'd-fin': 'u-angela', 'd-adm': 'u-analiza', 'd-legal': 'u-carlo', 'd-proc': 'u-kevin', 'd-mkt': 'u-leo', 'd-hse': 'u-ella', 'd-exec': 'u-rachelle' };
  const body = (t) => `<p>This memorandum serves to inform all concerned of the ${t.toLowerCase().includes('policy') ? 'updated ' + t : t} effective as stated below.</p><p>Key updates include:</p><ol><li>Scope and coverage of the ${t}</li><li>Roles and responsibilities of concerned departments</li><li>Procedures and timelines to be followed</li><li>Compliance and monitoring requirements</li></ol><p>All employees are required to comply with this memorandum.</p><p>Please acknowledge receipt and understanding of this memorandum.</p>`;

  const statusPlan = [];
  let all = [];
  Object.entries(titles).forEach(([cat, list]) => list.forEach(t => all.push([cat, t])));
  // assign statuses
  all.forEach(([cat, t], i) => {
    let st = 'Active';
    if (i % 11 === 3) st = 'Superseded';
    if (i % 13 === 5) st = 'Archived';
    statusPlan.push(st);
  });

  const set = (title, status, extra = {}) => { const idx = all.findIndex(a => a[1] === title); if (idx >= 0) { statusPlan[idx] = status; Object.assign(all[idx], { extra }); all[idx].extra = extra; } };
  set('Revised Leave Policy', 'Pending Approval', { approver: 'u-juan', level: 1 });
  set('Financial Policy Update', 'Pending Approval', { approver: 'u-juan', level: 1, wf: 'wf-exec-juan' });
  set('Overtime Pay Guidelines', 'Pending Approval', { approver: 'u-juan', level: 0 });
  set('Fuel Monitoring Procedure', 'Pending Approval', { approver: 'u-rafael', level: 0 });
  set('Supplier Accreditation Policy', 'Pending Approval', { approver: 'u-noe', level: 0 });
  set('Software Installation Policy', 'Approved', { author: 'u-juan' });
  set('Vehicle Use Policy', 'Approved', { author: 'u-juan' });
  set('IT Asset Management Guidelines', 'Draft', { author: 'u-juan' });
  set('Implementation of Multi-Factor Authentication (MFA)', 'Draft', { author: 'u-juan' });
  set('Email Migration Advisory', 'Returned', { author: 'u-juan' });
  set('Year-End Party Advisory', 'Draft', { author: 'u-rachelle' });
  set('Social Media Policy', 'Rejected', {});
  set('Petty Cash Policy', 'Archived', {});
  set('Office Dress Code', 'Superseded', {});
  set('Holiday Schedule – All Saints Day', 'Archived', {});

  // historical memos for realistic volume
  const histSuffix = ['Q1 Update', 'Q2 Update', 'Q3 Update', 'Clarification', 'Reminder', 'Amendment', '2025 Edition', 'Implementing Guidelines'];
  const cats = Object.keys(titles);
  for (let k = 0; k < 140; k++) {
    const cat = cats[k % cats.length]; const base = titles[cat][Math.floor(rnd() * titles[cat].length)];
    const item = [cat, `${base} – ${histSuffix[Math.floor(rnd() * histSuffix.length)]}`];
    const age = 6 + Math.floor(rnd() * 420);
    item.extra = { age };
    all.push(item);
    statusPlan.push(age > 300 ? (rnd() < 0.6 ? 'Archived' : 'Superseded') : rnd() < 0.12 ? 'Superseded' : 'Active');
  }

  const seqs = {};
  const yr = NOW().getFullYear();
  all.forEach(([cat, title], i) => {
    const extra = all[i].extra || {};
    let status = statusPlan[i];
    const deptId = catDept[cat];
    const dept = departments.find(d => d.id === deptId);
    const author = extra.author || deptAuthor[deptId] || 'u-juan';
    const age = extra.age ? extra.age : status === 'Draft' ? Math.floor(rnd() * 4) + 1 : status === 'Pending Approval' || status === 'Approved' || status === 'Returned' ? Math.floor(rnd() * 5) + 2 : status === 'Archived' ? 200 + Math.floor(rnd() * 200) : status === 'Superseded' ? 90 + Math.floor(rnd() * 100) : Math.floor(rnd() * 80) + 4;
    seqs[dept.code] = (seqs[dept.code] || 0) + 1;
    const created = daysAgo(age, 9 + Math.floor(rnd() * 7), Math.floor(rnd() * 59));
    let wf = workflows[0];
    if (extra.wf === 'wf-exec-juan') wf = { ...workflows[2], steps: [{ label: 'Initial Approver', userId: 'u-rafael', slaDays: 2 }, { label: 'Approver', userId: 'u-juan', slaDays: 2 }, { label: 'Final Approver', userId: 'u-luis', slaDays: 1 }] };
    let steps = wf.steps.map(s => ({ ...s }));
    if (status === 'Pending Approval' && extra.approver && extra.level === 0) steps[0].userId = extra.approver;
    if (status === 'Pending Approval' && extra.approver && extra.level === 1 && !extra.wf) steps[1].userId = extra.approver;
    steps = steps.map(s => s.userId === author ? { ...s, userId: 'u-noe' === author ? 'u-bon' : 'u-noe' } : s);
    const m = {
      id: 'm-' + (i + 1), no: `LGC-${dept.code}-MM-${yr}-${String(seqs[dept.code]).padStart(3, '0')}`,
      type: cat === 'Corporate Announcements' ? 'Announcement' : title.includes('Advisory') ? 'Advisory' : title.includes('Policy') ? 'Policy Memorandum' : 'Memorandum',
      categoryId: catByName[cat].id, deptId, priority: pick(['Normal', 'Normal', 'Normal', 'High', 'Low']), subject: title,
      purpose: `To inform all concerned regarding the ${title}.`, to: ['all'], cc: [], reference: '', confidentiality: 'Internal Use',
      keywords: title.split(/\s+/).filter(w => w.length > 4).slice(0, 3).join(', '),
      effectiveDate: null, expiryDate: null, releaseDate: null, content: body(title), attachments: [],
      workflowId: wf.id, approvals: [], currentLevel: 0, status: 'Draft', createdBy: author, createdAt: created, updatedAt: created, updatedBy: author,
      version: '1.0', versions: [], requireAck: true, ackDueDays: 5, acks: {}, notify: true, urgent: false, coverNote: '', history: [{ date: created, userId: author, action: 'Created', comment: 'Draft created' }],
      releasedAt: null, releasedBy: null, views: Math.floor(rnd() * 400), comments: [], pages: 1 + Math.floor(rnd() * 5),
    };
    if (title === 'Implementation of Multi-Factor Authentication (MFA)') {
      m.purpose = "To enhance the security of Leonio Group's systems and protect user accounts by implementing Multi-Factor Authentication (MFA) for all users.";
      m.content = '<p>Please be informed that starting September 1, 2026, Multi-Factor Authentication (MFA) will be required for all users to access company systems and applications.</p><p>This measure is part of our ongoing effort to strengthen our security posture and ensure the confidentiality, integrity, and availability of our information assets.</p><p>For questions, please contact the ICT Department.</p><p>Thank you.</p>';
      m.cc = ['dept:d-ict']; m.to = ['all'];
    }
    if (title === 'Financial Policy Update') {
      m.content = '<p>This memorandum serves to inform all concerned of the updated financial policies effective August 20, 2026.</p><p>Key updates include:</p><ol><li>Updated approval thresholds for expenses</li><li>Revised budgeting guidelines</li><li>New reporting requirements</li><li>Clarification on reimbursement procedures</li></ol><p>All employees are required to comply with these policies.</p><p>Please acknowledge receipt and understanding of this memorandum.</p>';
      m.priority = 'High'; m.keywords = 'Financial Policy, Budget, Expense, Reimbursement';
    }
    m.effectiveDate = daysAgo(age - 6 < 0 ? -(6 - age) : age - 6).slice(0, 10);
    if (status !== 'Draft') {
      // submission
      const sub = new Date(new Date(created).getTime() + DAY * 0.3).toISOString();
      m.history.push({ date: sub, userId: author, action: 'Submitted for Approval', comment: 'Please review and approve.' });
      let t = new Date(sub).getTime();
      m.approvals = steps.map((s, k) => ({ level: k + 1, label: s.label, userId: s.userId, slaDays: s.slaDays, status: 'Waiting', date: null, comment: '', receivedAt: null, due: null }));
      let stopAt = m.approvals.length;
      if (status === 'Pending Approval') stopAt = extra.level ?? 0;
      if (status === 'Returned' || status === 'Rejected') stopAt = 1;
      for (let k = 0; k < m.approvals.length; k++) {
        const a = m.approvals[k];
        a.receivedAt = new Date(t).toISOString(); a.due = new Date(t + a.slaDays * DAY).toISOString();
        if (k < stopAt) {
          const dur = (0.2 + rnd() * (rnd() < 0.12 ? 3.5 : 1.6)) * DAY; t += dur;
          if (t > Date.now()) t = Date.now() - DAY * 0.2;
          a.status = 'Approved'; a.date = new Date(t).toISOString(); a.comment = pick(['Looks good.', 'Approved.', 'For compliance.', 'Noted, approved.', '']);
          m.history.push({ date: a.date, userId: a.userId, action: 'Approved', comment: a.comment, level: k + 1 });
        } else if (k === stopAt) {
          if (status === 'Pending Approval') { a.status = 'Pending'; if (title === 'Revised Leave Policy') { a.due = daysAgo(1, 17); } }
          else if (status === 'Returned') { a.status = 'Returned'; t += DAY * 0.6; a.date = new Date(Math.min(t, Date.now())).toISOString(); a.comment = 'Please include the migration timeline and contact person.'; m.history.push({ date: a.date, userId: a.userId, action: 'Returned for Revision', comment: a.comment, level: k + 1 }); }
          else if (status === 'Rejected') { a.status = 'Rejected'; t += DAY * 0.8; a.date = new Date(Math.min(t, Date.now())).toISOString(); a.comment = 'Not aligned with current brand direction.'; m.history.push({ date: a.date, userId: a.userId, action: 'Rejected', comment: a.comment, level: k + 1 }); }
          break;
        }
      }
      m.currentLevel = Math.min(stopAt, m.approvals.length - 1);
      m.status = status === 'Pending Approval' || status === 'Returned' || status === 'Rejected' ? status : 'Approved';
      if (['Active', 'Superseded', 'Archived'].includes(status)) {
        const rel = new Date(Math.min(t + DAY * (0.2 + rnd()), Date.now() - DAY)).toISOString();
        m.status = status; m.releasedAt = rel; m.releaseDate = rel; m.releasedBy = author;
        m.effectiveDate = rel.slice(0, 10);
        if (rnd() < 0.5) m.expiryDate = new Date(new Date(rel).getTime() + 730 * DAY).toISOString().slice(0, 10);
        m.history.push({ date: rel, userId: author, action: 'Released', comment: 'Memo released to recipients' });
        // acknowledgements
        const recips = users.filter(u => u.status !== 'Inactive').map(u => u.id);
        recips.forEach(r => {
          const ackDue = new Date(rel).getTime() + 5 * DAY;
          const recentlyReleased = Date.now() - new Date(rel).getTime() < 5 * DAY;
          let p = recentlyReleased ? 0.55 : 0.93;
          if (r === 'u-juan') p = (i % 7 === 0 && age < 40) ? 0 : 1; // a few pending for Juan
          if (rnd() < p) { const at = Math.min(Date.now(), new Date(rel).getTime() + rnd() * 6 * DAY); m.acks[r] = new Date(at).toISOString(); }
        });
        if (status === 'Archived') { m.history.push({ date: daysAgo(10), userId: 'u-juan', action: 'Archived', comment: 'Archived per retention policy' }); m.archivedAt = daysAgo(10); }
        if (status === 'Superseded') { m.history.push({ date: daysAgo(age - 60 > 0 ? age - 60 : 3), userId: author, action: 'Superseded', comment: 'Replaced by a newer version' }); }
        m.versions = [{ version: '1.0', date: rel, by: author, note: 'Initial release', content: m.content, subject: m.subject }];
      }
      if (status === 'Approved') m.history.push({ date: m.approvals[m.approvals.length - 1].date, userId: 'system', action: 'Fully Approved', comment: 'Ready for release' });
    }
    if (status === 'Draft') m.status = 'Draft';
    if (['Active'].includes(m.status) && rnd() < 0.25) {
      // add a later version
      const vd = new Date(Math.min(Date.now() - DAY, new Date(m.releasedAt).getTime() + 3 * DAY)).toISOString();
      m.versions.push({ version: '1.1', date: vd, by: author, note: 'Minor corrections to wording', content: m.content, subject: m.subject }); m.version = '1.1';
    }
    if (title === 'Implementation of Multi-Factor Authentication (MFA)') m.attachments = [{ id: 'att-demo-1', name: 'MFA Implementation Guide.pdf', size: 1258291, type: 'application/pdf', demo: true }];
    if (title === 'Financial Policy Update') m.attachments = [{ id: 'att-demo-2', name: 'Financial Policy Update_Draft.pdf', size: 1258291, type: 'application/pdf', demo: true }, { id: 'att-demo-3', name: 'Updated Expense Thresholds.xlsx', size: 184320, type: 'application/vnd.ms-excel', demo: true }];
    db.memos.push(m);
  });
  // number memos chronologically per department & year
  db.seq = {};
  db.memos.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach(m => {
    const code = departments.find(d => d.id === m.deptId).code; const y = new Date(m.createdAt).getFullYear(); const key = code + '-' + y;
    db.seq[key] = (db.seq[key] || 0) + 1; m.no = `LGC-${code}-MM-${y}-${String(db.seq[key]).padStart(3, '0')}`;
  });
  db.memos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // audit seed
  db.memos.forEach(m => m.history.forEach(h => db.audit.push({ id: uid('a'), date: h.date, userId: h.userId, module: 'Memo', action: h.action, details: `${h.action}: ${m.no} – ${m.subject}`, ip: '10.0.' + (1 + Math.floor(rnd() * 20)) + '.' + Math.floor(rnd() * 250) })));
  users.forEach(u => db.audit.push({ id: uid('a'), date: u.lastLogin, userId: u.id, module: 'Authentication', action: 'User Login', details: `User ${u.name} logged in to the system.`, ip: '10.0.1.' + Math.floor(rnd() * 250) }));
  db.audit.push({ id: uid('a'), date: daysAgo(0, 2, 30), userId: 'system', module: 'Backup', action: 'Backup Completed', details: 'System backup completed successfully.', ip: 'localhost' });
  db.audit.sort((a, b) => b.date.localeCompare(a.date));

  db.notifications = [
    { id: uid('n'), userId: 'u-juan', date: daysAgo(0, 8, 10), text: `Memo ${db.memos.find(m => m.subject === 'Revised Leave Policy').no} "Revised Leave Policy" is awaiting your approval.`, link: '#/approvals', read: false },
    { id: uid('n'), userId: 'u-juan', date: daysAgo(0, 7, 45), text: 'Your memo "Vehicle Use Policy" has been fully approved and is ready for release.', link: '#/releases', read: false },
    { id: uid('n'), userId: 'u-juan', date: daysAgo(1, 16, 20), text: 'Noe Garcia returned "Email Migration Advisory" for revision.', link: '#/drafts', read: false },
    { id: uid('n'), userId: 'u-juan', date: daysAgo(1, 10, 0), text: 'New memo released: Employee Code of Conduct (2026 Update). Please acknowledge.', link: '#/acknowledgements', read: false },
    { id: uid('n'), userId: 'u-juan', date: daysAgo(2, 9, 0), text: 'Reminder: 2 memos are overdue for acknowledgement.', link: '#/acknowledgements', read: true },
  ];
  db.reports = [
    { id: uid('r'), name: 'Monthly Memo Activity Report', description: 'Summary of memo activity for the selected date range.', by: 'u-juan', date: daysAgo(0, 10, 15), range: 'This month', tab: 'activity' },
    { id: uid('r'), name: 'Approval Performance Report', description: 'Performance of approvers and approval turnaround time.', by: 'u-juan', date: daysAgo(0, 10, 10), range: 'This month', tab: 'approval' },
    { id: uid('r'), name: 'Category Breakdown Report', description: 'Breakdown of memos by category.', by: 'u-juan', date: daysAgo(0, 10, 5), range: 'This month', tab: 'category' },
    { id: uid('r'), name: 'SLA Compliance Report', description: 'SLA compliance and overdue memo analysis.', by: 'u-juan', date: daysAgo(0, 10, 0), range: 'This month', tab: 'sla' },
  ];
  db.backups = [
    { id: uid('b'), date: daysAgo(0, 2, 30), type: 'Automatic', size: '—', by: 'system', status: 'Completed' },
    { id: uid('b'), date: daysAgo(1, 2, 30), type: 'Automatic', size: '—', by: 'system', status: 'Completed' },
  ];
  db.recent = ['m-' + (titles['Human Resources'].length + titles['Information Security'].length - 4), 'm-2', 'm-21', 'm-14'].filter(id => db.memos.find(m => m.id === id));
  return db;
}

// ---------- persistence ----------
function loadDB() {
  try { const raw = localStorage.getItem(DB_KEY); if (raw) { DB = JSON.parse(raw); return; } } catch (e) { console.warn(e); }
  DB = seedDB(); saveDB();
}
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
  catch (e) { toast('Could not save – browser storage is full.', true); }
}
function resetDB() { DB = seedDB(); saveDB(); }

// ---------- file storage (IndexedDB) ----------
const FileStore = {
  _db: null,
  open() { return this._db ? Promise.resolve(this._db) : new Promise((res, rej) => { const r = indexedDB.open('emms-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => { this._db = r.result; res(r.result); }; r.onerror = () => rej(r.error); }); },
  async put(id, blob) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(blob, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async get(id) { const db = await this.open(); return new Promise((res) => { const tx = db.transaction('files'); const r = tx.objectStore('files').get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); },
};

// ---------- lookups ----------
const me = () => DB.users.find(u => u.id === DB.currentUserId);
const userById = (id) => DB.users.find(u => u.id === id) || (id === 'system' ? { id: 'system', name: 'System', title: '', deptId: null } : { id, name: 'Unknown', title: '' });
const deptById = (id) => DB.departments.find(d => d.id === id) || { name: '—', code: '—' };
const catById = (id) => DB.categories.find(c => c.id === id) || { name: '—', color: '#999', icon: 'folder' };
const roleById = (id) => DB.roles.find(r => r.id === id) || { name: '—', perms: [] };
const memoById = (id) => DB.memos.find(m => m.id === id);
const wfById = (id) => DB.workflows.find(w => w.id === id);
const can = (perm) => { const u = me(); return !!u && roleById(u.roleId).perms.includes(perm); };
const userLabel = (id) => { const u = userById(id); return u.title ? `${u.name} (${u.title})` : u.name; };

function recipientsOf(memo) {
  const set = new Set();
  const active = DB.users.filter(u => u.status !== 'Inactive');
  (memo.to || []).forEach(t => {
    if (t === 'all') active.forEach(u => set.add(u.id));
    else if (t.startsWith('dept:')) active.filter(u => u.deptId === t.slice(5)).forEach(u => set.add(u.id));
    else if (t.startsWith('user:')) set.add(t.slice(5));
  });
  return [...set];
}
function recipientLabel(t) {
  if (t === 'all') return 'All Employees';
  if (t.startsWith('dept:')) return deptById(t.slice(5)).name;
  if (t.startsWith('user:')) return userById(t.slice(5)).name;
  return t;
}
function ackDueDate(m) { return m.releasedAt ? new Date(new Date(m.releasedAt).getTime() + (m.ackDueDays || 5) * DAY) : null; }
function ackStats(m) {
  const r = recipientsOf(m); const due = ackDueDate(m); const now = Date.now();
  const ack = r.filter(id => m.acks[id]).length; const pending = r.length - ack;
  const overdue = due && due.getTime() < now ? pending : 0;
  return { total: r.length, ack, pending: pending - overdue, overdue, rate: r.length ? ack / r.length : 0 };
}

// ---------- audit & notifications ----------
function audit(module, action, details) { DB.audit.unshift({ id: uid('a'), date: iso(NOW()), userId: DB.currentUserId, module, action, details, ip: '127.0.0.1' }); if (DB.audit.length > 3000) DB.audit.length = 3000; }
function notify(userId, text, link) { if (!userId || userId === DB.currentUserId) return; DB.notifications.unshift({ id: uid('n'), userId, date: iso(NOW()), text, link, read: false }); }

// ---------- numbering ----------
function nextMemoNo(deptId) {
  const d = deptById(deptId); const yr = NOW().getFullYear(); const key = d.code + '-' + yr;
  DB.seq[key] = (DB.seq[key] || 0) + 1;
  return DB.settings.numberFormat.replace('{DEPT}', d.code).replace('{YEAR}', yr).replace('{SEQ}', String(DB.seq[key]).padStart(3, '0')).replace('{MM}', String(NOW().getMonth() + 1).padStart(2, '0'));
}

// ---------- workflow actions ----------
const MemoActions = {
  saveDraft(data) {
    let m = data.id ? memoById(data.id) : null;
    const now = iso(NOW());
    if (!m) {
      m = { id: uid('m'), no: nextMemoNo(data.deptId || me().deptId), status: 'Draft', createdBy: DB.currentUserId, createdAt: now, version: '1.0', versions: [], acks: {}, approvals: [], currentLevel: 0, history: [{ date: now, userId: DB.currentUserId, action: 'Created', comment: 'Draft created' }], comments: [], views: 0, pages: 1, attachments: [] };
      DB.memos.unshift(m);
      audit('Memo', 'Memo Created', `Draft ${m.no} – ${data.subject} created.`);
    } else {
      m.history.push({ date: now, userId: DB.currentUserId, action: 'Edited', comment: 'Draft updated' });
      audit('Memo', 'Memo Updated', `${m.no} – ${data.subject} updated.`);
    }
    Object.assign(m, data, { id: m.id, updatedAt: now, updatedBy: DB.currentUserId });
    if (m.status === 'Returned' || m.status === 'Rejected') { /* stays until resubmitted */ }
    saveDB(); return m;
  },
  submit(m, opts) {
    const wf = wfById(opts.workflowId) || DB.workflows[0];
    const steps = wf.steps.map(s => ({ ...s }));
    if (opts.initialApprover) steps[0].userId = opts.initialApprover;
    const now = Date.now();
    m.workflowId = wf.id; m.coverNote = opts.coverNote || ''; m.approvalPriority = opts.priority || m.priority;
    m.approvals = steps.map((s, k) => ({ level: k + 1, label: s.label, userId: s.userId, slaDays: s.slaDays, status: k === 0 ? 'Pending' : 'Waiting', date: null, comment: '', receivedAt: k === 0 ? iso(now) : null, due: k === 0 ? (opts.dueDate ? new Date(opts.dueDate + 'T17:00').toISOString() : iso(now + s.slaDays * DAY)) : null }));
    m.currentLevel = 0; m.status = 'Pending Approval'; m.submittedAt = iso(now); m.notifyOn = opts.notifyOn || [];
    m.history.push({ date: iso(now), userId: DB.currentUserId, action: 'Submitted for Approval', comment: m.coverNote });
    notify(m.approvals[0].userId, `"${m.subject}" (${m.no}) was submitted for your approval.`, '#/approval/' + m.id);
    audit('Memo', 'Submitted for Approval', `${m.no} submitted to ${wf.name}.`);
    saveDB();
  },
  decide(m, decision, comment, delegateTo) {
    const a = m.approvals[m.currentLevel]; const now = iso(NOW());
    if (!a) return;
    if (decision === 'delegate') {
      const prev = a.userId; a.userId = delegateTo; a.delegatedFrom = prev;
      m.history.push({ date: now, userId: DB.currentUserId, action: 'Delegated', comment: `Delegated to ${userById(delegateTo).name}. ${comment || ''}`, level: a.level });
      notify(delegateTo, `An approval for "${m.subject}" was delegated to you.`, '#/approval/' + m.id);
      audit('Approval', 'Delegated', `${m.no} level ${a.level} delegated to ${userById(delegateTo).name}.`);
      saveDB(); return;
    }
    a.date = now; a.comment = comment || '';
    if (comment) m.comments.push({ date: now, userId: DB.currentUserId, text: comment, action: decision });
    if (decision === 'approve') {
      a.status = 'Approved';
      m.history.push({ date: now, userId: DB.currentUserId, action: 'Approved', comment, level: a.level });
      if (m.currentLevel < m.approvals.length - 1) {
        m.currentLevel++; const n = m.approvals[m.currentLevel]; n.status = 'Pending'; n.receivedAt = now; n.due = iso(Date.now() + n.slaDays * DAY);
        notify(n.userId, `"${m.subject}" (${m.no}) is awaiting your approval.`, '#/approval/' + m.id);
      } else {
        m.status = 'Approved'; m.approvedAt = now;
        m.history.push({ date: now, userId: 'system', action: 'Fully Approved', comment: 'Ready for release' });
        notify(m.createdBy, `Your memo "${m.subject}" has been fully approved and is ready for release.`, '#/release/' + m.id);
      }
      audit('Approval', 'Memo Approved', `${m.no} approved at level ${a.level}.`);
    } else if (decision === 'return') {
      a.status = 'Returned'; m.status = 'Returned';
      m.history.push({ date: now, userId: DB.currentUserId, action: 'Returned for Revision', comment, level: a.level });
      notify(m.createdBy, `"${m.subject}" was returned for revision by ${me().name}.`, '#/memo/' + m.id);
      audit('Approval', 'Returned for Revision', `${m.no} returned at level ${a.level}.`);
    } else if (decision === 'reject') {
      a.status = 'Rejected'; m.status = 'Rejected';
      m.history.push({ date: now, userId: DB.currentUserId, action: 'Rejected', comment, level: a.level });
      notify(m.createdBy, `"${m.subject}" was rejected by ${me().name}.`, '#/memo/' + m.id);
      audit('Approval', 'Memo Rejected', `${m.no} rejected at level ${a.level}.`);
    }
    saveDB();
  },
  release(m, opts) {
    const now = iso(NOW());
    Object.assign(m, opts);
    const scheduled = opts.releaseDate && new Date(opts.releaseDate).getTime() > Date.now() + 60000;
    m.status = 'Active'; m.releasedAt = scheduled ? new Date(opts.releaseDate).toISOString() : now; m.releasedBy = DB.currentUserId; m.releaseDate = m.releasedAt;
    m.versions = m.versions || []; m.versions.push({ version: m.version || '1.0', date: m.releasedAt, by: DB.currentUserId, note: m.versions.length ? 'Revised release' : 'Initial release', content: m.content, subject: m.subject });
    m.history.push({ date: now, userId: DB.currentUserId, action: scheduled ? 'Release Scheduled' : 'Released', comment: scheduled ? 'Scheduled for ' + fmtDT(m.releasedAt) : 'Memo released to recipients' });
    if (m.supersedes) { const old = memoById(m.supersedes); if (old && old.status === 'Active') { old.status = 'Superseded'; old.supersededBy = m.id; old.history.push({ date: now, userId: DB.currentUserId, action: 'Superseded', comment: 'Superseded by ' + m.no }); } }
    recipientsOf(m).forEach(u => notify(u, `New memo released: "${m.subject}" (${m.no})${m.requireAck ? ' – please acknowledge.' : ''}`, '#/memo/' + m.id));
    audit('Memo', 'Memo Released', `Memo ${m.no} was released.`);
    saveDB();
  },
  acknowledge(m) {
    m.acks[DB.currentUserId] = iso(NOW());
    m.history.push({ date: iso(NOW()), userId: DB.currentUserId, action: 'Acknowledged', comment: '' });
    audit('Memo', 'Memo Acknowledged', `${me().name} acknowledged ${m.no}.`);
    saveDB();
  },
  setStatus(m, status, comment) {
    const now = iso(NOW()); m.status = status; if (status === 'Archived') m.archivedAt = now;
    m.history.push({ date: now, userId: DB.currentUserId, action: status === 'Active' ? 'Restored' : status, comment: comment || '' });
    audit('Memo', 'Status Changed', `${m.no} set to ${status}.`);
    saveDB();
  },
  revise(m) {
    // create new draft version that supersedes the original on release
    const now = iso(NOW()); const [maj] = (m.version || '1.0').split('.');
    const copy = JSON.parse(JSON.stringify(m));
    Object.assign(copy, { id: uid('m'), no: nextMemoNo(m.deptId), status: 'Draft', version: (+maj + 1) + '.0', approvals: [], currentLevel: 0, acks: {}, releasedAt: null, releasedBy: null, createdBy: DB.currentUserId, createdAt: now, updatedAt: now, supersedes: m.id, reference: m.no, history: [{ date: now, userId: DB.currentUserId, action: 'Created', comment: 'Revision of ' + m.no }], comments: [], views: 0 });
    copy.versions = m.versions || [];
    DB.memos.unshift(copy); audit('Memo', 'Revision Created', `Revision of ${m.no} created as ${copy.no}.`); saveDB();
    return copy;
  },
  remove(m) { DB.memos = DB.memos.filter(x => x.id !== m.id); audit('Memo', 'Draft Deleted', `Draft ${m.no} – ${m.subject} deleted.`); saveDB(); },
};

// ---------- tasks ----------
function tasksFor(userId) {
  const out = [];
  DB.memos.forEach(m => {
    if (m.status === 'Pending Approval') {
      const a = m.approvals[m.currentLevel];
      if (a && a.userId === userId) out.push({ id: 'ap-' + m.id, kind: 'APPROVAL', title: 'Approve Memo', desc: 'Review and approve the memo for release.', memo: m, from: m.createdBy, due: a.due, priority: m.priority === 'Normal' ? 'Medium' : m.priority === 'Urgent' ? 'High' : m.priority, status: 'To Do', link: '#/approval/' + m.id, action: 'Approve' });
    }
    if (m.status === 'Approved' && m.createdBy === userId) out.push({ id: 'rl-' + m.id, kind: 'RELEASE', title: 'Release Memo', desc: 'Release the memo after approval.', memo: m, from: m.approvals.at(-1)?.userId, due: iso(new Date(m.approvedAt || m.updatedAt).getTime() + 2 * DAY), priority: 'Medium', status: 'To Do', link: '#/release/' + m.id, action: 'Release' });
    if ((m.status === 'Draft' || m.status === 'Returned') && m.createdBy === userId) out.push({ id: 'dr-' + m.id, kind: m.status === 'Returned' ? 'REVISION' : 'EDIT DRAFT', title: m.status === 'Returned' ? 'Revise Memo' : 'Edit Draft', desc: m.status === 'Returned' ? 'Memo was returned for revision.' : 'Continue editing the memo draft.', memo: m, from: m.status === 'Returned' ? m.approvals[m.currentLevel]?.userId : userId, due: iso(new Date(m.updatedAt).getTime() + 5 * DAY), priority: m.status === 'Returned' ? 'High' : 'Low', status: m.status === 'Returned' ? 'To Do' : 'In Progress', link: '#/edit/' + m.id, action: 'Edit' });
    if (m.status === 'Active' && m.requireAck && !m.acks[userId] && recipientsOf(m).includes(userId) && new Date(m.releasedAt) <= NOW()) out.push({ id: 'ak-' + m.id, kind: 'ACKNOWLEDGE', title: 'Acknowledge Memo', desc: 'Kindly acknowledge receipt of the memo.', memo: m, from: m.releasedBy, due: iso(ackDueDate(m)), priority: 'Low', status: 'To Do', link: '#/memo/' + m.id, action: 'Acknowledge' });
  });
  out.forEach(t => { if (t.due && new Date(t.due) < NOW()) t.status = 'Overdue'; });
  return out.sort((a, b) => (a.due || '').localeCompare(b.due || ''));
}
function completedTasksThisMonth(userId) {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  let n = 0; DB.memos.forEach(m => m.history.forEach(h => { if (h.userId === userId && new Date(h.date) >= start && ['Approved', 'Released', 'Acknowledged', 'Submitted for Approval', 'Returned for Revision', 'Rejected'].includes(h.action)) n++; }));
  return n;
}
