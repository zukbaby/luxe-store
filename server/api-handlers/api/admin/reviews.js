const { requireOwner }=require("../_lib/authorization");
const { query }=require("../_lib/database");
const { randomUUID }=require("node:crypto");
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const owner=await requireOwner(req);if(!owner.ok)return send(res,owner.status,{ok:false,code:owner.code});
 try{
  if(req.method==="GET"){
   const rows=await query(
    `select r.id,r.product_id,r.buyer_id,r.order_id,r.rating,r.title,r.body,r.created_at,
            p.title as product_title,pr.username,pr.display_name
     from public.product_reviews r
     join public.products p on p.id=r.product_id
     join public.profiles pr on pr.id=r.buyer_id
     where r.is_published=false and r.reviewed_at is null
     order by r.created_at asc limit 100`,[]);
   return send(res,200,{ok:true,reviews:rows||[]});
  }
  const b=req.body;
  if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).some(k=>!["reviewId","decision","moderationNote"].includes(k))||
    typeof b.reviewId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.reviewId)||
    !["approved","rejected"].includes(b.decision)||(b.moderationNote!==undefined&&(typeof b.moderationNote!=="string"||b.moderationNote.length>1000)))return send(res,422,{ok:false,code:"INVALID_DECISION"});
  const publish=b.decision==="approved";
  const rows=await query(
   `with decided as (
      update public.product_reviews set is_published=$2,reviewed_at=now(),
        reviewed_by=$3,moderation_note=$4,updated_at=now()
      where id=$1 and is_published=false and reviewed_at is null
      returning id,buyer_id,product_id,is_published
    ),
    audit as (
      insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
      select $3,case when d.is_published then 'review_approved' else 'review_rejected' end,
        'product_review',d.id::text,jsonb_build_object('productId',d.product_id)
      from decided d returning id
    ),
    notice as (
      insert into public.notifications(user_id,kind,title,body,safe_payload)
      select d.buyer_id,'product_update',
        case when d.is_published then 'Your review is published' else 'Your review was not published' end,
        case when d.is_published then 'Your product review is now visible on LUXE STORE.'
             else 'Your product review was reviewed and will not appear publicly.' end,
        jsonb_build_object('reviewId',d.id,'status',case when d.is_published then 'approved' else 'rejected' end)
      from decided d returning id
    )
    select id,buyer_id,product_id,is_published from decided`,
   [b.reviewId,publish,owner.userId,(b.moderationNote||"").trim()]);
  if(!rows||!rows.length)return send(res,404,{ok:false,code:"REVIEW_NOT_PENDING"});
  return send(res,200,{ok:true,review:rows[0]});
 }catch(error){
  if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
  const requestId=randomUUID();console.error("LUXE review moderation failed",{requestId});return send(res,500,{ok:false,code:"INTERNAL_ERROR",requestId});
 }
};
