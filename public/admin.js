
import { useEffect, useState } from 'react';
export default function Admin(){
  const [logged, setLogged] = useState(false);
  const [password, setPassword] = useState('');
  const [tracks, setTracks] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  useEffect(()=>{ fetch('/api/me').then(r=>r.json()).then(d=>setLogged(d.ok)) }, []);
  useEffect(()=>{ if(logged) fetch('/api/tracks').then(r=>r.json()).then(setTracks) }, [logged]);

  async function doLogin(e){
    e.preventDefault();
    const res = await fetch('/api/admin/login', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({password})});
    const j = await res.json();
    if(j.ok) { setLogged(true); fetch('/api/tracks').then(r=>r.json()).then(setTracks) }
    else alert('خطأ في كلمة المرور');
  }

  async function upload(e){
    e.preventDefault();
    const fd = new FormData();
    if(file) fd.append('file', file);
    fd.append('title', title);
    fd.append('location', location);
    const res = await fetch('/api/upload', {method:'POST', body:fd});
    const j = await res.json();
    if(j.ok){ alert('تم الرفع'); setTracks(t=>[j.track,...t]) }
    else alert('خطأ');
  }

  return (
    <div className="container">
      <div className="card p-6">
        <h1 className="text-3xl font-bold">لوحة الأدمن</h1>
        {!logged ? <form onSubmit={doLogin} className="mt-4 space-y-3">
          <div><input className="input" placeholder="كلمة المرور" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <div><button className="btn bg-white/10">تسجيل الدخول</button></div>
          <div className="small mt-2">كلمة المرور الافتراضية: <strong>amr/12345</strong> (يمكن تغييرها في متغيرات البيئة)</div>
        </form> : <>
          <section className="mt-4">
            <h2 className="text-xl font-bold">رفع ملف صوتي</h2>
            <form onSubmit={upload} className="mt-3 space-y-3">
              <input className="input" placeholder="عنوان الملف" value={title} onChange={e=>setTitle(e.target.value)} />
              <input className="input" placeholder="المكان (اختياري)" value={location} onChange={e=>setLocation(e.target.value)} />
              <input type="file" accept="audio/*" onChange={e=>setFile(e.target.files[0])} />
              <button className="btn bg-white/10">رفع</button>
            </form>
          </section>

          <section className="mt-6">
            <h2 className="text-xl font-bold">المسارات</h2>
            {tracks.map(t=>(
              <div key={t.id} className="mt-3 p-3 bg-white/5 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="small opacity-80">{t.fileUrl}</div>
                  </div>
                  <div>
                    <button className="btn bg-red-500/20 small" onClick={async ()=>{ if(confirm('حذف؟')){ await fetch('/api/tracks/'+t.id,{method:'DELETE'}); setTracks(tracks.filter(x=>x.id!==t.id)) }}}>حذف</button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </>}
      </div>
    </div>
  )
}
