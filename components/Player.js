
import { useRef, useState } from 'react';
export default function Player({src, title}){
  const audioRef = useRef();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = ()=>{
    if(!audioRef.current) return;
    if(playing){ audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }
  return (
    <div className="flex items-center space-x-3">
      <button onClick={toggle} className="btn bg-white/10 small">{playing? 'إيقاف' : 'تشغيل'}</button>
      <div className="small">{title}</div>
      <audio ref={audioRef} src={src} onTimeUpdate={e=>setProgress((e.target.currentTime/e.target.duration||0)*100)} onEnded={()=>setPlaying(false)} />
    </div>
  )
}
