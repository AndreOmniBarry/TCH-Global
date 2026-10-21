import http from 'http';
const S = new Map(); const exp = new Map();
const now = () => Date.now();
function alive(k){ if (exp.has(k) && exp.get(k) <= now()) { S.delete(k); exp.delete(k); } return S.has(k); }
const z = (k) => { alive(k); if (!S.has(k)) S.set(k, new Map()); return S.get(k); };
const l = (k) => { alive(k); if (!S.has(k)) S.set(k, []); return S.get(k); };
const num = (v) => v === '+inf' ? Infinity : v === '-inf' ? -Infinity : Number(v);
function run(c){
  const [cmd, ...a] = c.map(String); const C = cmd.toUpperCase();
  switch (C) {
    case 'SET': { const [k,v,...o]=a; let nx=false,ex=null; for(let i=0;i<o.length;i++){const u=o[i].toUpperCase(); if(u==='NX')nx=true; if(u==='EX')ex=Number(o[++i]); if(u==='PX')ex=Number(o[++i])/1000;} if(nx&&alive(k)) return null; S.set(k,v); if(ex) exp.set(k,now()+ex*1000); else exp.delete(k); return 'OK'; }
    case 'GET': return alive(a[0]) ? S.get(a[0]) : null;
    case 'DEL': { let n=0; for(const k of a){ if(alive(k)){S.delete(k);exp.delete(k);n++;} } return n; }
    case 'EXISTS': return a.filter(alive).length;
    case 'INCR': { const v=(alive(a[0])?Number(S.get(a[0])):0)+1; S.set(a[0],String(v)); return v; }
    case 'EXPIRE': if(!alive(a[0])) return 0; exp.set(a[0], now()+Number(a[1])*1000); return 1;
    case 'ZADD': { const m=z(a[0]); let n=0; let i=1; while(i<a.length && isNaN(Number(a[i]))) i++; for(;i<a.length;i+=2){ if(!m.has(a[i+1]))n++; m.set(a[i+1], Number(a[i])); } return n; }
    case 'ZINCRBY': { const m=z(a[0]); const v=(m.get(a[2])||0)+Number(a[1]); m.set(a[2],v); return String(v); }
    case 'ZREM': { const m=z(a[0]); let n=0; for(const x of a.slice(1)) if(m.delete(x)) n++; return n; }
    case 'ZCARD': return z(a[0]).size;
    case 'ZCOUNT': { const lo=num(a[1]), hi=num(a[2]); return [...z(a[0]).values()].filter(s=>s>=lo&&s<=hi).length; }
    case 'ZRANGE': { const m=z(a[0]); const o=a.slice(3).map(x=>x.toUpperCase()); const sorted=[...m.entries()].sort((x,y)=>x[1]-y[1]); let res;
      if(o.includes('BYSCORE')){ const lo=num(a[1]), hi=num(a[2]); res=sorted.filter(([,s])=>s>=lo&&s<=hi); const li=o.indexOf('LIMIT'); if(li>=0){ const off=Number(a[3+li+1]), cnt=Number(a[3+li+2]); res=res.slice(off, off+cnt);} }
      else { let st=Number(a[1]), en=Number(a[2]); if(en<0) en=sorted.length+en; res=sorted.slice(st,en+1); }
      return o.includes('WITHSCORES') ? res.flatMap(([m,s])=>[m,String(s)]) : res.map(([m])=>m); }
    case 'LPUSH': { const L=l(a[0]); for(const v of a.slice(1)) L.unshift(v); return L.length; }
    case 'LTRIM': { const L=l(a[0]); let st=Number(a[1]), en=Number(a[2]); if(en<0) en=L.length+en; S.set(a[0], L.slice(st,en+1)); return 'OK'; }
    case 'LRANGE': { const L=l(a[0]); let st=Number(a[1]), en=Number(a[2]); if(en<0) en=L.length+en; return L.slice(st,en+1); }
    case 'LREM': { const L=l(a[0]); let n=Number(a[1])||Infinity, r=0; const out=[]; for(const v of L){ if(v===a[2]&&r<n){r++;continue;} out.push(v);} S.set(a[0],out); return r; }
    case 'PFADD': case 'PFCOUNT': return 0;
    default: throw new Error('unsupported '+C);
  }
}
const enc = (v, b) => !b ? v : typeof v === 'string' ? Buffer.from(v).toString('base64') : Array.isArray(v) ? v.map(x=>enc(x,b)) : v;
http.createServer((req,res)=>{ let body=''; req.on('data',d=>body+=d); req.on('end',()=>{
  const b64 = (req.headers['upstash-encoding']||'')==='base64';
  let j; try{ j=JSON.parse(body||'[]'); }catch{ j=[]; }
  const one = (c)=>{ try{ return { result: enc(run(c), b64) }; }catch(e){ return { error: e.message }; } };
  let out;
  if (req.url.startsWith('/pipeline') || req.url.startsWith('/multi-exec')) out = j.map(one); else out = one(j);
  res.setHeader('content-type','application/json'); res.end(JSON.stringify(out));
});}).listen(4800, ()=>console.log('kv up'));
