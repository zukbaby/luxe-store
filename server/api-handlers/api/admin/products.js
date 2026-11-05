const { requireOwner }=require("../_lib/authorization");
const { query }=require("../_lib/database");
const { randomUUID }=require("node:crypto");
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const owner=await requireOwner(req);if(!owner.ok)return send(res,owner.status,{ok:false,code:owner.code,message:owner.message});
 try{
  if(req.method==="GET"){
   const rows=await query(
    `select p.id,p.title,p.description,p.price_gmd,p.category_slug,p.stock_quantity,p.created_at,
            p.seller_id,pr.username,pr.display_name,s.store_name
     from public.products p join public.profiles pr on pr.id=p.seller_id
     left join public.seller_storefronts s on s.seller_id=p.seller_id
     where p.status='pending_review' order by p.created_at asc limit 100`,[]);
   return send(res,200,{ok:true,products:rows||[]});
  }
  const b=req.body;
  if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).some(k=>!["productId","decision","reviewerNote"].includes(k))||
     typeof b.productId!=="string"||!["approved","rejected"].includes(b.decision)||
     (b.reviewerNote!==undefined&&(typeof b.reviewerNote!=="string"||b.reviewerNote.length>1000)))return send(res,400,{ok:false,code:"INVALID_BODY"});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.productId))return send(res,422,{ok:false,code:"INVALID_PRODUCT_ID"});
  const status=b.decision==="approved"?"published":"draft",note=(b.reviewerNote||"").trim();
  const rows=await query(
   `with decided as (
      update public.products set status=$2::public.product_status,reviewed_at=now(),
        reviewed_by=$3,review_note=$4,updated_at=now()
      where id=$1 and status='pending_review'
      returning id,seller_id,title,status
    ),
    storefront as (
      update public.seller_storefronts s set is_public=true,updated_at=now()
      from decided d where s.seller_id=d.seller_id and d.status='published'
      returning s.seller_id
    ),
    audit as (
      insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
      select $3,'product_' || case when d.status='published' then 'approved' else 'returned' end,
        'product',d.id::text,jsonb_build_object('sellerId',d.seller_id)
      from decided d returning id
    ),
    notice as (
      insert into public.notifications(user_id,kind,title,body,safe_payload)
      select d.seller_id,'product_update',
        case when d.status='published' then 'Product approved' else 'Product needs changes' end,
        case when d.status='published' then 'Your product is approved and is now eligible to appear in the public catalogue.'
             else 'Your product was returned to drafts. Review the owner note in Seller Studio before resubmitting.' end,
        jsonb_build_object('productId',d.id,'status',d.status,'reviewNote',$4)
      from decided d returning id
    )
    select id,seller_id,title,status from decided`,
   [b.productId,status,owner.userId,note]);
  if(!rows||!rows.length)return send(res,404,{ok:false,code:"PRODUCT_NOT_PENDING"});
  return send(res,200,{ok:true,product:rows[0]});
 }catch(error){
  if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
  const requestId=randomUUID();console.error("LUXE product review failed",{requestId});return send(res,500,{ok:false,code:"INTERNAL_ERROR",requestId});
 }
};
