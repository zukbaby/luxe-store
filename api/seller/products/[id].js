const { authenticate } = require("../../_lib/auth");
const { query } = require("../../_lib/database");
const { randomUUID } = require("node:crypto");
function send(res,status,payload){res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","application/json; charset=utf-8");return res.status(status).json(payload)}
module.exports=async function handler(req,res){
 if(req.method!=="PATCH"){res.setHeader("Allow","PATCH");return send(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"})}
 const session=await authenticate(req);if(!session.ok)return send(res,session.status,{ok:false,code:session.code});
 const id=typeof req.query?.id==="string"?req.query.id:"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return send(res,422,{ok:false,code:"INVALID_PRODUCT_ID"});
 const input=req.body;if(!input||typeof input!=="object"||Array.isArray(input)||Buffer.byteLength(JSON.stringify(input),"utf8")>8192)return send(res,400,{ok:false,code:"INVALID_BODY"});
 const allowed=["title","description","priceGmd","imageUrl","categorySlug","sku","stockQuantity"];
 if(Object.keys(input).some(k=>!allowed.includes(k)))return send(res,400,{ok:false,code:"UNSUPPORTED_FIELDS"});
 const fields=[],values=[id,session.userId],map={title:"title",description:"description",priceGmd:"price_gmd",imageUrl:"image_url",categorySlug:"category_slug",sku:"sku",stockQuantity:"stock_quantity"};
 for(const [key,col] of Object.entries(map)){
  if(!(key in input))continue;let v=input[key];
  if(["title","description","sku","categorySlug"].includes(key))v=typeof v==="string"?v.trim():v;
  if(["priceGmd","stockQuantity"].includes(key))v=Number(v);
  if(key==="imageUrl"&&v==="")v=null;
  if(key==="imageUrl"&&v!==null&&(typeof v!=="string"||!/^https:\/\//i.test(v)||v.length>2048))return send(res,422,{ok:false,code:"INVALID_IMAGE_URL"});
  if(key==="title"&&(typeof v!=="string"||v.length<2||v.length>120))return send(res,422,{ok:false,code:"INVALID_TITLE"});
  if(key==="description"&&(typeof v!=="string"||v.length>2000))return send(res,422,{ok:false,code:"INVALID_DESCRIPTION"});
  if(key==="priceGmd"&&(!Number.isFinite(v)||v<0||v>100000000))return send(res,422,{ok:false,code:"INVALID_PRICE"});
  if(key==="stockQuantity"&&(!Number.isInteger(v)||v<0||v>100000))return send(res,422,{ok:false,code:"INVALID_STOCK"});
  if(key==="categorySlug"&&v!==""&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))return send(res,422,{ok:false,code:"INVALID_CATEGORY"});
  if(key==="sku"&&v!==null&&v!==""&&(typeof v!=="string"||v.length>64||!/^[a-zA-Z0-9_-]+$/.test(v)))return send(res,422,{ok:false,code:"INVALID_SKU"});
  fields.push(col+"=$"+(values.length+1));values.push(key==="categorySlug"&&!v?null:key==="sku"&&!v?null:v);
 }
 if(!fields.length)return send(res,422,{ok:false,code:"NO_CHANGES"});
 try{
  const rows=await query("update public.products set "+fields.join(", ")+",updated_at=now() where id=$1 and seller_id=$2 and status='draft' returning id,title,description,price_gmd,image_url,category_slug,sku,stock_quantity,status,updated_at",values);
  if(!rows||!rows.length)return send(res,404,{ok:false,code:"DRAFT_NOT_FOUND"});
  return send(res,200,{ok:true,product:rows[0]});
 }catch(error){if(error&&error.code==="DATABASE_NOT_CONFIGURED")return send(res,503,{ok:false,code:"DATABASE_NOT_CONFIGURED"});if(error&&error.code==="23505")return send(res,409,{ok:false,code:"SKU_CONFLICT"});const requestId=randomUUID();console.error("LUXE seller product update failed",{requestId});return send(res,500,{ok:false,code:"INTERNAL_ERROR",requestId})}
};
