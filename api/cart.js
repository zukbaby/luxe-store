const { authenticate }=require("./_lib/auth");
const { query }=require("./_lib/database");
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(!["GET","PUT","DELETE"].includes(req.method)){res.setHeader("Allow","GET, PUT, DELETE");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const session=await authenticate(req);if(!session.ok)return send(res,session.status,{ok:false,code:session.code});
 try{
  if(req.method==="GET"){
   const rows=await query(
    `select ci.product_id,ci.quantity,p.title,p.price_gmd,p.image_url,p.stock_quantity,
            s.store_name,s.store_slug,(ci.quantity*p.price_gmd)::numeric(12,2) as line_total_gmd
     from public.carts c join public.cart_items ci on ci.cart_id=c.id
     join public.products p on p.id=ci.product_id
     join public.seller_storefronts s on s.seller_id=p.seller_id and s.is_public=true
     where c.buyer_id=$1 and p.status='published'
     order by ci.added_at desc limit 100`,[session.userId]);
   const total=(rows||[]).reduce((sum,row)=>sum+Number(row.line_total_gmd),0);
   return send(res,200,{ok:true,items:rows||[],totalGmd:total});
  }
  const b=req.body;
  if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).some(k=>k!=="productId"&&k!=="quantity")||typeof b.productId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.productId))return send(res,422,{ok:false,code:"INVALID_BODY"});
  if(req.method==="DELETE"){
   const rows=await query(
    `delete from public.cart_items ci using public.carts c
     where ci.cart_id=c.id and c.buyer_id=$1 and ci.product_id=$2
     returning ci.product_id`,[session.userId,b.productId]);
   return send(res,200,{ok:true,removed:!!(rows&&rows.length)});
  }
  const quantity=b.quantity;
  if(!Number.isInteger(quantity)||quantity<1||quantity>99)return send(res,422,{ok:false,code:"INVALID_QUANTITY"});
  const rows=await query(
   `with cart as (
      insert into public.carts(buyer_id) values($1)
      on conflict(buyer_id) do update set updated_at=now()
      returning id
    ),
    available as (
      select id,stock_quantity from public.products
      where id=$2 and status='published' and stock_quantity >= $3
    ),
    saved as (
      insert into public.cart_items(cart_id,product_id,quantity)
      select c.id,a.id,$3 from cart c cross join available a
      on conflict(cart_id,product_id) do update
        set quantity=excluded.quantity,updated_at=now()
      returning product_id,quantity
    )
    select saved.product_id,saved.quantity from saved`,
   [session.userId,b.productId,quantity]);
  if(!rows||!rows.length)return send(res,409,{ok:false,code:"PRODUCT_UNAVAILABLE_OR_STOCK_LOW"});
  return send(res,200,{ok:true,item:rows[0]});
 }catch(error){
  if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
  return send(res,500,{ok:false,code:"INTERNAL_ERROR"});
 }
};
