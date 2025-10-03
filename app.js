/* تطبيق منظم اليوم - مكتوب بVanilla JS
 - حفظ في localStorage
 - إنشاء / تسجيل حساب (محلي) وتخزين بيانات المستخدم كـ JSON قابلة للتصدير
 - إشعارات: Notification API + fallback داخل التطبيق
 - تبويب مستقل للغد وتنشيطه
*/
const $ = q=>document.querySelector(q);
const $$ = q=>document.querySelectorAll(q);

let currentUser = null;
let DB = { users: {} }; // loaded from bundled users.json or localStorage

// Helpers
function uid(len=8){return Math.random().toString(36).slice(2,2+len)}
function nowISO(){return new Date().toISOString()}

// Init
async function init(){
  // load bundled users file if present
  try{
    const resp = await fetch('data/users.json');
    if(resp.ok){
      const bundled = await resp.json();
      DB = bundled;
      // merge with localStorage store if exists
      const ls = localStorage.getItem('dm_db');
      if(ls){ const par = JSON.parse(ls); DB = {...DB,...par}; }
    } else loadFromLS();
  } catch(e){ loadFromLS(); }

  bindUI();
  renderWelcome();
}

function loadFromLS(){ const ls = localStorage.getItem('dm_db'); if(ls){DB = JSON.parse(ls);} }

function saveToLS(){ localStorage.setItem('dm_db', JSON.stringify(DB)); }

// UI bindings
function bindUI(){
  $('#open-signup').addEventListener('click', openAuth);
  $('#auth-toggle').addEventListener('click', toggleAuthMode);
  $('#auth-submit').addEventListener('click', handleAuth);
  $('#auth-modal').addEventListener('click', e=>{ if(e.target.id==='auth-modal') closeAuth() });
  $('#create-sample-user').addEventListener('click', createSampleUser);
  $('#add-task').addEventListener('click', ()=>openTaskDialog('today'));
  $('#add-task-tomorrow').addEventListener('click', ()=>openTaskDialog('tomorrow'));
  $('#cancel-task').addEventListener('click', closeTaskDialog);
  $('#save-task').addEventListener('click', saveTaskFromDialog);
  $$('#tab-content .tabview'); // ensure exists
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{ document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); switchTab(t.dataset.tab);});
  });
  $('#request-notif').addEventListener('click', requestNotif);
  $('#export-json').addEventListener('click', exportCurrentUserJSON);
  $('#download-all').addEventListener('click', downloadAllDataZip);
  $('#auth-modal').classList.add('hidden');
  $('#file-input').addEventListener('change', handleImportFile);
  $('#import-json').addEventListener('click', ()=>$('#file-input').click());
  $('#activate-tomorrow').addEventListener('click', activateTomorrow);
  $('#logout').addEventListener('click', ()=>{ currentUser=null; renderWelcome(); });
  $('#delete-account').addEventListener('click', deleteDemoAccount);
  $('#create-sample-user').addEventListener('animationend', ()=>{});
  // load audio
  window.ding = $('#ding-sound');
}

function renderWelcome(){
  if(!currentUser){ $('#welcome').classList.remove('hidden'); $('#app').classList.add('hidden'); $('#auth-msg').textContent=''; } 
  else { $('#welcome').classList.add('hidden'); $('#app').classList.remove('hidden'); renderApp(); }
}

// Auth
let authMode = 'signup';
function openAuth(){ $('#auth-modal').classList.remove('hidden'); $('#auth-title').textContent = authMode==='signup'?'تسجيل حساب جديد':'تسجيل الدخول'; }
function closeAuth(){ $('#auth-modal').classList.add('hidden'); }
function toggleAuthMode(){
  authMode = authMode==='signup'?'login':'signup';
  $('#auth-title').textContent = authMode==='signup'?'تسجيل حساب جديد':'تسجيل الدخول';
  $('#auth-submit').textContent = authMode==='signup'?'إنشاء حساب':'تسجيل دخول';
}
function handleAuth(){
  const username = $('#auth-username').value.trim();
  const password = $('#auth-password').value;
  const display = $('#auth-display').value || username;
  if(!username || !password){ $('#auth-msg').textContent='الرجاء إدخال بيانات صحيحة'; return; }
  if(authMode==='signup'){
    if(DB.users[username]){ $('#auth-msg').textContent='المستخدم موجود بالفعل — جرّب تسجيل الدخول'; return; }
    // create user object and per-user JSON structure
    const user = { id: 'u_'+uid(6), username, display, created: nowISO(), tasks: [], tomorrow: [] , settings:{notif:true} };
    DB.users[username]=user;
    saveToLS();
    currentUser = username;
    closeAuth();
    renderWelcome();
    scheduleAllTasks();
  } else {
    const user = DB.users[username];
    if(!user){ $('#auth-msg').textContent='المستخدم غير موجود'; return; }
    // naive password check skipped (demo). In real app: never store plaintext passwords.
    currentUser = username; closeAuth(); renderWelcome(); scheduleAllTasks();
  }
}

// Sample user creation
function createSampleUser(){
  const sample = {
    id: 'u_demo1', username:'demo@daily', display:'تجريبي', created:nowISO(),
    tasks:[
      {id:'t1',title:'اجتماع الفريق',date: new Date().toISOString().slice(0,10), time:'10:00',duration:45,notes:'اجتماع متابعة',done:false,notify:true},
      {id:'t2',title:'مراجعة الكود',date:new Date().toISOString().slice(0,10), time:'14:30',duration:90,notes:'مهمة مهمة',done:false,notify:true}
    ],
    tomorrow:[
      {id:'tm1',title:'تحضير المحاضرة',date: new Date(Date.now()+24*3600e3).toISOString().slice(0,10), time:'09:00',duration:60,notes:'جهز الشيت',notify:false}
    ],
    settings:{notif:true}
  };
  DB.users[sample.username]=sample;
  saveToLS();
  currentUser = sample.username;
  renderWelcome();
  alert('تم إنشاء حساب تجريبي ومباشر — تحقق من لوحة اليوم');
}

// Rendering app content
function renderApp(){
  const u = DB.users[currentUser];
  if(!u){ alert('خطأ: المستخدم غير موجود'); currentUser=null; renderWelcome(); return; }
  $('#acc-info').innerHTML = `<strong>${u.display}</strong><div class="muted">${u.username}</div>`;
  renderTasks();
}

function renderTasks(){
  const u = DB.users[currentUser];
  const list = $('#task-list'); list.innerHTML='';
  u.tasks.forEach(t=>{
    const el = document.createElement('div'); el.className='task';
    el.innerHTML = `<div>
      <div style="font-weight:700">${t.title}</div>
      <div class="meta">${t.date} • ${t.time} • ${t.duration} دقيقة</div>
    </div>
    <div>
      <button class="btn small" data-id="${t.id}" onclick="editTask('${t.id}')">تعديل</button>
      <button class="btn outline small" onclick="toggleDone('${t.id}')">${t.done?'إلغاء':'تم'}</button>
      <button class="btn danger small" onclick="deleteTask('${t.id}')">حذف</button>
    </div>`;
    list.appendChild(el);
  });

  // tomorrow
  const lt = $('#task-list-tomorrow'); lt.innerHTML='';
  u.tomorrow.forEach(t=>{
    const el = document.createElement('div'); el.className='task';
    el.innerHTML = `<div><div style="font-weight:700">${t.title}</div><div class="meta">${t.date} • ${t.time}</div></div>
    <div><button class="btn small" onclick="editTaskTomorrow('${t.id}')">تعديل</button>
    <button class="btn danger small" onclick="deleteTaskTomorrow('${t.id}')">حذف</button></div>`;
    lt.appendChild(el);
  });
}

// Task dialog
let currentDialogMode = { area:'today', editId:null };
function openTaskDialog(area, editId=null){
  currentDialogMode = {area, editId};
  $('#task-dialog').classList.remove('hidden');
  $('#task-dialog-title').textContent = editId? 'تعديل مهمة':'مهمة جديدة';
  if(editId){
    let t = findTaskById(editId);
    if(t){ $('#task-title').value=t.title; $('#task-date').value=t.date; $('#task-time').value=t.time; $('#task-duration').value=t.duration; $('#task-notes').value=t.notes||''; }
  } else {
    $('#task-title').value=''; $('#task-date').value=new Date().toISOString().slice(0,10); $('#task-time').value='09:00'; $('#task-duration').value=30; $('#task-notes').value='';
  }
}
function closeTaskDialog(){ $('#task-dialog').classList.add('hidden'); currentDialogMode.editId=null }
function saveTaskFromDialog(){
  const title = $('#task-title').value.trim(); if(!title){ alert('الرجاء إدخال عنوان'); return; }
  const date = $('#task-date').value; const time = $('#task-time').value; const duration = Number($('#task-duration').value);
  const notes = $('#task-notes').value;
  const user = DB.users[currentUser];
  if(currentDialogMode.editId){
    let t = findTaskById(currentDialogMode.editId);
    Object.assign(t,{title,date,time,duration,notes});
  } else {
    const t = { id:'t_'+uid(6), title, date, time, duration, notes, done:false, notify:true };
    if(currentDialogMode.area==='today') user.tasks.push(t); else user.tomorrow.push(t);
  }
  saveToLS(); renderTasks(); scheduleTaskNotifications();
  closeTaskDialog();
}

// find task helper
function findTaskById(id){
  const u = DB.users[currentUser];
  return (u.tasks.concat(u.tomorrow)).find(x=>x.id===id);
}

// edit/delete
window.editTask = function(id){ openTaskDialog('today', id) }
window.editTaskTomorrow = function(id){ openTaskDialog('tomorrow', id) }
window.deleteTask = function(id){ if(!confirm('حذف المهمة؟')) return; const u=DB.users[currentUser]; u.tasks = u.tasks.filter(x=>x.id!==id); saveToLS(); renderTasks();}
window.deleteTaskTomorrow = function(id){ if(!confirm('حذف مهمة الغد؟')) return; const u=DB.users[currentUser]; u.tomorrow = u.tomorrow.filter(x=>x.id!==id); saveToLS(); renderTasks();}
window.toggleDone = function(id){ const t=findTaskById(id); t.done=!t.done; saveToLS(); renderTasks(); }

// Tabs
function switchTab(t){
  $$('.tabview').forEach(v=>v.classList.add('hidden'));
  if(t==='today') $('#today-view').classList.remove('hidden');
  if(t==='tomorrow') $('#tomorrow-view').classList.remove('hidden');
  if(t==='settings') $('#settings-view').classList.remove('hidden');
}

// Notifications
async function requestNotif(){
  if(!('Notification' in window)){ alert('المتصفح لا يدعم إشعارات النظام، سيتم استخدام إشعارات داخلية'); return; }
  const perm = await Notification.requestPermission();
  alert('أذونات الإشعارات: '+perm);
}

function scheduleAllTasks(){
  // clear existing timers
  if(window._schedTimers){ window._schedTimers.forEach(t=>clearTimeout(t)); }
  window._schedTimers = [];
  scheduleTaskNotifications();
}

function scheduleTaskNotifications(){
  const u = DB.users[currentUser];
  if(!u) return;
  const all = u.tasks.filter(t=>t.notify && !t.done);
  all.forEach(task=>{
    const dt = new Date(task.date+'T'+(task.time||'00:00'));
    const diff = dt - Date.now();
    if(diff>0 && diff < 1000*60*60*24*7){ // schedule up to a week ahead
      const to = setTimeout(()=>sendNotification(task), diff);
      window._schedTimers.push(to);
    }
  });
}

function sendNotification(task){
  // prefer Notification API
  if(window.Notification && Notification.permission==='granted'){
    const n = new Notification(task.title, { body: task.notes || (task.duration?('مدة: '+task.duration+' دقيقة'):''), tag: task.id });
    n.onclick = ()=>{ window.focus(); /* highlight task */ }
  } else {
    // fallback: in-app toast
    inAppNotice(task.title, task.notes);
  }
  if(window.ding) try{ window.ding.play() }catch(e){}
}

function inAppNotice(title, body=''){
  const el = document.createElement('div'); el.className='task'; el.style.position='fixed'; el.style.right='14px'; el.style.bottom='14px'; el.style.zIndex=9999;
  el.innerHTML = `<div><strong>${title}</strong><div class="meta">${body}</div></div><div><button class="btn small" onclick="this.parentElement.parentElement.remove()">اغلاق</button></div>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 8000);
}

// Export / import
function exportCurrentUserJSON(){
  const u = DB.users[currentUser];
  const blob = new Blob([JSON.stringify(u,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `${u.username.replace(/[@.]/g,'_')}_data.json`; a.click();
  URL.revokeObjectURL(url);
}

async function downloadAllDataZip(){
  // gather DB and prompt user to download as JSON (zip creation client-side possible with JS libs; here we simply export DB as JSON)
  const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `daily_master_all_data.json`; a.click();
  URL.revokeObjectURL(url);
}

function handleImportFile(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const data = JSON.parse(evt.target.result);
      // merge or replace
      if(data.users) DB = {...DB, ...data};
      else if(data.username) DB.users[data.username]=data;
      saveToLS(); alert('تم استيراد الملف'); renderWelcome();
    } catch(err){ alert('فشل قراءة الملف: '+err.message) }
  };
  reader.readAsText(f);
}

// Tomorrow activation
function activateTomorrow(){
  const u = DB.users[currentUser];
  if(!u) return;
  if(!confirm('سيتم نقل مهام الغد إلى مهام اليوم الآن. أكّد؟')) return;
  // move tomorrow tasks to today (date becomes today)
  const today = new Date().toISOString().slice(0,10);
  u.tomorrow.forEach(t=>{
    const nt = {...t, id:'t_'+uid(5), date:today};
    u.tasks.push(nt);
  });
  u.tomorrow = [];
  saveToLS(); renderTasks(); scheduleTaskNotifications();
  alert('تم تفعيل مهام الغد');
}

// delete sample
function deleteDemoAccount(){
  if(!confirm('حذف الحساب الحالي من التخزين المحلي؟')) return;
  delete DB.users[currentUser];
  saveToLS(); currentUser=null; renderWelcome();
}

// small helpers for edit from buttons
window.findTaskById = findTaskById;

// Start
init();
