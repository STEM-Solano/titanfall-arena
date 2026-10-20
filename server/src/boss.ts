import type {AttackZone,BossView} from '../../shared/multiplayer';
import type {Point} from '../../client/src/navigation';
export function inZone(p:Point,zone:AttackZone,margin=0){const dx=p.x-zone.x,dz=p.z-zone.z;if(zone.kind==='circle')return Math.hypot(dx,dz)<=zone.radius+margin;const along=dx*zone.ax+dz*zone.az,across=Math.abs(dx*zone.az-dz*zone.ax);return along>=-margin&&along<=zone.length+margin&&across<=zone.width/2+margin;}
/** Original stationary sci-fi relay guardian; locked warnings precede every impact. */
export class Boss implements BossView{
 name='Nullforge Sentinel';health:number;maxHealth:number;phase:1|2=1;attack:'lance'|'pulse'|null=null;remaining=0;telegraphDuration=0;blasting=0;zones:AttackZone[]=[];aiDamage=0;hit=0;
 private cooldown=3;private turn=0;
 constructor(public x:number,public z:number,public humans:number,public allies:number){this.maxHealth=600+300*Math.max(0,humans-1)+100*allies;this.health=this.maxHealth;}
 damage(amount:number,ai:boolean){if(this.health<=0)return 0;const actual=Math.max(0,Math.min(amount,ai?Math.min(this.maxHealth*.35-this.aiDamage,this.health-1):this.health));this.health-=actual;if(ai)this.aiDamage+=actual;if(actual>0)this.hit=.2;if(this.health<this.maxHealth*.5)this.phase=2;if(this.health===0){this.attack=null;this.zones=[];this.remaining=0;this.blasting=0;}return actual;}
 tick(dt:number,targets:Point[]):number{
  this.hit=Math.max(0,this.hit-dt);if(this.health<=0)return 0;
  if(this.blasting>0){this.blasting=Math.max(0,this.blasting-dt);if(this.blasting===0){this.zones=[];this.attack=null;}return 0;}
  if(this.remaining>0){this.remaining=Math.max(0,this.remaining-dt);if(this.remaining>1e-8)return 0;this.remaining=0;this.blasting=.35;this.cooldown=this.phase===2?2.2:3;return this.attack==='lance'?24:18;}
  this.cooldown=Math.max(0,this.cooldown-dt);if(this.cooldown>0||!targets.length)return 0;
  const target=targets[this.turn%targets.length];this.attack=this.turn++%2===0?'lance':'pulse';
  this.telegraphDuration=this.phase===2?1.25:this.attack==='lance'?1.6:1.8;this.remaining=this.telegraphDuration;
  if(this.attack==='lance'){const dx=target.x-this.x,dz=target.z-this.z,len=Math.hypot(dx,dz)||1;this.zones=[{kind:'line',x:this.x,z:this.z,ax:dx/len,az:dz/len,length:36,width:2.4}];}
  else{this.zones=[{kind:'circle',x:target.x,z:target.z,radius:3.5}];if(this.phase===2){const second=targets.find(p=>Math.hypot(p.x-target.x,p.z-target.z)>2);this.zones.push({kind:'circle',x:second?.x??Math.max(-15,Math.min(15,target.x+5)),z:second?.z??target.z,radius:3.5});}}
  return 0;
 }
 view():BossView{return {name:this.name,x:this.x,z:this.z,health:this.health,maxHealth:this.maxHealth,phase:this.phase,attack:this.attack,remaining:this.remaining,telegraphDuration:this.telegraphDuration,blasting:this.blasting,zones:this.zones.map(z=>({...z})),aiDamage:this.aiDamage,humans:this.humans,allies:this.allies,hit:this.hit};}
}
