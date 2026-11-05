const { query }=require("../_lib/database");
function send(res,status,payload){res.setHeader("Cache-Control","public, max-age=30, stale-while-revalidate=60");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const slug=typeof req.query?.slug==="string"?req.query.slug.toLowerCase():"";
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return send(res,422,{ok:false,code:"INVALID_STORE_SLUG"});
 try{
  const stores=await query(
    `select s.store_name,s.store_slug,s.description,s.logo_url,s.banner_url,
       p.username,p.display_name,
       case when p.id=$2 or lower(p.username)='official.dama' then 'blue'
            when to_jsonb(p)->>'verification_badge' in ('green','gold') then to_jsonb(p)->>'verification_badge'
            else null end as badge_color
     from public.seller_storefronts s
     join public.profiles p on p.id=s.seller_id
     where s.store_slug=$1 and s.is_public=true limit 1`,
    [slug,process.env.LUXE_OWNER_USER_ID||""]);
  if(!stores||!stores.length)return send(res,404,{ok:false,code:"STORE_NOT_FOUND"});
  const products=await query("select id,title,description,price_gmd,image_url,category_slug,stock_quantity from public.products where seller_id=(select seller_id from public.seller_storefronts where store_slug=$1 and is_public=true) and status='published' and stock_quantity>0 order by is_featured desc,created_at desc limit 60",[slug]);
  return send(res,200,{ok:true,store:stores[0],products:products||[]});
 }catch(error){if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});return send(res,500,{ok:false,code:"INTERNAL_ERROR"})}
};
