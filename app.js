/* app.js — منظم اليوم (معدل: تسجيل/دخول ظاهر عند الدخول، إلغاء لا يغلق نافذة المهمة، وحفظ مهمات مضبوط)
   ملاحظات:
   - يتم حفظ كل البيانات محلياً في localStorage تحت dm_db
   - عند الدخول لأول مرة سيظهر مودال التسجيل/تسجيل الدخول
   - كلمات المرور تُخزن كـ SHA-256 إذا كانت API متاحة، وإلا ترجع لسلسلة PLAIN:
*/

'use strict';

const STORAGE_KEYS = { db: 'dm_db', current: 'dm_currentUser' };
let DB = { users: {} };
let currentUser = null;

// مساعدة
const $ = q => document.querySelector(q);
const $$ = q => Array.from(document.querySelectorAll(q));
function uid(len = 8) { return Math.random().toString(36).slice(2, 2 + len); }
function nowISO() { return new Date().toISOString(); }

// تحويل ArrayBuffer to hex
function buf2hex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.prototype.map.call(bytes, x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Hash password using SubtleCrypto if موجود، وإلا fallback
async function hashPassword(pwd) {
  if (!pwd) return '';
  try {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(pwd));
      return 'sha256$' + buf2hex(buf);
    }
  } catch (e) {
    console.warn('crypto.subtle not available, fallback to plain storage');
  }
  return 'plain$' + pwd;
}

// تحميل DB من ملف data/users.json (إن أمكن) أو من localStorage
async function loadDB() {
  // محاولة تحميل ملف مُضمّن (لن يعمل على file:// في بعض المتصفحات — لذلك catch)
  try {
    const resp = await fetch('data/users.json');
    if (resp.ok) {
      const bundled = await resp.json();
      if (bundled && bundled.users) {
        DB = bundled;
      }
    }
  } catch (e) {
    // ignore — سيتم تحميل من localStorage
  }
  // دمج مع localStorage إن وجد
  const ls = localStorage.getItem(STORAGE_KEYS.db);
  if (ls) {
    try {
      const parsed = JSON.parse(ls);
      DB = { ...DB, ...parsed };
      if (!DB.users) DB.users = parsed.users || {};
    } catch (e) {
      console.warn('failed parse local DB', e);
    }
  }
}

function saveToLS() {
  localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(DB));
}

function setCurrentUser(username) {
  currentUser = username;
  if (username) localStorage.setItem(STORAGE_KEYS.current, username);
  else localStorage.removeItem(STORAGE_KEYS.current);
  renderWelcome();
}

// INIT
async function init() {
  await loadDB();
  bindUI();

  const stored = localStorage.getItem(STORAGE_KEYS.current);
  if (stored && DB.users && DB.users[stored]) {
    currentUser = stored;
  } else {
    currentUser = null;
  }

  // إذا لا يوجد مستخدم حالياً، أظهر مودال التسجيل فوراً
  renderWelcome();
  if (!currentUser) {
    openAuth('signup'); // يفتح عند الدخول
  } else {
    scheduleAllTasks();
  }
}

// UI bindings
function bindUI() {
  $('#open-signup').addEventListener('click', () => openAuth('signup'));
  $('#auth-toggle').addEventListener('click', toggleAuthMode);
  $('#auth-submit').addEventListener('click', handleAuth);
  $('#auth-close').addEventListener('click', () => closeAuth(false)); // اغلاق مودال auth
  $('#create-sample-user').addEventListener('click', createSampleUser);
  $('#add-task').addEventListener('click', () => openTaskDialog('today'));
  $('#add-task-tomorrow').addEventListener('click', () => openTaskDialog('tomorrow'));
  $('#task-close').addEventListener('click', () => closeTaskDialog(true));
  $('#cancel-task').addEventListener('click', cancelTaskDialog); // الآن لا يغلق النافذة
  $('#save-task').addEventListener('click', saveTaskFromDialog);
  $$('.tab').forEach(t => {
    t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      switchTab(t.dataset.tab);
    });
  });

  $('#request-notif').addEventListener('click', requestNotif);
  $('#export-json').addEventListener('click', exportCurrentUserJSON);
  $('#download-all').addEventListener('click', downloadAllDataJSON);
  $('#file-input').addEventListener('change', handleImportFile);
  $('#import-json').addEventListener('click', () => $('#file-input').click());
  $('#activate-tomorrow').addEventListener('click', activateTomorrow);
  $('#logout').addEventListener('click', () => { setCurrentUser(null); openAuth('login'); });
  $('#delete-account').addEventListener('click', deleteDemoAccount);
}

// عرض الترحيب/التطبيق
function renderWelcome() {
  if (!currentUser) {
    $('#welcome').classList.remove('hidden');
    $('#app').classList.add('hidden');
  } else {
    $('#welcome').classList.add('hidden');
    $('#app').classList.remove('hidden');
    renderApp();
  }
}

// AUTH logic
let authMode = 'signup'; // or 'login'
function openAuth(mode = 'signup') {
  authMode = mode;
  $('#auth-title').textContent = mode === 'signup' ? 'تسجيل حساب جديد' : 'تسجيل الدخول';
  $('#auth-submit').textContent = mode === 'signup' ? 'إنشاء حساب' : 'تسجيل دخول';
  $('#auth-msg').textContent = '';
  $('#auth-modal').classList.remove('hidden');
  $('#auth-modal').setAttribute('aria-hidden', 'false');
}

function closeAuth(hide = true) {
  if (hide) {
    $('#auth-modal').classList.add('hidden');
    $('#auth-modal').setAttribute('aria-hidden', 'true');
  } else {
    $('#auth-modal').classList.add('hidden');
    $('#auth-modal').setAttribute('aria-hidden', 'true');
  }
}

function toggleAuthMode() {
  authMode = authMode === 'signup' ? 'login' : 'signup';
  openAuth(authMode);
}

async function handleAuth() {
  const username = $('#auth-username').value.trim();
  const password = $('#auth-password').value || '';
  const display = $('#auth-display').value.trim() || username;

  if (!username || !password) {
    $('#auth-msg').textContent = 'الرجاء إدخال اسم مستخدم وكلمة مرور.';
    return;
  }

  if (authMode === 'signup') {
    if (DB.users[username]) {
      $('#auth-msg').textContent = 'المستخدم موجود بالفعل — جرّب تسجيل الدخول';
      return;
    }
    const hashed = await hashPassword(password);
    const user = {
      id: 'u_' + uid(6),
      username,
      display,
      created: nowISO(),
      hashedPassword: hashed,
      tasks: [],
      tomorrow: [],
      settings: { notif: true }
    };
    DB.users[username] = user;
    saveToLS();
    setCurrentUser(username);
    closeAuth();
    scheduleAllTasks();
    inAppNotice('تم إنشاء الحساب بنجاح — مرحباً بك ' + (display || username));
  } else {
    const user = DB.users[username];
    if (!user) {
      $('#auth-msg').textContent = 'المستخدم غير موجود';
      return;
    }
    const hashed = await hashPassword(password);
    // تحقق: إذا تم تخزين hashedPassword كـ sha256$... أو plain$...
    if (user.hashedPassword && user.hashedPassword === hashed) {
      setCurrentUser(username);
      closeAuth();
      scheduleAllTasks();
      inAppNotice('تم تسجيل الدخول بنجاح — أهلاً ' + (user.display || username));
    } else {
      $('#auth-msg').textContent = 'كلمة المرور غير صحيحة';
    }
  }
}

// sample user
async function createSampleUser() {
  const username = 'demo@daily';
  if (DB.users[username]) {
    setCurrentUser(username);
    renderWelcome();
    scheduleAllTasks();
    return;
  }
  const hashed = await hashPassword('demo'); // كلمة المرور التجريبية: demo
  const sample = {
    id: 'u_demo1',
    username,
    display: 'تجريبي',
    created: nowISO(),
    hashedPassword: hashed,
    tasks: [
      { id: 't1', title: 'اجتماع الفريق', date: new Date().toISOString().slice(0, 10), time: '10:00', duration: 45, notes: 'اجتماع متابعة', done: false, notify: true },
      { id: 't2', title: 'مراجعة الكود', date: new Date().toISOString().slice(0, 10), time: '14:30', duration: 90, notes: 'مهمة مهمة', done: false, notify: true }
    ],
    tomorrow: [
      { id: 'tm1', title: 'تحضير المحاضرة', date: new Date(Date.now() + 24 * 3600e3).toISOString().slice(0, 10), time: '09:00', duration: 60, notes: 'جهز الشيت', notify: false }
    ],
    settings: { notif: true }
  };
  DB.users[username] = sample;
  saveToLS();
  setCurrentUser(username);
  renderWelcome();
  scheduleAllTasks();
  inAppNotice('تم إنشاء حساب تجريبي (demo / demo) — يمكنك تعديله أو حذفه لاحقاً');
}

// App rendering
function renderApp() {
  const u = DB.users[currentUser];
  if (!u) {
    alert('خطأ: المستخدم غير موجود');
    setCurrentUser(null);
    openAuth('signup');
    return;
  }
  $('#acc-info').innerHTML = `<strong>${escapeHtml(u.display||u.username)}</strong><div class="muted">${escapeHtml(u.username)}</div>`;
  renderTasks();
}

// Escape HTML (حماية بسيطة)
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));
}

// Tasks rendering
function renderTasks() {
  const u = DB.users[currentUser];
  const list = $('#task-list'); list.innerHTML = '';
  if (!u) return;
  u.tasks.forEach(t => {
    const el = document.createElement('div'); el.className = 'task';
    el.innerHTML = `<div>
      <div style="font-weight:700">${escapeHtml(t.title)}</div>
      <div class="meta">${escapeHtml(t.date)} • ${escapeHtml(t.time||'')} • ${t.duration||0} دقيقة</div>
    </div>
    <div>
      <button class="btn small" data-edit="${t.id}">تعديل</button>
      <button class="btn outline small" data-toggle="${t.id}">${t.done ? 'إلغاء' : 'تم'}</button>
      <button class="btn danger small" data-delete="${t.id}">حذف</button>
    </div>`;
    list.appendChild(el);

    // ربط أزرار كل مهمة
    el.querySelector('[data-edit]').addEventListener('click', () => openTaskDialog('today', t.id));
    el.querySelector('[data-toggle]').addEventListener('click', () => { toggleDone(t.id); });
    el.querySelector('[data-delete]').addEventListener('click', () => { if (confirm('حذف المهمة؟')) deleteTask(t.id); });
  });

  // tomorrow
  const lt = $('#task-list-tomorrow'); lt.innerHTML = '';
  u.tomorrow.forEach(t => {
    const el = document.createElement('div'); el.className = 'task';
    el.innerHTML = `<div><div style="font-weight:700">${escapeHtml(t.title)}</div><div class="meta">${escapeHtml(t.date)} • ${escapeHtml(t.time||'')}</div></div>
    <div><button class="btn small" data-edit="${t.id}">تعديل</button>
    <button class="btn danger small" data-delete="${t.id}">حذف</button></div>`;
    lt.appendChild(el);
    el.querySelector('[data-edit]').addEventListener('click', () => openTaskDialog('tomorrow', t.id));
    el.querySelector('[data-delete]').addEventListener('click', () => { if (confirm('حذف مهمة الغد؟')) deleteTaskTomorrow(t.id); });
  });
}

// فتح نافذة المهمة (new / edit)
let currentDialogMode = { area: 'today', editId: null };
function openTaskDialog(area, editId = null) {
  if (!currentUser) { inAppNotice('يجب تسجيل الدخول أولاً'); openAuth('login'); return; }
  currentDialogMode = { area, editId };
  $('#task-dialog-title').textContent = editId ? 'تعديل مهمة' : 'مهمة جديدة';
  // تعبئة الحقول لو كانت تعديل
  if (editId) {
    const t = findTaskById(editId);
    if (t) {
      $('#task-title').value = t.title || '';
      $('#task-date').value = t.date || new Date().toISOString().slice(0, 10);
      $('#task-time').value = t.time || '09:00';
      $('#task-duration').value = t.duration || 30;
      $('#task-notes').value = t.notes || '';
    }
  } else {
    $('#task-title').value = '';
    $('#task-date').value = new Date().toISOString().slice(0, 10);
    $('#task-time').value = '09:00';
    $('#task-duration').value = 30;
    $('#task-notes').value = '';
  }
  $('#task-dialog').classList.remove('hidden');
  $('#task-dialog').setAttribute('aria-hidden', 'false');
}

// إغلاق نافذة المهمة
function closeTaskDialog(force = false) {
  // force = true يسمح بالإغلاق (مثلاً عبر زر إغلاق)
  $('#task-dialog').classList.add('hidden');
  $('#task-dialog').setAttribute('aria-hidden', 'true');
  currentDialogMode.editId = null;
}

// "إلغاء" الآن يمسح الحقول لكنه لا يغلق النافذة
function cancelTaskDialog() {
  $('#task-title').value = '';
  $('#task-date').value = new Date().toISOString().slice(0, 10);
  $('#task-time').value = '09:00';
  $('#task-duration').value = 30;
  $('#task-notes').value = '';
  inAppNotice('تم مسح الحقول — يمكنك الاستمرار أو الضغط على ✖ لإغلاق النافذة');
}

// حفظ المهمة من النافذة
function saveTaskFromDialog() {
  const title = $('#task-title').value.trim();
  const date = $('#task-date').value;
  const time = $('#task-time').value;
  const duration = Number($('#task-duration').value) || 0;
  const notes = $('#task-notes').value.trim();

  if (!title || !date) {
    alert('الرجاء إدخال العنوان والتاريخ');
    return;
  }
  const u = DB.users[currentUser];
  if (!u) { alert('خطأ: المستخدم غير موجود'); return; }

  if (currentDialogMode.editId) {
    const t = findTaskById(currentDialogMode.editId);
    if (t) {
      Object.assign(t, { title, date, time, duration, notes });
    }
  } else {
    const t = { id: 't_' + uid(6), title, date, time, duration, notes, done: false, notify: true };
    if (currentDialogMode.area === 'today') u.tasks.push(t); else u.tomorrow.push(t);
  }
  saveToLS();
  renderTasks();
  scheduleTaskNotifications();
  closeTaskDialog();
  inAppNotice('تم حفظ المهمة');
}

// helpers
function findTaskById(id) {
  const u = DB.users[currentUser];
  if (!u) return null;
  return [...u.tasks, ...u.tomorrow].find(x => x.id === id);
}
function deleteTask(id) {
  const u = DB.users[currentUser];
  u.tasks = u.tasks.filter(x => x.id !== id);
  saveToLS(); renderTasks();
}
function deleteTaskTomorrow(id) {
  const u = DB.users[currentUser];
  u.tomorrow = u.tomorrow.filter(x => x.id !== id);
  saveToLS(); renderTasks();
}
function toggleDone(id) {
  const t = findTaskById(id);
  if (t) t.done = !t.done;
  saveToLS(); renderTasks();
}

// Tabs
function switchTab(t) {
  $$('.tabview').forEach(v => v.classList.add('hidden'));
  if (t === 'today') $('#today-view').classList.remove('hidden');
  if (t === 'tomorrow') $('#tomorrow-view').classList.remove('hidden');
  if (t === 'settings') $('#settings-view').classList.remove('hidden');
}

// Notifications (بسيط)
async function requestNotif() {
  if (!('Notification' in window)) { alert('المتصفح لا يدعم إشعارات النظام، سيتم استخدام إشعارات داخلية'); return; }
  const perm = await Notification.requestPermission();
  alert('أذونات الإشعارات: ' + perm);
}

function scheduleAllTasks() {
  if (window._schedTimers) window._schedTimers.forEach(t => clearTimeout(t));
  window._schedTimers = [];
  scheduleTaskNotifications();
}

function scheduleTaskNotifications() {
  const u = DB.users[currentUser];
  if (!u) return;
  const all = u.tasks.filter(t => t.notify && !t.done);
  all.forEach(task => {
    const dt = new Date(task.date + 'T' + (task.time || '00:00'));
    const diff = dt - Date.now();
    if (diff > 0 && diff < 1000 * 60 * 60 * 24 * 7) {
      const to = setTimeout(() => sendNotification(task), diff);
      window._schedTimers.push(to);
    }
  });
}

function sendNotification(task) {
  if (window.Notification && Notification.permission === 'granted') {
    const n = new Notification(task.title, { body: task.notes || (task.duration ? ('مدة: ' + task.duration + ' دقيقة') : ''), tag: task.id });
    n.onclick = () => { window.focus(); };
  } else {
    inAppNotice(task.title, task.notes);
  }
  const ding = $('#ding-sound');
  if (ding) try { ding.play(); } catch (e) { /* ignore */ }
}

// Export / import
function exportCurrentUserJSON() {
  const u = DB.users[currentUser];
  if (!u) return alert('لا يوجد مستخدم لتصدير بياناته');
  const blob = new Blob([JSON.stringify(u, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${u.username.replace(/[@.]/g, '_')}_data.json`; a.click();
  URL.revokeObjectURL(url);
}

function downloadAllDataJSON() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `daily_master_all_data.json`; a.click();
  URL.revokeObjectURL(url);
}

function handleImportFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.users) {
        DB = { ...DB, ...data };
      } else if (data.username) {
        DB.users[data.username] = data;
      } else {
        // دمج عام
        DB = { ...DB, ...data };
      }
      saveToLS(); inAppNotice('تم استيراد الملف'); renderWelcome();
    } catch (err) {
      alert('فشل قراءة الملف: ' + err.message);
    }
  };
  reader.readAsText(f);
}

// Activate tomorrow
function activateTomorrow() {
  const u = DB.users[currentUser];
  if (!u) return;
  if (!confirm('سيتم نقل مهام الغد إلى مهام اليوم الآن. أكّد؟')) return;
  const today = new Date().toISOString().slice(0, 10);
  u.tomorrow.forEach(t => {
    const nt = { ...t, id: 't_' + uid(5), date: today };
    u.tasks.push(nt);
  });
  u.tomorrow = [];
  saveToLS(); renderTasks(); scheduleTaskNotifications();
  inAppNotice('تم تفعيل مهام الغد');
}

// delete account (محلي)
function deleteDemoAccount() {
  if (!currentUser) return;
  if (!confirm('حذف الحساب الحالي من التخزين المحلي؟')) return;
  delete DB.users[currentUser];
  saveToLS(); setCurrentUser(null); openAuth('signup');
}

// in-app notice
function inAppNotice(title, body = '') {
  const el = document.createElement('div'); el.className = 'task'; el.style.position = 'fixed'; el.style.left = '14px'; el.style.bottom = '14px'; el.style.zIndex = 9999; el.style.maxWidth = '90%';
  el.innerHTML = `<div><strong>${escapeHtml(title)}</strong><div class="meta">${escapeHtml(body)}</div></div><div><button class="btn small" onclick="this.parentElement.parentElement.remove()">اغلاق</button></div>`;
  document.body.appendChild(el);
  setTimeout(() => { try { el.remove(); } catch (e) { } }, 7000);
}

// بداية التشغيل
init();
