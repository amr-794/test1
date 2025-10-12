
import { deleteTrack } from '../../../lib/db';
export default function handler(req,res){
  const { id } = req.query;
  if(req.method==='DELETE'){ deleteTrack(id); res.json({ok:true}); }
  else res.status(405).end();
}
