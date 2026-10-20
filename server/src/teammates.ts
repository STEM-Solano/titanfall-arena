import type {Room,Player} from './room';
import type {Point} from '../../client/src/navigation';
import {arenaObstacles,type AIStrength} from '../../shared/multiplayer';
import {segmentHit} from '../../client/src/projectiles';
export const aiTuning:Record<AIStrength,{damage:number;interval:number;engage:number;leash:number}>={support:{damage:.2,interval:1.8,engage:6,leash:4},balanced:{damage:.35,interval:1.25,engage:9,leash:6},strong:{damage:.5,interval:.9,engage:12,leash:8}};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Decisions produce ordinary inputs/actions; Room applies combat and progression rules. */
export class Teammates{
 private paths=new Map<string,{points:Point[];until:number;goal:Point}>();private nextAttack=new Map<string,number>();
 reset(){this.paths.clear();this.nextAttack.clear();}
 tick(room:Room,_dt:number){
  const members=[...room.players.values()],tuning=aiTuning[room.aiStrength];
  for(const p of members){if(!p.ai||p.downed||!p.connected)continue;
   const downed=members.filter(o=>o.connected&&o.downed&&o.id!==p.id).sort((a,b)=>Number(a.ai)-Number(b.ai)||distance(p,a)-distance(p,b))[0];
   const rescuer=downed?members.filter(o=>o.ai&&o.connected&&!o.downed&&(o.hunter.remaining>0||o.hunter.cooldown===0)).sort((a,b)=>distance(a,downed)-distance(b,downed)||a.id.localeCompare(b.id))[0]:undefined;
   const rescue=rescuer?.id===p.id?downed:undefined;
   const humans=members.filter(o=>!o.ai&&o.connected&&!o.downed),leader=humans.find(o=>o.id===room.host)??humans[0];
   const enemy=room.enemies.filter(e=>e.health>0&&(!leader||distance(e,leader)<=tuning.engage)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
   const boss=room.boss&&room.boss.health>0&&room.humanCombatUntil>room.time?room.boss:undefined;
   const target=enemy??boss,escape=room.dangerGoal(p);
   let goal:Point|undefined,stop=1.3,revive=false;
   if(rescue){goal=rescue;revive=distance(p,rescue)<=1.8;if(distance(p,rescue)<7&&p.hunter.cooldown===0)room.action(p.id,'cloak');}
   else if(p.health<p.progression.maxHealth*.7&&p.hunter.cooldown===0)room.action(p.id,'cloak');
   const healing=p.hunter.remaining>0&&p.health<p.progression.maxHealth*.9,casting=p.actions.includes('cloak');
   if(!rescue&&leader){goal=leader;stop=2.8;}
   if(!rescue&&!healing&&!casting&&!escape&&target&&(!leader||distance(p,leader)<=tuning.leash)){
    const d=distance(p,target);if(boss&&leader&&!this.clearShot(room,p,boss)){const positions:Point[]=[];for(let n=0;n<16;n++){const q={x:leader.x+Math.cos(n*Math.PI/8)*2.5,z:leader.z+Math.sin(n*Math.PI/8)*2.5};if(!room.blocked(q.x,q.z)&&!room.dangerGoal(q)&&this.clearShot(room,q,boss))positions.push(q);}goal=positions.sort((a,b)=>distance(p,a)-distance(p,b))[0]??leader;stop=.35;}if(enemy&&leader&&distance(enemy,leader)<=3.5){goal=enemy;stop=2.5;}
    if(room.time>=(this.nextAttack.get(p.id)??0)){
     if(d<=3&&p.meleeCooldown===0){room.action(p.id,'melee');this.nextAttack.set(p.id,room.time+tuning.interval);}
     else if(d>3&&d<22&&p.fireCooldown===0&&this.clearShot(room,p,target)){room.action(p.id,'fire');this.nextAttack.set(p.id,room.time+tuning.interval);}
    }
   }
   if(escape){goal=escape;stop=.3;revive=false;}
   let x=0,z=0;if(goal&&distance(p,goal)>stop){const next=this.next(room,p,goal);if(next){const dx=next.x-p.x,dz=next.z-p.z,len=Math.hypot(dx,dz);if(len>.01){x=dx/len;z=dz/len;}}}
   const aim=target??goal;room.input(p.id,{x,z,ax:aim?aim.x-p.x:p.input.ax,az:aim?aim.z-p.z:p.input.az,revive});
  }
 }
 private next(room:Room,p:Player,goal:Point){let path=this.paths.get(p.id);if(!path||room.time>=path.until||distance(path.goal,goal)>2||!path.points.length){path={points:room.navigate(p,goal),until:room.time+.4,goal:{x:goal.x,z:goal.z}};this.paths.set(p.id,path);}while(path.points.length&&distance(p,path.points[0])<.35)path.points.shift();return path.points[0];}
 private clearShot(room:Room,from:Point,to:Point){return !arenaObstacles.some(o=>segmentHit(from.x,from.z,to.x,to.z,o)!==null)&&!(room.target.health>0&&segmentHit(from.x,from.z,to.x,to.z,{...room.target,w:1.1,d:1.1})!==null);}
}
