import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const serverFile=fileURLToPath(new URL('./server.mjs',import.meta.url));
const dataDir=await mkdtemp(path.join(tmpdir(),'awewebos-node-test-'));
async function freePort(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});}
const port=await freePort(),base='http://127.0.0.1:'+port;
let child,logs='';
function start(){logs='';child=spawn(process.execPath,[serverFile],{env:{...process.env,AWE_BIND:'127.0.0.1',AWE_PORT:String(port),AWE_DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>logs+=d.toString());child.stderr.on('data',d=>logs+=d.toString());}
async function stop(){if(!child)return;const c=child;child=null;if(c.exitCode!==null)return;await new Promise(resolve=>{const timer=setTimeout(()=>{c.kill('SIGKILL');resolve();},3000);c.once('exit',()=>{clearTimeout(timer);resolve();});c.kill('SIGTERM');});}
async function ready(){for(let i=0;i<80;i++){if(child?.exitCode!==null)throw new Error('Node exited early: '+logs);try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Node did not start: '+logs);}
try{
 start();await ready();
 for(let i=0;i<30&&!/Publish token \(keep private\): [a-f0-9]+/.test(logs);i++)await new Promise(r=>setTimeout(r,20));
 const tokenMatch=logs.match(/Publish token \(keep private\): ([a-f0-9]+)/);
 assert.ok(tokenMatch,'startup prints a publish token');const token=tokenMatch[1];
 const headers={'content-type':'application/json',authorization:'Bearer '+token};
 const denied=await fetch(base+'/api/publish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Unauthorized',kind:'file',filename:'x.txt',dataBase64:Buffer.from('x').toString('base64')})});assert.equal(denied.status,401,'publishing requires the private token');
 const bytes=Buffer.from('AWEWEBOS test publication\n');
 const publish=await fetch(base+'/api/publish',{method:'POST',headers,body:JSON.stringify({title:'Validation document',description:'ci test searchable document',kind:'file',filename:'validation.txt',mime:'text/plain',dataBase64:bytes.toString('base64'),author:'CI'})});
 const publishRaw=await publish.text();assert.equal(publish.status,201,publishRaw);
 const first=JSON.parse(publishRaw);assert.match(first.publication.id,/^AWE-FID-[a-f0-9]{24}$/);
 const search=await fetch(base+'/api/search?q=searchable+document');assert.equal(search.status,200);
 const result=await search.json();assert.ok(result.results.some(x=>x.id===first.publication.id),'new publication appears in search');
 const download=await fetch(base+'/api/content/'+first.publication.id);assert.equal(download.status,200);
 assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes,'download bytes match upload');
 const appBytes=Buffer.from('<!doctype html><title>test app</title>');
 const appResp=await fetch(base+'/api/publish',{method:'POST',headers,body:JSON.stringify({title:'Validation app',description:'sandbox app test',kind:'app',filename:'test-app.html',mime:'text/html',dataBase64:appBytes.toString('base64'),author:'CI'})});
 assert.equal(appResp.status,201);const app=await appResp.json();assert.match(app.publication.id,/^AWE-APP-[a-f0-9]{24}$/);
 await stop();start();await ready();
 const afterRestart=await fetch(base+'/api/search?q=searchable+document');assert.ok((await afterRestart.json()).results.some(x=>x.id===first.publication.id),'publication persists after backend restart');
 const deleted=await fetch(base+'/api/item/'+first.publication.id,{method:'DELETE',headers});assert.equal(deleted.status,200);
 const afterDelete=await fetch(base+'/api/item/'+first.publication.id);assert.equal(afterDelete.status,404);
 console.log('PASS: health, token auth, FID/AppID IDs, publish, search, download, persistence across restart, and delete.');
} catch(e){console.error(e);console.error('Backend output:\n'+logs);process.exitCode=1;} finally {await stop();await rm(dataDir,{recursive:true,force:true});}
