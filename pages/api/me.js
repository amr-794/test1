
import { parse } from 'cookie';
export default function handler(req,res){
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  res.json({ ok: !!cookies.admin_token });
}
