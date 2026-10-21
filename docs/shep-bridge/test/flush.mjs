import crypto from 'crypto';
const [keyId, secret, host, tsOff] = process.argv.slice(2);
const body='{}'; const ts=String(Math.floor(Date.now()/1000)+Number(tsOff||0));
const canon=['v1','POST','/api/bridge/flush',host,ts,keyId,crypto.createHash('sha256').update(body).digest('hex')].join('\n');
const sig=crypto.createHmac('sha256',secret).update(canon).digest('hex');
console.log(`-H x-bridge-key:${keyId} -H x-bridge-timestamp:${ts} -H x-bridge-signature:v1=${sig}`);
