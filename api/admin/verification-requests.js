const { requireOwner } = require("../_lib/authorization");
const { query } = require("../_lib/database");

function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}

module.exports = async function handler(req,res){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
  const owner=await requireOwner(req);
  if(!owner.ok)return send(res,owner.status,{ok:false,code:owner.code});
  try{
    const rows=await query(
      `select v.id,v.user_id,p.username,p.display_name,v.status,v.submitted_at
       from public.verification_requests v
       join public.profiles p on p.id=v.user_id
       where v.status='pending'
       order by v.submitted_at asc limit 100`,[]);
    return send(res,200,{ok:true,requests:rows||[]});
  }catch(error){
    if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
    return send(res,500,{ok:false,code:"INTERNAL_ERROR"});
  }
};
