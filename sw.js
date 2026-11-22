const SAVED='faust-saved-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 e.respondWith((async()=>{
  try{const response=await fetch(e.request);if(response.ok)return response;}catch{}
  const cached=await(await caches.open(SAVED)).match(url.href);if(!cached)return new Response('Offline file unavailable',{status:503});
  const range=e.request.headers.get('Range');if(!range)return cached;
  const bytes=await cached.arrayBuffer(),match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416});
  let start=match[1]?Number(match[1]):Math.max(0,bytes.byteLength-Number(match[2])),end=match[1]?(match[2]?Number(match[2]):bytes.byteLength-1):bytes.byteLength-1;
  end=Math.min(end,bytes.byteLength-1);if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('Content-Type')||'application/octet-stream','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
 })());
});
