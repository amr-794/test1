<script>
// عنصر النموذج
const taskForm = document.getElementById("taskForm");
const tasksList = document.getElementById("tasksList");

// دالة لحفظ المهمة
function saveTask(e) {
    e.preventDefault(); // منع تحديث الصفحة

    const title = document.getElementById("taskTitle").value.trim();
    const date = document.getElementById("taskDate").value;
    const time = document.getElementById("taskTime").value;
    const duration = document.getElementById("taskDuration").value;
    const note = document.getElementById("taskNote").value.trim();

    if (!title || !date || !time) {
        alert("من فضلك أدخل البيانات كاملة");
        return;
    }

    const newTask = {
        id: Date.now(),
        title,
        date,
        time,
        duration,
        note
    };

    // جلب المهام القديمة
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push(newTask);

    // حفظ في LocalStorage
    localStorage.setItem("tasks", JSON.stringify(tasks));

    // إعادة عرض المهام
    renderTasks();

    // إعادة تعيين النموذج
    taskForm.reset();

    alert("✅ تم حفظ المهمة بنجاح!");
}

// دالة عرض المهام
function renderTasks() {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasksList.innerHTML = "";
    tasks.forEach(task => {
        const li = document.createElement("li");
        li.textContent = `${task.title} - ${task.date} ${task.time} (${task.duration} دقيقة)`;
        tasksList.appendChild(li);
    });
}

// ربط الفورم مع الدالة
if (taskForm) {
    taskForm.addEventListener("submit", saveTask);
}

// عرض المهام عند التحميل
renderTasks();
</script>
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
