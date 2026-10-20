import test from 'node:test';
import assert from 'node:assert/strict';
import {Room} from '../src/room';
import {WebSocket} from 'ws';
import {createBackend} from '../src/main';
import {PROTOCOL,type Snapshot} from '../../shared/multiplayer';
const bots=(r:Room)=>[...r.players.values()].filter(p=>p.ai);
function mixed(humans=1){const r=new Room('AIROOM');for(let i=0;i<humans;i++)r.add('h'+i,'Human '+i);r.setAI('h0',true);for(let i=humans-1;i>=0;i--)r.ready('h'+i,true);r.start('h0');return r;}
function tick(r:Room,n:number){for(let i=0;i<n;i++)r.tick(.05);}
function quiet(r:Room){r.enemies=[];r.pending=[];r.waveDelay=9999;}

test('AI is opt-in, host-only, fills on Ready, yields lobby slots to humans and never starts automatically',()=>{
 const r=new Room('LOBBY1');r.add('h0','Host');r.add('h1','Guest');assert.throws(()=>r.setAI('h1',true),/host/);r.setAI('h0',true);assert.equal(bots(r).length,0);r.ready('h1',true);assert.equal(bots(r).length,0);r.ready('h0',true);assert.equal(bots(r).length,4);assert.equal(r.phase,'lobby');assert(bots(r).every(p=>p.ready));
 r.add('h2','Human 2');assert.equal(bots(r).length,3);assert.equal(r.players.size,6);r.remove('h2');assert.equal(bots(r).length,4);assert.equal(new Set(bots(r).map(p=>p.name)).size,4);
 r.ready('h0',false);assert.equal(bots(r).length,0);r.ready('h0',true);assert.equal(bots(r).length,4);r.setAI('h0',false);assert.equal(bots(r).length,0);r.setAI('h0',true);r.ready('h0',true);
 for(let i=2;i<6;i++){r.add('h'+i,'Human '+i);r.ready('h'+i,true);}assert.equal(bots(r).length,0);assert.equal(r.players.size,6);assert.throws(()=>r.add('h6','Seventh'),/full/);r.start('h0');assert.equal(r.phase,'playing');assert.throws(()=>r.setAI('h0',false),/lobby/);
});

test('one human plus five AI and two humans plus four AI reset on restart, keep human host and clean up',()=>{
 for(const humans of [1,2]){const r=mixed(humans);assert.equal(bots(r).length,6-humans);assert.equal(r.enemies.length,6);assert.equal(r.host,'h0');assert(r.snapshot().players.filter(p=>p.ai).every(p=>p.name.startsWith('AI Hunter')));
  r.players.get('h0')!.downed=true;r.players.get('h0')!.health=0;tick(r,1);assert.equal(r.host,humans===1?'h0':'h1');assert(!r.players.get(r.host)!.ai);
  for(const p of r.players.values()){p.health=0;p.downed=true;}tick(r,1);assert.equal(r.phase,'defeat');r.restart(r.host);assert.equal(r.phase,'lobby');assert.equal(bots(r).length,0);assert.equal(r.players.size,humans);assert(r.allowAI);assert([...r.players.values()].every(p=>p.health===100&&!p.downed&&p.progression.level===1));
  for(const id of [...r.players.keys()])r.remove(id);assert.equal(r.players.size,0);assert.equal(r.host,'');
 }
});

test('AI follows humans around cover without crossing collision boundaries',()=>{
 const r=mixed();quiet(r);const h=r.players.get('h0')!;h.x=0;h.z=-7;const b=bots(r)[0];for(const other of bots(r).slice(1))r.remove(other.id);b.x=-13;b.z=-5;let passedEnd=false;
 for(let i=0;i<300;i++){r.tick(.05);assert(!r.blocked(b.x,b.z));if(b.x>-4&&b.z<-7)passedEnd=true;}
 assert(passedEnd);assert(Math.hypot(b.x-h.x,b.z-h.z)<3.5);assert.equal(b.progression.attackDamage,25);
});

test('AI attacks with ordinary damage/cooldowns, earns XP and cannot damage humans',()=>{
 const r=mixed();const b=bots(r)[0],h=r.players.get('h0')!;for(const other of bots(r).slice(1))r.remove(other.id);h.x=0;h.z=8;b.x=0;b.z=6;const e=r.enemies[0];r.enemies=[e];r.pending=['armored'];e.x=0;e.z=8;e.health=75;e.cooldown=99;tick(r,1);assert.equal(e.health,50);assert.equal(b.meleeCooldown,.45);assert.equal(h.health,100);tick(r,1);assert.equal(e.health,50);tick(r,25);assert.equal(e.health,0);assert.equal(h.progression.xp,30);assert.equal(b.progression.xp,30);
 // Ranged decisions create ordinary projectiles; cover stops shots via shared logic.
 e.health=75;e.x=0;e.z=14;b.x=0;b.z=4;b.meleeCooldown=0;tick(r,1);assert(r.shots.some(s=>s.owner===b.id));assert.equal(b.fireCooldown,.45);
});

test('AI cloak heals at 5 HP/s, respects cooldown and max HP, and enemy attacks down AI normally',()=>{
 const r=mixed();quiet(r);const b=bots(r)[0];b.health=50;tick(r,20);assert(Math.abs(b.health-55)<.001);assert(Math.abs(b.hunter.remaining-5)<.001);assert(Math.abs(b.hunter.cooldown-14)<.001);b.health=99.9;tick(r,1);assert.equal(b.health,100);
 b.hunter.end();b.health=50;tick(r,1);assert.equal(b.hunter.remaining,0);assert.equal(b.health,50);
 const other=mixed(),bot=bots(other)[0];for(const p of other.players.values()){p.x=-12;p.z=0;}bot.x=10;bot.z=0;bot.health=1;bot.hunter.cooldown=10;const e=other.enemies[0];other.enemies=[e];e.x=10;e.z=0;e.cooldown=0;tick(other,1);assert(bot.downed);assert.equal(bot.health,0);
});

test('AI revives a downed human through 3 seconds of cloak; attacks/damage interrupt the same revival state',()=>{
 const r=mixed();quiet(r);const h=r.players.get('h0')!,b=bots(r)[0];h.health=0;h.downed=true;h.x=0;h.z=2;b.x=1;b.z=2;for(const other of bots(r).slice(1)){other.x=12;other.z=0;}
 tick(r,30);assert(h.downed);assert(b.hunter.reviveProgress>1.4);assert.equal(r.phase,'playing');b.hunter.damage();assert.equal(b.hunter.reviveProgress,0);tick(r,20);assert(h.downed);r.action(b.id,'melee');tick(r,1);assert.equal(b.hunter.reviveProgress,0);assert.equal(b.hunter.remaining,0);
 b.hunter.cooldown=0;tick(r,61);assert(!h.downed);assert.equal(h.health,50);assert.equal(r.host,'h0');assert.equal(r.players.size,6);
});

test('AI can complete all three waves with autonomous decisions and ordinary upgrades',()=>{
 for(const humans of [1,2]){const r=mixed(humans);let peak=0;for(let i=0;i<12000&&r.phase==='playing';i++){r.tick(.05);peak=Math.max(peak,...bots(r).map(p=>p.progression.level));}
  console.log(`autonomous ${humans} human / ${6-humans} AI: ${r.phase}, wave ${r.wave}, ${r.time.toFixed(1)}s, AI level ${peak}`);assert.equal(r.phase,'victory');assert.equal(r.wave,3);assert(peak>=3);assert(bots(r).some(p=>p.progression.attackDamage>25));
  r.restart(r.host);assert.equal(r.players.size,humans);assert.equal(r.pickups.length,0);assert.equal(r.shots.length,0);assert.equal(r.target.health,100);assert(r.npc.downed);
 }
});

const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function wait(fn:()=>boolean){const end=Date.now()+5000;while(!fn()){assert(Date.now()<end,'network timeout');await delay(10);}}
test('real WebSockets: AI toggle authorization, one/two humans, reserved reconnect, expiry and no bot-only room leaks',async()=>{
 let now=100000;const backend=createBackend({now:()=>now});await new Promise<void>(r=>backend.http.listen(0,'127.0.0.1',r));const address=backend.http.address();assert(address&&typeof address!=='string');
 const clients:{ws:WebSocket;id:string;token:string;state?:Snapshot;errors:string[]}[]=[];
 const connect=async()=>{const c={ws:new WebSocket(`ws://127.0.0.1:${address.port}/ws`),id:'',token:'',state:undefined as Snapshot|undefined,errors:[] as string[]};clients.push(c);c.ws.on('message',d=>{const m=JSON.parse(d.toString());if(m.type==='welcome'){c.id=m.id;c.token=m.resumeToken;}if(m.type==='snapshot')c.state=m;if(m.type==='error')c.errors.push(m.message);});await wait(()=>!!c.id);return c;};const send=(c:typeof clients[number],m:unknown)=>c.ws.send(JSON.stringify(m));
 try{const a=await connect();send(a,{type:'create',name:'Host',protocol:PROTOCOL});await wait(()=>!!a.state);const code=a.state!.code;send(a,{type:'allowAI',enabled:'yes'});await wait(()=>a.errors.length===1);assert.match(a.errors[0],/Invalid AI/);send(a,{type:'allowAI',enabled:true});await wait(()=>!!a.state!.allowAI);assert.equal(a.state!.players.length,1);send(a,{type:'ready',ready:true});await wait(()=>a.state!.players.length===6);assert.equal(a.state!.players.filter(p=>p.ai).length,5);assert.equal(a.state!.phase,'lobby');
  const b=await connect();send(b,{type:'join',name:'Guest',protocol:PROTOCOL,code});await wait(()=>b.state?.players.filter(p=>p.ai).length===4);assert.equal(b.state!.players.length,6);send(b,{type:'allowAI',enabled:false});await wait(()=>b.errors.length===1);assert.match(b.errors[0],/host/);send(b,{type:'ready',ready:true});await wait(()=>a.state!.players.every(p=>p.ready));send(a,{type:'start'});await wait(()=>b.state?.phase==='playing');
  const room=backend.rooms.get(code)!;a.ws.close();await wait(()=>b.state!.host===b.id&&!b.state!.players.find(p=>p.id===a.id)!.connected);assert.equal(bots(room).length,4);const resumed=await connect();send(resumed,{type:'resume',id:a.id,token:a.token,code});await wait(()=>resumed.state?.players.every(p=>p.connected)===true);assert.equal(resumed.id,a.id);assert.equal(new Set(resumed.state!.players.map(p=>p.id)).size,6);assert.equal(bots(room).length,4);
  resumed.ws.close();b.ws.close();await wait(()=>![...room.players.values()].some(p=>!p.ai&&p.connected));const time=room.time;await delay(100);assert.equal(room.time,time);assert.equal(room.host,'');now+=60001;await wait(()=>backend.rooms.size===0);const late=await connect();send(late,{type:'resume',id:a.id,token:a.token,code});await wait(()=>late.errors.length>0);assert.match(late.errors[0],/expired/);
 }finally{clients.forEach(c=>c.ws.close());await backend.close();}
});

test('humans revive downed AI with the same cloak/range/hold requirements',()=>{
 const r=mixed();quiet(r);const h=r.players.get('h0')!,b=bots(r)[0];for(const other of bots(r).slice(1))r.remove(other.id);h.x=0;h.z=2;b.x=1;b.z=2;b.health=0;b.downed=true;r.action(h.id,'cloak');
 for(let i=0;i<61&&b.downed;i++){r.input(h.id,{x:0,z:0,ax:0,az:1,revive:true});r.tick(.05);}assert(!b.downed);assert.equal(b.health,50);assert.equal(r.host,h.id);
});
