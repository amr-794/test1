
import { listTracks } from '../../../lib/db';
export default function handler(req,res){
  if(req.method!=='GET'){ res.status(405).end(); return; }
  res.json(listTracks());
}
