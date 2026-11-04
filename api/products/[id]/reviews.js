const { authenticate }=require("../../_lib/auth");
const { query }=require("../../_lib/database");
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const id=typeof req.query?.id==="string"?req.query.id:"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return send(res,422,{ok:false,code:"INVALID_PRODUCT_ID"});
 try{
  if(req.method==="GET"){
   const rows=await query("select id,rating,title,body,created_at from public.product_reviews where product_id=$1 and is_published=true order by created_at desc limit 50",[id]);
   return send(res,200,{ok:true,reviews:rows||[]});
  }
  const session=await authenticate(req);if(!session.ok)return send(res,session.status,{ok:false,code:session.code});
  const b=req.body;
  if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).some(k=>!["orderId","rating","title","body"].includes(k))||typeof b.orderId!=="string"||!/^[0-9a-f-]{36}$/i.test(b.orderId)||!Number.isInteger(b.rating)||b.rating<1||b.rating>5||typeof (b.title||"")!=="string"||typeof (b.body||"")!=="string'||(b.title||"").length>100||(b.body||"").length>2000)return send(res,422,{ok:false,code:"INVALID_REVIEW"});
  const rows=await query(
   `insert into public.product_reviews(product_id,buyer_id,order_id,rating,title,body,is_published)
    select $1,$2,$3,$4,$5,$6,false
    where exists(
      select 1 from public.orders o join public.order_items oi on oi.order_id=o.id
      where o.id=$3 and o.buyer_id=$2 and o.status='delivered' and oi.product_id=$1
    )
    returning id,rating,title,body,created_at`,
   [id,session.userId,b.orderId,b.rating,(b.title||"").trim(),(b.body||"").trim()]);
  if(!rows||!rows.length)return send(res,403,{ok:false,code:"VERIFIED_PURCHASE_REQUIRED"});
  return send(res,201,{ok:true,review:rows[0],message:"Review submitted for moderation."});
 }catch(error){
  if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
  if(error&&error.code==="23505")return send(res,409,{ok:false,code:"REVIEW_ALREADY_EXISTS"});
  return send(res,500,{ok:false,code:"INTERNAL_ERROR"});
 }
};
