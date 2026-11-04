(function(){
 function load(src,attrs){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=true;s.crossOrigin="anonymous";Object.entries(attrs||{}).forEach(([k,v])=>s.setAttribute(k,v));s.onload=resolve;s.onerror=()=>reject(new Error("Could not load secure sign-in."));document.head.appendChild(s)})}
 window.LUXE_AUTH=(async()=>{
  const response=await fetch("/api/auth/config",{cache:"no-store",headers:{Accept:"application/json"}});
  const config=await response.json().catch(()=>({}));
  if(!response.ok||!config.publishableKey)throw new Error("Secure sign-in is not configured yet.");
  const encoded=config.publishableKey.split("_")[2];if(!encoded)throw new Error("Invalid sign-in configuration.");
  const domain=atob(encoded).slice(0,-1);if(!/^[a-zA-Z0-9.-]+$/.test(domain))throw new Error("Invalid sign-in domain.");
  await load("https://"+domain+"/npm/@clerk/ui@1/dist/ui.browser.js");
  await load("https://"+domain+"/npm/@clerk/clerk-js@6/dist/clerk.browser.js",{"data-clerk-publishable-key":config.publishableKey});
  if(!window.Clerk)throw new Error("Secure sign-in is unavailable.");
  await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
  return window.Clerk;
 })();
})();