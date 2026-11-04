const { authenticate } = require("../_lib/auth");
const { query } = require("../_lib/database");
const { randomUUID } = require("node:crypto");
const MAX_BODY = 8192;
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("X-Content-Type-Options","nosniff");return res.status(status).json(payload)}
function parse(req){if(!req.body||typeof req.body!=="object"||Array.isArray(req.body)||Buffer.byteLength(JSON.stringify(req.body),"utf8")>MAX_BODY)return null;return req.body}
function validate(input){
 const allowed=["title","description","priceGmd","imageUrl","categorySlug","sku","stockQuantity"];
 if(Object.keys(input).some(k=>!allowed.includes(k)))return {error:"UNSUPPORTED_FIELDS"};
 const title=typeof input.title==="string"?input.title.trim():"",description=typeof input.description==="string"?input.description.trim():"";
 const price=Number(input.priceGmd),image=input.imageUrl===undefined||input.imageUrl===""?null:input.imageUrl;
 const category=typeof input.categorySlug==="string"?input.categorySlug.trim().toLowerCase():"",rawSku=typeof input.sku==="string"?input.sku.trim():null,sku=rawSku||null,stock=input.stockQuantity===undefined?0:Number(input.stockQuantity);
 if(title.length<2||title.length>120)return {error:"INVALID_TITLE"};
 if(description.length>2000)return {error:"DESCRIPTION_TOO_LONG"};
 if(!Number.isFinite(price)||price<0||price>100000000)return {error:"INVALID_PRICE"};
 if(image!==null&&(typeof image!=="string"||image.length>2048||!/^https:\/\//i.test(image)))return {error:"INVALID_IMAGE_URL"};
 if(category&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category))return {error:"INVALID_CATEGORY"};
 if(sku!==null&&(sku.length>64||! /^[a-zA-Z0-9_-]+$/.test(sku)))return {error:"INVALID_SKU"};
 if(!Number.isInteger(stock)||stock<0||stock>100000)return {error:"INVALID_STOCK"};
 return {values:[title,description,price,image,category||null,sku,stock]};
}
module.exports=async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const session=await authenticate(req);if(!session.ok)return send(res,session.status,{ok:false,code:session.code,message:session.message});
 try{
  const profiles=await query("select role from public.profiles where id=$1 limit 1",[session.userId]);
  if(!profiles||!profiles.length||profiles[0].role!=="seller")return send(res,403,{ok:false,code:"SELLER_ROLE_REQUIRED"});
  if(req.method==="GET"){
   const rows=await query("select id,title,description,price_gmd,image_url,category_slug,sku,stock_quantity,status,review_note,created_at,updated_at from public.products where seller_id=$1 order by created_at desc limit 100",[session.userId]);
   return send(res,200,{ok:true,products:rows||[]});
  }
  const input=parse(req);if(!input)return send(res,400,{ok:false,code:"INVALID_BODY"});
  const checked=validate(input);if(checked.error)return send(res,422,{ok:false,code:checked.error});
  const [title,description,price,image,category,sku,stock]=checked.values;
  const rows=await query("insert into public.products(seller_id,title,description,price_gmd,image_url,category_slug,sku,stock_quantity,status) values($1,$2,$3,$4,$5,$6,$7,$8,'draft') returning id,title,description,price_gmd,image_url,category_slug,sku,stock_quantity,status,created_at,updated_at",[session.userId,title,description,price,image,category,sku,stock]);
  return send(res,201,{ok:true,product:rows[0]});
 }catch(error){
  if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});
  if(error&&error.code==="23505")return send(res,409,{ok:false,code:"SKU_CONFLICT"});
  const requestId=randomUUID();console.error("LUXE seller product request failed",{requestId});return send(res,500,{ok:false,code:"INTERNAL_ERROR",requestId});
 }
};
