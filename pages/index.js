
import { useEffect, useState } from 'react';
import Player from '../components/Player';

export default function Home(){
  const [tracks, setTracks] = useState([]);
  useEffect(()=>{ fetch('/api/tracks').then(r=>r.json()).then(setTracks) }, []);
  return (
    <div className="container">
      <header className="card mb-6 p-6">
        <h1 className="text-4xl font-extrabold">منصة نشر الصوتيات</h1>
        <p className="small mt-2">واجهة جميلة وسهلة — استمع، أعجب، وعلّق.</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="text-2xl font-bold">قوائم التشغيل</h2>
          <p className="small">اسحب لترتيب أو افتح مسار للتشغيل.</p>
          {tracks.length===0 ? <p className="mt-4 small">لا يوجد مسارات حتى الآن.</p> :
            tracks.map(t=>(
              <div key={t.id} className="mt-4 p-4 rounded-md bg-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="small mt-1 opacity-70">{t.location || '—'}</div>
                  </div>
                  <div>
                    <Player src={t.fileUrl} title={t.title} />
                  </div>
                </div>
                <div className="mt-2 small opacity-80">تاريخ: {t.date || 'غير محدد'}</div>
              </div>
            ))
          }
        </section>

        <aside className="card">
          <h2 className="text-2xl font-bold">صور وتحكم</h2>
          <p className="small">الصورة الشخصية والصور الرئيسية يمكن تعديلها من لوحة الأدمن.</p>
          <div className="mt-4">
            <img src="/defaults/avatar.png" alt="avatar" className="w-36 h-36 rounded-full object-cover border-2 border-white/20"/>
          </div>
          <div className="mt-6">
            <a href="/admin" className="btn bg-white/10">لوحة الأدمن</a>
          </div>
        </aside>
      </main>
    </div>
  )
}
