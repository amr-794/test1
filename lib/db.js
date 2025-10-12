
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
const DBFILE = path.join(process.cwd(), 'data','db.json');

function read(){
  try{
    const s = fs.readFileSync(DBFILE,'utf8');
    return JSON.parse(s);
  }catch(e){ return {tracks:[], users:[], comments:[], settings:{}} }
}
function writeData(d){ fs.mkdirSync(path.dirname(DBFILE), {recursive:true}); fs.writeFileSync(DBFILE, JSON.stringify(d, null, 2)) }

export function listTracks(){ return read().tracks.sort((a,b)=> (a.order||0)-(b.order||0)) }
export function addTrack({title,fileUrl,location,date}){
  const d = read(); const t = { id: nanoid(10), title, fileUrl, location, date: date||new Date().toISOString(), order: (d.tracks.length? d.tracks.length:0)+1 };
  d.tracks.unshift(t); writeData(d); return t;
}
export function deleteTrack(id){
  const d = read(); d.tracks = d.tracks.filter(t=>t.id!==id); writeData(d); return true;
}
