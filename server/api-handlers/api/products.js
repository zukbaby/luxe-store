const { query } = require("./_lib/database");
const { randomUUID } = require("node:crypto");
function send(res,status,payload){res.setHeader("Cache-Control","public, max-age=30, stale-while-revalidate=60");res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("X-Content-Type-Options","nosniff");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const q=typeof req.query?.q==="string"?req.query.q.trim().slice(0,80):"";
 const category=typeof req.query?.category==="string"?req.query.category.trim().toLowerCase():"";
 if(category&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category))return send(res,422,{ok:false,code:"INVALID_CATEGORY"});
 try{
  const rows=await query(
   `select p.id,p.title,p.description,p.price_gmd,p.image_url,p.category_slug,
           p.stock_quantity,p.created_at,s.store_name,s.store_slug,pr.username,pr.display_name,
           case when pr.id=$3 or lower(pr.username)='official.dama' then 'blue'
                when to_jsonb(pr)->>'verification_badge' in ('green','gold') then to_jsonb(pr)->>'verification_badge'
                else null end as badge_color
    from public.products p
    join public.seller_storefronts s on s.seller_id=p.seller_id and s.is_public=true
    join public.profiles pr on pr.id=p.seller_id
    where p.status='published' and p.stock_quantity>0
      and ($1='' or p.title ilike '%' || $1 || '%' or p.description ilike '%' || $1 || '%')
      and ($2='' or p.category_slug=$2)
    order by p.is_featured desc,p.created_at desc limit 60`,
   [q,category,process.env.LUXE_OWNER_USER_ID||""]
  );
  return send(res,200,{ok:true,products:rows||[]});
 }catch(error){
  if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
  const requestId=randomUUID();console.error("LUXE public catalogue failed",{requestId});return send(res,500,{ok:false,code:"INTERNAL_ERROR",requestId});
 }
};
