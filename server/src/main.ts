import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {randomBytes,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {Room} from './room';
import {PROTOCOL,type Input} from '../../shared/multiplayer';
export function createBackend(options:{origins?:string[];maxRooms?:number}={}){
 const allowed=options.origins??['https://stem-solano.github.io','http://localhost:5173','http://127.0.0.1:5173'];
 const rooms=new Map<string,Room>(),roomById=new Map<string,Room>(),sockets=new Map<string,WebSocket>();
 const http=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.url==='/health'){res.writeHead(200);res.end(JSON.stringify({ok:true,version:'0.9.2',protocol:PROTOCOL,rooms:rooms.size}));}else{res.writeHead(404);res.end(JSON.stringify({error:'Not found'}));}});
 const ws=new WebSocketServer({noServer:true,maxPayload:4096});
 http.on('upgrade',(req,socket,head)=>{if(req.url!=='/ws'||(req.headers.origin&&!allowed.includes(req.headers.origin))||sockets.size>=120){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}ws.handleUpgrade(req,socket,head,s=>ws.emit('connection',s,req));});
 const send=(s:WebSocket,value:unknown)=>{if(s.readyState===WebSocket.OPEN&&s.bufferedAmount<256_000)s.send(JSON.stringify(value));};
 const publish=(room:Room)=>{const snapshot=room.snapshot();for(const id of room.players.keys()){const s=sockets.get(id);if(s)send(s,snapshot);}};
 const leave=(id:string)=>{const room=roomById.get(id);if(room){room.remove(id);roomById.delete(id);if(!room.players.size)rooms.delete(room.code);else publish(room);}};
 ws.on('connection',s=>{const id=randomUUID();sockets.set(id,s);send(s,{type:'welcome',id,protocol:PROTOCOL});let count=0,windowStart=Date.now(),alive=true;const heartbeat=setInterval(()=>{if(!alive){s.terminate();return;}alive=false;s.ping();},15000);s.on('pong',()=>alive=true);
  s.on('message',data=>{try{if(Date.now()-windowStart>1000){count=0;windowStart=Date.now();}if(++count>80){s.close(1008,'Too many messages');return;}const m=JSON.parse(data.toString());if(!m||typeof m!=='object'||typeof m.type!=='string')throw Error('Invalid message');let room=roomById.get(id);
   if(m.type==='create'||m.type==='join'){
    if(room)throw Error('Leave your current room first.');if(m.protocol!==PROTOCOL)throw Error('Version mismatch. Refresh the client.');if(typeof m.name!=='string')throw Error('Enter a player name.');const name=m.name.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,24);if(!name)throw Error('Enter a player name.');
    if(m.type==='create'){if(rooms.size>=(options.maxRooms??20))throw Error('Server room capacity reached.');let code='';do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));room=new Room(code);rooms.set(code,room);}else{if(typeof m.code!=='string')throw Error('Enter a room code.');room=rooms.get(m.code.trim().toUpperCase());if(!room)throw Error('Room not found.');}
    room.add(id,name);roomById.set(id,room);publish(room);return;
   }
   if(m.type==='leave'){leave(id);return;}if(!room)throw Error('Join a room first.');
   if(m.type==='ready'){if(typeof m.ready!=='boolean')throw Error('Invalid ready status');room.ready(id,m.ready);}
   else if(m.type==='start')room.start(id);else if(m.type==='restart')room.restart(id);
   else if(m.type==='input'){const i=m.input;if(!i||['x','z','ax','az'].some(k=>typeof i[k]!=='number'||!Number.isFinite(i[k]))||typeof i.revive!=='boolean')throw Error('Invalid input');const clamp=(v:number)=>Math.max(-1,Math.min(1,v));const input:Input={x:clamp(i.x),z:clamp(i.z),ax:clamp(i.ax),az:clamp(i.az),revive:i.revive};if(Math.hypot(input.ax,input.az)<.001){input.ax=0;input.az=-1;}room.input(id,input);}
   else if(m.type==='action'){if(!['melee','fire','cloak'].includes(m.action))throw Error('Invalid action');room.action(id,m.action);}
   else if(m.type==='upgrade'){if(!['damage','health','cloak'].includes(m.upgrade))throw Error('Invalid upgrade');room.upgrade(id,m.upgrade);}
   else throw Error('Unsupported message');
   if(m.type!=='input')publish(room);
  }catch(e){send(s,{type:'error',message:e instanceof Error?e.message:'Invalid request'});}});
  s.on('error',()=>{});s.on('close',()=>{clearInterval(heartbeat);sockets.delete(id);leave(id);});
 });
 const interval=setInterval(()=>{for(const room of rooms.values()){room.tick(.05);publish(room);}},50);
 return {http,rooms,close:async()=>{clearInterval(interval);for(const s of sockets.values())s.close(1001,'Server shutting down');await new Promise<void>(resolve=>ws.close(()=>resolve()));await new Promise<void>(resolve=>http.close(()=>resolve()));}};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const backend=createBackend({origins:(process.env.ALLOWED_ORIGINS??'https://stem-solano.github.io,http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim())});
 const port=Number(process.env.PORT??3001);backend.http.listen(port,'0.0.0.0',()=>console.log(`Co-op backend listening on ${port}`));
 for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>{void backend.close().then(()=>process.exit(0));});
}
