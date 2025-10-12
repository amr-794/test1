
import { serialize } from 'cookie';
export default function handler(req, res){
  if(req.method!=='POST'){ res.status(405).end(); return; }
  const { password } = req.body;
  // default admin password is "amr/12345" but can be overridden with ENV ADMIN_PASSWORD
  const ADMIN = process.env.ADMIN_PASSWORD || 'amr/12345';
  if(password === ADMIN){
    res.setHeader('Set-Cookie', serialize('admin_token','1',{path:'/', httpOnly:true, maxAge:60*60*24}));
    res.json({ok:true})
  } else res.status(401).json({ok:false})
}
