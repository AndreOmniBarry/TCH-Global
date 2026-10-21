// Stand-in SHEP.HRD implementing docs/shep-bridge/CONTRACT.md §1 verification.
import http from 'http'; import crypto from 'crypto';
const KEYS = { 'tch-k1': process.env.SECRET };
const HOST = '127.0.0.1:4801';
let mode = 'ok'; const inbox = new Map(); const received = [];
const ALLOW = ["Ushering & Hospitality","Media & Live Stream","Worship & Music","Children's Ministry","Outreach & Missions","Prayer Team","Protocol & Security","Sanitation & Facilities","Follow-up & Counselling","Administration"];
const SCHEMA = { 'member.join':['full_name','email','phone','note'], 'care.salvation':['full_name','email','phone','city','note'], 'prayer.request':['request'], 'workforce.volunteer':['full_name','email','phone','teams','team_idea'] };
const send=(res,c,j)=>{res.writeHead(c,{'content-type':'application/json'});res.end(JSON.stringify(j));};
http.createServer((req,res)=>{ let raw=''; req.on('data',d=>raw+=d); req.on('end',()=>{
  if (req.url.startsWith('/__mode')) { mode = new URL(req.url,'http://x').searchParams.get('m'); return send(res,200,{mode}); }
  if (req.url === '/__received') return send(res,200,{received, inbox:[...inbox.keys()]});
  if (req.url !== '/api/bridge/ingest' || req.method !== 'POST') return send(res,404,{});
  if (mode==='down') { req.socket.destroy(); return; }
  if (mode==='500') return send(res,500,{error:'processing'});
  if (mode==='slow') return setTimeout(()=>send(res,202,{status:'accepted'}), 6000);
  const id=req.headers['x-bridge-key'], ts=req.headers['x-bridge-timestamp'], sig=String(req.headers['x-bridge-signature']||'');
  const secret = KEYS[id] || 'dummy'; 
  const canon = ['v1','POST','/api/bridge/ingest',HOST,ts,id,crypto.createHash('sha256').update(raw).digest('hex')].join('\n');
  const want = crypto.createHmac('sha256', mode==='401' ? 'wrong' : secret).update(canon).digest();
  const got = Buffer.from(sig.replace(/^v1=/,''),'hex');
  if (!/^\d+$/.test(ts||'') || Math.abs(Date.now()/1000-Number(ts))>300 || got.length!==want.length || !crypto.timingSafeEqual(got,want) || !KEYS[id]) return send(res,401,{error:'unauthorized'});
  let env; try{ env=JSON.parse(raw);}catch{ return send(res,400,{error:'json'}); }
  const top=Object.keys(env).sort().join(); if(top!=='consent,data,id,occurredAt,type,v'||env.v!==1) return send(res,422,{error:'envelope:'+top});
  const allowed=SCHEMA[env.type]; if(!allowed) return send(res,422,{error:'type'});
  for(const k of Object.keys(env.data)) if(!allowed.includes(k)) return send(res,422,{error:'field '+k});
  if (env.data.teams && env.data.teams.some(t=>!ALLOW.includes(t))) return send(res,422,{error:'team'});
  if (mode==='422') return send(res,422,{error:'forced'});
  const h=crypto.createHash('sha256').update(raw).digest('hex');
  if (inbox.has(env.id)) return inbox.get(env.id)===h ? send(res,200,{status:'duplicate'}) : send(res,409,{error:'conflict'});
  inbox.set(env.id,h); received.push({type:env.type,data:env.data,consent:env.consent});
  send(res,202,{status:'accepted',receipt:crypto.randomUUID()});
});}).listen(4801, ()=>console.log('shep up'));
