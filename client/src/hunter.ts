export class HunterAbility {
 remaining=0;
 cooldown=0;
 reviveProgress=0;
 reviveHeld=false;
 allyRevived=false;
 activate(alive:boolean){if(!alive||this.cooldown>0||this.remaining>0)return false;this.remaining=6;this.cooldown=15;return true;}
 interruptRevival(){this.reviveProgress=0;this.reviveHeld=false;}
 end(){this.remaining=0;this.interruptRevival();}
 damage(){this.interruptRevival();}
 reset(){this.remaining=0;this.cooldown=0;this.reviveProgress=0;this.reviveHeld=false;this.allyRevived=false;}
 tick(dt:number,health:number,maxHealth:number,inRange:boolean){
  if(health<=0){this.end();return health;}
  this.cooldown=Math.max(0,this.cooldown-dt);
  const activeTime=Math.min(dt,this.remaining);
  if(activeTime>0)health=Math.min(maxHealth,health+5*activeTime);
  this.remaining=Math.max(0,this.remaining-dt);
  if(this.remaining===0||!inRange){this.interruptRevival();}
  else if(this.reviveHeld&&!this.allyRevived){
   this.reviveProgress=Math.min(3,this.reviveProgress+activeTime);
   if(this.reviveProgress>=3-1e-8){this.allyRevived=true;this.interruptRevival();}
  }else this.reviveProgress=0;
  return health;
 }
}
