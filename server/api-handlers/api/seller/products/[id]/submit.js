const { authenticate }=require("../../../_lib/auth");
const { query }=require("../../../_lib/database");
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const session=await authenticate(req);if(!session.ok)return send(res,session.status,{ok:false,code:session.code});
 const id=typeof req.query?.id==="string"?req.query.id:"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return send(res,422,{ok:false,code:"INVALID_PRODUCT_ID"});
 try{
  const role=await query("select role from public.profiles where id=$1",[session.userId]);
  if(!role||!role.length||role[0].role!=="seller")return send(res,403,{ok:false,code:"SELLER_ROLE_REQUIRED"});
  const rows=await query("update public.products set status='pending_review',updated_at=now() where id=$1 and seller_id=$2 and status='draft' returning id,title,status",[id,session.userId]);
  if(!rows||!rows.length)return send(res,404,{ok:false,code:"DRAFT_NOT_FOUND"});
  return send(res,200,{ok:true,product:rows[0]});
 }catch(error){if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});return send(res,500,{ok:false,code:"INTERNAL_ERROR"})}
};
