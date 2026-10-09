#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const HOST=process.env.AWE_BIND||'127.0.0.1';
const PORT=Number(process.env.AWE_PORT||41801);
const DATA_DIR=path.resolve(process.env.AWE_DATA_DIR||'./awewebos-node-data');
const ITEMS_DIR=path.join(DATA_DIR,'items');
const CONFIG_PATH=path.join(DATA_DIR,'config.json');
const PEERS_PATH=path.join(DATA_DIR,'peers.json');
const MAX_BYTES=32*1024*1024,MAX_PEERS=24;
let config;
const CORS={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'content-type,authorization','access-control-max-age':'600','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function json(res,status,value,extra={}){const b=Buffer.from(JSON.stringify(value));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':b.length,'cache-control':'no-store',...extra});res.end(b);}
function safeId(s){return typeof s==='string'&&/^AWE-PUB-[a-f0-9]{24}$/.test(s);}
function cleanText(s,max){return String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);}
function safeFilename(s){const n=path.basename(String(s||'download.bin')).replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,120);return n&&n!=='.'&&n!=='..'?n:'download.bin';}
async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return fallback;}}
async function init(){
 await fs.mkdir(ITEMS_DIR,{recursive:true});config=await readJson(CONFIG_PATH,null);
 if(!config||typeof config.token!=='string'||!config.nodeId){config={nodeId:'AWENODE-'+crypto.randomUUID().replaceAll('-','').slice(0,24).toUpperCase(),name:os.hostname().slice(0,80),token:crypto.randomBytes(32).toString('hex'),createdAt:new Date().toISOString(),version:1};await fs.writeFile(CONFIG_PATH,JSON.stringify(config,null,2),{mode:0o600});}
 await fs.access(PEERS_PATH).catch(()=>fs.writeFile(PEERS_PATH,'[]',{mode:0o600}));
}
function authorized(req){const supplied=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const a=Buffer.from(supplied),b=Buffer.from(config.token);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
async function bodyJson(req,limit=MAX_BYTES*1.5){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Request too large'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON body'),{status:400});}}
async function getItem(id){if(!safeId(id))return null;const dir=path.join(ITEMS_DIR,id);const meta=await readJson(path.join(dir,'meta.json'),null);return meta?{dir,meta}:null;}
async function peerList(){const peers=await readJson(PEERS_PATH,[]);return Array.isArray(peers)?peers.filter(p=>p&&typeof p.url==='string').slice(0,MAX_PEERS):[];}
async function searchLocal(q,kind){const dirs=await fs.readdir(ITEMS_DIR,{withFileTypes:true});const terms=q.toLowerCase().split(/\s+/).filter(Boolean).slice(0,8);const out=[];for(const d of dirs){if(!d.isDirectory()||!safeId(d.name))continue;const meta=await readJson(path.join(ITEMS_DIR,d.name,'meta.json'),null);if(!meta||(kind&&kind!=='all'&&meta.kind!==kind))continue;const hay=(meta.title+' '+meta.description+' '+meta.filename+' '+meta.kind+' '+meta.author).toLowerCase();if(terms.every(t=>hay.includes(t)))out.push({...meta,id:d.name,nodeId:config.nodeId,nodeName:config.name,local:true});}return out.sort((a,b)=>b.publishedAt-a.publishedAt).slice(0,60);}
async function route(req,res){
 for(const [k,v] of Object.entries(CORS))res.setHeader(k,v);
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 const url=new URL(req.url||'/', 'http://localhost');const p=url.pathname;
 if(req.method==='GET'&&p==='/api/health')return json(res,200,{ok:true,service:'AWEWEBOS Local Publish Node',version:1});
 if(req.method==='GET'&&p==='/api/info')return json(res,200,{nodeId:config.nodeId,name:config.name,version:1,maxBytes:MAX_BYTES,peers:(await peerList()).length,host:HOST,port:PORT});
 if(req.method==='GET'&&p==='/api/search'){
  const q=cleanText(url.searchParams.get('q'),160),kind=cleanText(url.searchParams.get('kind')||'all',16);
  const local=await searchLocal(q,kind),peers=await peerList();
  const remote=await Promise.all(peers.map(async peer=>{try{const base=peer.url.replace(/\/+$/,'');const resp=await fetch(base+'/api/search?q='+encodeURIComponent(q)+'&kind='+encodeURIComponent(kind),{signal:AbortSignal.timeout(1800),headers:{accept:'application/json'}});if(!resp.ok)return [];const data=await resp.json();return (Array.isArray(data.results)?data.results:[]).slice(0,20).map(x=>({...x,local:false,peer:base}));}catch{return [];}}));
  const seen=new Set(local.map(x=>x.id)),results=[...local];for(const group of remote)for(const item of group)if(item&&safeId(item.id)&&!seen.has(item.id)){seen.add(item.id);results.push(item);}
  return json(res,200,{query:q,count:results.length,results:results.slice(0,100),nodeId:config.nodeId,peersQueried:peers.length});
 }
 const im=p.match(/^\/api\/item\/([^/]+)$/);
 if(req.method==='GET'&&im){const item=await getItem(decodeURIComponent(im[1]));if(!item)return json(res,404,{error:'Publication not found on this node'});return json(res,200,{...item.meta,id:item.meta.id||im[1],nodeId:config.nodeId,nodeName:config.name});}
 const cm=p.match(/^\/api\/content\/([^/]+)$/);
 if(req.method==='GET'&&cm){const item=await getItem(decodeURIComponent(cm[1]));if(!item)return json(res,404,{error:'Publication not found on this node'});const file=path.join(item.dir,'content.bin'),stat=await fs.stat(file);res.writeHead(200,{'content-type':item.meta.mime||'application/octet-stream','content-length':stat.size,'content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(safeFilename(item.meta.filename)),'cache-control':'no-store','x-content-type-options':'nosniff'});return fs.createReadStream(file).pipe(res);}
 if(req.method==='POST'&&p==='/api/publish'){
  if(!authorized(req))return json(res,401,{error:'Missing or invalid bearer token'});const input=await bodyJson(req);
  const title=cleanText(input.title,120),description=cleanText(input.description,500),filename=safeFilename(input.filename),kind=['file','app'].includes(input.kind)?input.kind:null;
  if(!title||!kind||typeof input.dataBase64!=='string')return json(res,400,{error:'title, kind and dataBase64 are required'});
  if(input.dataBase64.length>Math.ceil(MAX_BYTES*4/3)+8)return json(res,413,{error:'Publication exceeds 32 MiB'});
  const bytes=Buffer.from(input.dataBase64,'base64');if(!bytes.length||bytes.length>MAX_BYTES)return json(res,413,{error:'Publication must be between 1 byte and 32 MiB'});
  if(kind==='app'&&!/\.html?$/i.test(filename))return json(res,400,{error:'App publications must be HTML files'});
  const id='AWE-PUB-'+crypto.randomBytes(12).toString('hex'),dir=path.join(ITEMS_DIR,id);await fs.mkdir(dir,{recursive:false});
  const meta={id,title,description,kind,filename,mime:cleanText(input.mime,100)||'application/octet-stream',size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),author:cleanText(input.author,100)||'unknown',publishedAt:Date.now(),version:1};
  try{await fs.writeFile(path.join(dir,'content.bin'),bytes,{flag:'wx'});await fs.writeFile(path.join(dir,'meta.json'),JSON.stringify(meta,null,2),{flag:'wx'});}catch(e){await fs.rm(dir,{recursive:true,force:true});throw e;}
  return json(res,201,{ok:true,publication:meta,contentUrl:'/api/content/'+id});
 }
 const dm=p.match(/^\/api\/item\/([^/]+)$/);
 if(req.method==='DELETE'&&dm){if(!authorized(req))return json(res,401,{error:'Missing or invalid bearer token'});const id=decodeURIComponent(dm[1]),item=await getItem(id);if(!item)return json(res,404,{error:'Publication not found'});await fs.rm(item.dir,{recursive:true,force:true});return json(res,200,{ok:true,id});}
 if(req.method==='POST'&&p==='/api/peers'){
  if(!authorized(req))return json(res,401,{error:'Missing or invalid bearer token'});const input=await bodyJson(req,4096),value=String(input.url||'').trim().replace(/\/+$/,'');let parsed;try{parsed=new URL(value);}catch{return json(res,400,{error:'Peer URL must be absolute'});}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||!['','/'].includes(parsed.pathname)||parsed.search||parsed.hash)return json(res,400,{error:'Use a base URL such as https://host:41801'});
  const peers=await peerList();if(peers.length>=MAX_PEERS&&!peers.some(p=>p.url===value))return json(res,413,{error:'Peer limit reached'});
  const next=peers.filter(p=>p.url!==value);next.push({url:value,addedAt:new Date().toISOString()});await fs.writeFile(PEERS_PATH,JSON.stringify(next,null,2));return json(res,200,{ok:true,peers:next});
 }
 if(req.method==='GET'&&p==='/api/peers')return json(res,200,{peers:(await peerList()).map(p=>({url:p.url,addedAt:p.addedAt}))});
 if(req.method==='DELETE'&&p==='/api/peers'){if(!authorized(req))return json(res,401,{error:'Missing or invalid bearer token'});const input=await bodyJson(req,4096),value=String(input.url||'').replace(/\/+$/,'');const peers=(await peerList()).filter(p=>p.url!==value);await fs.writeFile(PEERS_PATH,JSON.stringify(peers,null,2));return json(res,200,{ok:true,peers});}
 return json(res,404,{error:'Not found'});
}
await init();
const server=http.createServer((req,res)=>{route(req,res).catch(err=>{console.error('[AWE node]',err);if(!res.headersSent)json(res,err.status||500,{error:err.status?err.message:'Internal server error'});else res.destroy();});});
server.requestTimeout=30000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
server.listen(PORT,HOST,()=>{console.log('AWEWEBOS Local Publish Node v1 at http://'+HOST+':'+PORT);console.log('Node ID: '+config.nodeId);console.log('Publish token (keep private): '+config.token);console.log('Data directory: '+DATA_DIR);if(HOST==='0.0.0.0'||HOST==='::')console.warn('WARNING: network-accessible node; use a firewall and HTTPS reverse proxy for public access.');});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>process.exit(0)));
