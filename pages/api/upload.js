
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { addTrack } from '../../lib/db';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res){
  // require admin cookie
  if(req.method!=='POST'){ res.status(405).end(); return; }
  const cookies = req.headers.cookie || '';
  if(!cookies.includes('admin_token')) { res.status(401).json({ ok:false, error:'not auth' }); return; }
  const form = formidable({ multiples:false, keepExtensions:true, uploadDir: path.join(process.cwd(),'public','uploads') });
  fs.mkdirSync(path.join(process.cwd(),'public','uploads'), {recursive:true});
  form.parse(req, (err, fields, files)=>{
    if(err) { console.error(err); res.status(500).json({ok:false}); return; }
    let fileUrl = '';
    if(files.file){
      const f = files.file;
      const dest = path.join(process.cwd(),'public','uploads', path.basename(f.filepath));
      fs.copyFileSync(f.filepath, dest);
      fileUrl = '/uploads/'+path.basename(dest);
    } else if(fields.url){
      fileUrl = fields.url;
    } else {
      return res.status(400).json({ok:false});
    }
    const track = addTrack({ title: fields.title || 'بدون عنوان', fileUrl, location: fields.location || '' });
    res.json({ ok:true, track });
  })
}
