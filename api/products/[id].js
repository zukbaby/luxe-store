const { query }=require("../_lib/database");
function send(res,status,payload){res.setHeader("Cache-Control","public, max-age=30, stale-while-revalidate=60");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const id=typeof req.query?.id==="string"?req.query.id:"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return send(res,422,{ok:false,code:"INVALID_PRODUCT_ID"});
 try{
  const rows=await query(
   `select p.id,p.title,p.description,p.price_gmd,p.image_url,p.category_slug,
           p.stock_quantity,p.created_at,s.store_name,s.store_slug
    from public.products p join public.seller_storefronts s
      on s.seller_id=p.seller_id and s.is_public=true
    where p.id=$1 and p.status='published' and p.stock_quantity>0 limit 1`,
   [id]);
  if(!rows||!rows.length)return send(res,404,{ok:false,code:"PRODUCT_NOT_FOUND"});
  return send(res,200,{ok:true,product:rows[0]});
 }catch(error){if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});return send(res,500,{ok:false,code:"INTERNAL_ERROR"})}
};
