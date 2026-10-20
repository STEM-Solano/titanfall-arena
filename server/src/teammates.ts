import type {Room,Player} from './room';
import type {Point} from '../../client/src/navigation';
import {arenaObstacles} from '../../shared/multiplayer';
import {segmentHit} from '../../client/src/projectiles';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Decisions produce ordinary inputs/actions; Room applies every gameplay rule. */
export class Teammates{
 private paths=new Map<string,{points:Point[];until:number;goal:Point}>();
 reset(){this.paths.clear();}
 tick(room:Room,_dt:number){
  const members=[...room.players.values()];
  for(const p of members){if(!p.ai||p.downed||!p.connected)continue;
   if(p.progression.pending){const choices=['damage','health','cloak'] as const;room.upgrade(p.id,choices[(p.progression.level-2)%3]);}
   const downed=members.filter(o=>o.connected&&o.downed&&o.id!==p.id).sort((a,b)=>Number(a.ai)-Number(b.ai)||distance(p,a)-distance(p,b))[0];
   // One rescuer per casualty avoids interrupting a completed revive to rescue another.
   const rescuer=downed?members.filter(o=>o.ai&&o.connected&&!o.downed&&(o.hunter.remaining>0||o.hunter.cooldown===0)).sort((a,b)=>distance(a,downed)-distance(b,downed)||a.id.localeCompare(b.id))[0]:undefined;
   const rescue=rescuer?.id===p.id?downed:undefined;
   const enemy=room.enemies.filter(e=>e.health>0).sort((a,b)=>distance(p,a)-distance(p,b))[0];
   const humans=members.filter(o=>!o.ai&&o.connected&&!o.downed);const leader=humans.find(o=>o.id===room.host)??humans[0];
   let goal:Point|undefined,stop=1.3,revive=false;
   if(rescue){goal=rescue;stop=1.3;revive=distance(p,rescue)<=1.8;
    if(distance(p,rescue)<7&&p.hunter.cooldown===0)room.action(p.id,'cloak');
   }else if(p.health<p.progression.maxHealth*.7&&p.hunter.cooldown===0)room.action(p.id,'cloak');
   const healing=p.hunter.remaining>0&&p.health<p.progression.maxHealth*.9;
   const casting=p.actions.includes('cloak');
   if(!rescue&&!healing&&!casting&&enemy&&(!leader||distance(p,leader)<10)){
    goal=enemy;stop=2.3;const d=distance(p,enemy);
    if(d<=3&&p.meleeCooldown===0)room.action(p.id,'melee');
    else if(d>3&&d<22&&p.fireCooldown===0&&this.clearShot(room,p,enemy))room.action(p.id,'fire');
   }else if(!rescue&&leader){goal=leader;stop=3;}
   let x=0,z=0;if(goal&&distance(p,goal)>stop){const next=this.next(room,p,goal);if(next){const dx=next.x-p.x,dz=next.z-p.z,len=Math.hypot(dx,dz);if(len>.01){x=dx/len;z=dz/len;}}}
   const aim=enemy??goal;const ax=aim?aim.x-p.x:p.input.ax,az=aim?aim.z-p.z:p.input.az;
   room.input(p.id,{x,z,ax,az,revive});
  }
 }
 private next(room:Room,p:Player,goal:Point){let path=this.paths.get(p.id);
  if(!path||room.time>=path.until||distance(path.goal,goal)>2||!path.points.length){path={points:room.navigate(p,goal),until:room.time+.4,goal:{x:goal.x,z:goal.z}};this.paths.set(p.id,path);}
  while(path.points.length&&distance(p,path.points[0])<.35)path.points.shift();return path.points[0];
 }
 private clearShot(room:Room,from:Point,to:Point){return !arenaObstacles.some(o=>segmentHit(from.x,from.z,to.x,to.z,o)!==null)&&!(room.target.health>0&&segmentHit(from.x,from.z,to.x,to.z,{...room.target,w:1.1,d:1.1})!==null);}
}
