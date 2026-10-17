import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createBackend} from '../src/main';
import {PROTOCOL,type Snapshot} from '../../shared/multiplayer';
import {Room} from '../src/room';
import {SnapshotBuffer} from '../../client/src/snapshot-buffer';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(fn:()=>boolean){const end=Date.now()+6000;while(!fn()){assert(Date.now()<end,'network wait timed out');await sleep(10);}}
const neutral={x:0,z:0,ax:0,az:1,revive:false};

test('six WebSocket clients observe combat, revival, progression, three waves, victory, defeat and restart',async()=>{
 const backend=createBackend();await new Promise<void>(r=>backend.http.listen(0,'127.0.0.1',r));const address=backend.http.address();assert(address&&typeof address!=='string');
 const clients:{ws:WebSocket;id:string;state?:Snapshot;errors:string[]}[]=[];
 const send=(i:number,m:unknown)=>clients[i].ws.send(JSON.stringify(m));
 try{
  for(let i=0;i<7;i++){const c={ws:new WebSocket(`ws://127.0.0.1:${address.port}/ws`),id:'',state:undefined as Snapshot|undefined,errors:[] as string[]};clients.push(c);c.ws.on('message',data=>{const m=JSON.parse(data.toString());if(m.type==='welcome')c.id=m.id;if(m.type==='snapshot')c.state=m;if(m.type==='error')c.errors.push(m.message);});await until(()=>!!c.id);if(i===0){send(i,{type:'create',name:'P0',protocol:PROTOCOL});await until(()=>!!c.state);}else{send(i,{type:'join',name:'P'+i,code:clients[0].state!.code,protocol:PROTOCOL});await until(()=>i===6?c.errors.some(e=>e.includes('full')):c.state?.players.length===i+1);}}
  for(let i=0;i<6;i++)send(i,{type:'ready',ready:true});await until(()=>clients[0].state!.players.every(p=>p.ready));send(0,{type:'start'});await until(()=>clients.slice(0,6).every(c=>c.state?.phase==='playing'));
  const room=backend.rooms.get(clients[0].state!.code)!;const players=[...room.players.values()];
  // Fixtures place encounters deterministically; all actions still enter through real sockets.
  // Freeze real-time simulation while advancing fixed ticks explicitly, then publish via ready.
  const tick=room.tick.bind(room);room.tick=()=>{};
  const sync=async(check:(s:Snapshot)=>boolean)=>{send(0,{type:'ready',ready:true});await until(()=>clients.slice(0,6).every(c=>!!c.state&&check(c.state)));};
  const advance=(n:number)=>{for(let i=0;i<n;i++)tick(.05);};
  const action=async(i:number,action:string)=>{send(i,{type:'action',action});await until(()=>players[i].actions.length>0);advance(1);};
  const input=async(i:number,input:typeof neutral)=>{send(i,{type:'input',input});await until(()=>JSON.stringify(players[i].input)===JSON.stringify(input));};
  room.enemies.forEach(e=>{e.x=17;e.z=17;});players.forEach((p,i)=>{p.x=-2+i*.5;p.z=2;});
  const start=players[1].x;await input(1,{...neutral,x:1,ax:1,az:0});advance(4);await sync(s=>s.players[1].x>start&&s.players[1].ax===1);await input(1,neutral);
  players[0].health=50;await action(0,'cloak');advance(20);await sync(s=>s.players[0].cloak>0&&s.players[0].health>55);
  players[1].health=0;players[1].downed=true;players[1].x=players[0].x+1;players[1].z=players[0].z;
  await input(0,{...neutral,revive:true});for(let i=0;i<61;i++){room.input(players[0].id,{...neutral,revive:true});advance(1);}await sync(s=>!s.players[1].downed&&s.players[1].health===50);await input(0,neutral);
  players[0].x=0;players[0].z=0;await action(0,'melee');await sync(s=>s.target.health===75&&s.players[0].cloak===0&&s.players.every(p=>p.xp===0));
  // Projectile kills award shared XP, and a pickup heals once.
  players.slice(1).forEach(p=>{p.x=-12;p.z=0;});await input(0,neutral);room.enemies[0].x=0;room.enemies[0].z=2;room.enemies[0].health=25;await action(0,'fire');advance(3);await sync(s=>s.players.every(p=>p.xp===30)&&s.pickups.length===1);
  players[0].x=room.pickups[0].x;players[0].z=room.pickups[0].z;const hp=players[0].health;advance(1);await sync(s=>s.pickups.length===0&&s.players[0].health===Math.min(100,hp+25)&&s.players[0].healed>0);
  for(let wave=1;wave<=3;wave++){
   assert.equal(room.wave,wave);for(const e of room.enemies){e.health=e.health>0?1:0;e.x=0;e.z=2;}players[0].x=0;players[0].z=2;players[0].meleeCooldown=0;
   for(let i=0;i<6;i++)while(players[i].progression.pending){send(i,{type:'upgrade',upgrade:['damage','health','cloak'][i%3]});const before=players[i].progression.pending;await until(()=>players[i].progression.pending<before);}
   await action(0,'melee');await sync(s=>s.wave===wave&&s.enemies.length===0);
   if(wave<3){assert(players.every(p=>p.progression.pending>0));const before=players[1].x;
    while(players[1].progression.pending){const pendingBefore=players[1].progression.pending;send(1,{type:'upgrade',upgrade:'health'});await until(()=>players[1].progression.pending<pendingBefore);}await input(1,{...neutral,x:1});advance(2);assert(players[1].x>before);assert(players[0].progression.pending>0,'teammate upgrade does not pause room');await input(1,neutral);
    for(let i=0;i<6;i++)while(players[i].progression.pending){const before=players[i].progression.pending;send(i,{type:'upgrade',upgrade:['damage','health','cloak'][i%3]});await until(()=>players[i].progression.pending<before);}
    advance(85);await sync(s=>s.wave===wave+1&&s.enemies.length===(wave===1?9:15));
   }
  }
  await sync(s=>s.phase==='victory'&&s.players.every(p=>p.level>=3));assert.equal(players[0].progression.attackDamage>25,true);assert(players[2].hunter.cooldownDuration<15);
  send(0,{type:'restart'});await sync(s=>s.phase==='lobby'&&s.players.every(p=>p.level===1&&p.xp===0&&p.damage===25&&p.maxHealth===100&&p.cooldownDuration===15)&&s.pickups.length===0&&s.shots.length===0);
  for(let i=0;i<6;i++)send(i,{type:'ready',ready:true});await until(()=>clients[0].state!.players.every(p=>p.ready));send(0,{type:'start'});await until(()=>room.phase==='playing');players.forEach(p=>{p.downed=true;p.health=0;});advance(1);await sync(s=>s.phase==='defeat'&&s.players.length===6);send(clients.findIndex(c=>c.id===room.host),{type:'restart'});await sync(s=>s.phase==='lobby'&&s.players.every(p=>!p.downed&&p.health===100));
  assert(clients.slice(0,6).every(c=>c.errors.length===0));
 }finally{clients.forEach(c=>c.ws.close());await backend.close();}
});

test('reservation accepts 60s boundary, rejects expiry, frees capacity and cleans empty rooms',async()=>{
 let clock=100000;const backend=createBackend({now:()=>clock});await new Promise<void>(r=>backend.http.listen(0,'127.0.0.1',r));const address=backend.http.address();assert(address&&typeof address!=='string');
 const clients:{ws:WebSocket;id:string;token:string;state?:Snapshot;errors:string[]}[]=[];
 const connect=async()=>{const c={ws:new WebSocket(`ws://127.0.0.1:${address.port}/ws`),id:'',token:'',state:undefined as Snapshot|undefined,errors:[] as string[]};clients.push(c);c.ws.on('message',d=>{const m=JSON.parse(d.toString());if(m.type==='welcome'){c.id=m.id;c.token=m.resumeToken;}if(m.type==='snapshot')c.state=m;if(m.type==='error')c.errors.push(m.message);});await until(()=>!!c.id);return c;};
 const send=(c:typeof clients[number],m:unknown)=>c.ws.send(JSON.stringify(m));
 try{const a=await connect();send(a,{type:'create',name:'A',protocol:PROTOCOL});await until(()=>!!a.state);const code=a.state!.code,id=a.id,token=a.token,room=backend.rooms.get(code)!;a.ws.close();await until(()=>!room.players.get(id)!.connected);clock+=60000;
  const b=await connect();send(b,{type:'resume',id,token,code});await until(()=>!!b.state);assert.equal(b.id,id);assert(room.players.get(id)!.connected);
  b.ws.close();await until(()=>!room.players.get(id)!.connected);clock+=60001;const c=await connect();send(c,{type:'resume',id,token,code});await until(()=>c.errors.length>0);assert.match(c.errors[0],/expired/);await until(()=>backend.rooms.size===0);
  send(c,{type:'create',name:'Fresh',protocol:PROTOCOL});await until(()=>!!c.state);send(c,{type:'leave'});await until(()=>backend.rooms.size===0);
 }finally{clients.forEach(c=>c.ws.close());await backend.close();}
});

test('host fallback excludes disconnected members and reconnect restores a connected host',()=>{const r=new Room('HOST10');for(const id of ['a','b','c'])r.add(id,id);r.disconnect('c');r.remove('a');assert.equal(r.host,'b');r.disconnect('b');r.reconnect('c');assert.equal(r.host,'c');});

test('movement with 150ms one-way delay, 0–100ms jitter and packet bursts stays bounded and monotonic',()=>{
 const room=new Room('LAG010');room.add('a','A');const buffer=new SnapshotBuffer();const packets:{at:number;state:Snapshot}[]=[];let last=-Infinity,freeze=0,maxFreeze=0,maxStep=0,lastChange=0;
 for(let ms=0;ms<=5000;ms+=10){if(ms%50===0&&ms<=4000){room.time=ms/1000;room.players.get('a')!.x=ms/1000*3;const jitter=[0,80,20,100,40][(ms/50)%5];const at=Math.max(packets.at(-1)?.at??0,ms+150+jitter);packets.push({at,state:structuredClone(room.snapshot())});}
  while(packets.length&&packets[0].at<=ms){const p=packets.shift()!;buffer.push(p.state,ms);}
  if(ms<400||ms>4000)continue;const x=buffer.position('players','a',ms,{x:0,z:0}).x;assert(x>=last,'rendered movement reverses');if(Number.isFinite(last))maxStep=Math.max(maxStep,x-last);assert(x<=ms/1000*3,'extrapolated past server');if(x===last){freeze=ms-lastChange;maxFreeze=Math.max(maxFreeze,freeze);}else lastChange=ms;last=x;
 }
 assert(maxStep<.4,`largest 10ms step ${maxStep}`);assert(maxFreeze<=250,`longest freeze ${maxFreeze}ms`);
 console.log(`latency simulation: largest 10ms position step=${maxStep.toFixed(3)}m, longest hold=${maxFreeze}ms`);
});
